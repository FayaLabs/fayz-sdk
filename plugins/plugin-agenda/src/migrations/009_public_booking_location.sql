-- Public bookings were written with location_id = NULL. The agenda's location
-- filter is optional (default "all"), so they still rendered — but the moment
-- an operator filtered by their unit, every booking taken from the website
-- disappeared from the calendar. Single-location tenants are the common case
-- and have an unambiguous answer, so default to it; multi-location tenants
-- stay NULL (there is no correct guess) until the public flow asks.
--
-- Only the assignment is new; the rest of the body is unchanged from 004.

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_tenant_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(booking_id uuid, starts_at timestamptz, ends_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_service record;
  v_person_id uuid;
  v_assignee uuid;
  v_ends timestamptz;
  v_order uuid;
  v_booking uuid;
  v_phone text;
  v_tz text;
  v_notes text;
  v_location uuid;
BEGIN
  -- validation: anon-callable, everything tight
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;
  v_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_phone) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;
  IF p_email IS NOT NULL AND (length(p_email) > 254 OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  v_notes := left(p_notes, 500);
  IF p_starts_at IS NULL OR p_starts_at <= now() OR p_starts_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'invalid start';
  END IF;

  SELECT s.id, s.name, s.price, COALESCE(s.duration_minutes, 30) AS duration_minutes
    INTO v_service
  FROM services s
  WHERE s.id = p_service_id AND s.tenant_id = p_tenant_id
    AND s.is_active AND s.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown service'; END IF;

  v_ends := p_starts_at + make_interval(mins => v_service.duration_minutes);
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo') INTO v_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN RAISE EXCEPTION 'unknown tenant'; END IF;

  -- pick the assignee whose working hours cover the slot
  SELECT sc.assignee_id INTO v_assignee
  FROM schedules sc
  WHERE sc.tenant_id = p_tenant_id
    AND sc.kind = 'working_hours'
    AND sc.is_active
    AND (
      sc.specific_date = (p_starts_at AT TIME ZONE v_tz)::date
      OR (sc.specific_date IS NULL
          AND sc.day_of_week = EXTRACT(dow FROM p_starts_at AT TIME ZONE v_tz)::smallint)
    )
    AND (p_starts_at AT TIME ZONE v_tz)::time >= sc.starts_at
    AND (v_ends AT TIME ZONE v_tz)::time <= sc.ends_at
  ORDER BY sc.assignee_id
  LIMIT 1;
  IF v_assignee IS NULL THEN RAISE EXCEPTION 'slot outside working hours'; END IF;

  -- NEW: stamp the unit so the calendar's location filter keeps these visible.
  -- Prefer the schedule's own location; else the tenant's only location.
  SELECT sc.location_id INTO v_location
  FROM schedules sc
  WHERE sc.tenant_id = p_tenant_id
    AND sc.kind = 'working_hours'
    AND sc.is_active
    AND sc.assignee_id = v_assignee
    AND sc.location_id IS NOT NULL
  LIMIT 1;

  IF v_location IS NULL THEN
    SELECT l.id INTO v_location
    FROM locations l
    WHERE l.tenant_id = p_tenant_id
    HAVING count(*) = 1;  -- unambiguous only
  END IF;

  -- serialize per (tenant, assignee) to kill the double-book race
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || v_assignee::text, 0));

  IF EXISTS (
    SELECT 1 FROM appointments b
    WHERE b.tenant_id = p_tenant_id
      AND b.assignee_id = v_assignee
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.starts_at < v_ends
      AND COALESCE(b.ends_at, b.starts_at) > p_starts_at
  ) THEN
    RAISE EXCEPTION 'slot no longer available';
  END IF;

  -- anti-spam: cap open future public bookings per phone per tenant
  IF (
    SELECT count(*) FROM appointments b
    JOIN people p ON p.id = b.party_id
    WHERE b.tenant_id = p_tenant_id
      AND p.phone = v_phone
      AND b.starts_at > now()
      AND b.status = 'scheduled'
  ) >= 3 THEN
    RAISE EXCEPTION 'too many open bookings for this phone';
  END IF;

  -- upsert the customer by (tenant, phone) — matches people_tenant_customer_phone
  INSERT INTO people (tenant_id, kind, name, phone, email, metadata)
  VALUES (p_tenant_id, 'customer', trim(p_name), v_phone, p_email,
          jsonb_build_object('source', 'public_booking'))
  ON CONFLICT (tenant_id, phone) WHERE kind = 'customer' AND phone IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, people.email),
    updated_at = now()
  RETURNING id INTO v_person_id;

  -- order + booking + order_item (statuses hardcoded — caller cannot set)
  INSERT INTO orders (tenant_id, kind, status, party_id, assignee_id, location_id,
                      subtotal, total, notes, metadata)
  VALUES (p_tenant_id, 'appointment', 'scheduled', v_person_id, v_assignee, v_location,
          v_service.price, v_service.price, v_notes,
          jsonb_build_object('source', 'public_booking',
                             'serviceNames', v_service.name,
                             'contactName', trim(p_name)))
  RETURNING id INTO v_order;

  INSERT INTO appointments (tenant_id, kind, party_id, assignee_id, order_id, location_id,
                        starts_at, ends_at, status, notes, metadata)
  VALUES (p_tenant_id, 'appointment', v_person_id, v_assignee, v_order, v_location,
          p_starts_at, v_ends, 'scheduled', v_notes,
          jsonb_build_object('source', 'public_booking', 'serviceNames', v_service.name))
  RETURNING id INTO v_booking;

  INSERT INTO order_items (order_id, service_id, name, quantity, unit_price, total,
                           sort_order, duration_minutes, assignee_id)
  VALUES (v_order, v_service.id, v_service.name, 1, v_service.price, v_service.price,
          0, v_service.duration_minutes, v_assignee);

  RETURN QUERY SELECT v_booking, p_starts_at, v_ends;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text) TO anon, authenticated;
