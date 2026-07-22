-- plugin-agenda 011: honour a tenant's default professional.
--
-- create_public_booking picks the assignee from whoever's working hours cover
-- the slot, ordered by assignee_id — i.e. the lowest UUID wins. That is fine
-- when the caller names the professional, and wrong when it does not: the
-- public page confirms "Equipe Great DJs" while the booking silently lands on
-- an unrelated instructor whose UUID happened to sort first.
--
-- Clients shipped before p_assignee_id existed still call this with 7 named
-- args, so the parameter defaults to NULL and every live booking on those sites
-- is mis-assigned today. Republishing the SDK fixes the caller, but the sites
-- already deployed cannot be fixed that way — this can, from the database.
--
-- Precedence: explicit arg > tenant default > first covering schedule.
-- Tenants without the setting keep exactly the previous behaviour.

CREATE OR REPLACE FUNCTION public.create_public_booking(p_tenant_id uuid, p_service_id uuid, p_starts_at timestamp with time zone, p_name text, p_phone text, p_email text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_assignee_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(booking_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service record;
  v_person_id uuid;
  v_assignee uuid;
  v_requested uuid;
  v_ends timestamptz;
  v_order uuid;
  v_booking uuid;
  v_phone text;
  v_tz text;
  v_notes text;
  v_client_kind text;
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

  -- tenant config: timezone + client kind (admin-set; sanitized, never caller input)
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo'),
         COALESCE(NULLIF(trim(t.settings->'booking'->>'client_kind'), ''), 'customer')
    INTO v_tz, v_client_kind
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN RAISE EXCEPTION 'unknown tenant'; END IF;
  IF v_client_kind !~ '^[a-z_]{2,32}$' THEN v_client_kind := 'customer'; END IF;

  -- resolve the professional, in order of trust:
  --   1. the id the caller sent (the one the visitor actually saw)
  --   2. the tenant's configured default (settings->>'defaultAssigneeId')
  --   3. whoever's working hours cover the slot
  --
  -- Step 2 is why this migration exists. Older published clients call this with
  -- 7 named args, leaving p_assignee_id NULL, and step 3 then resolved to
  -- "lowest assignee UUID" — an arbitrary instructor who had nothing to do with
  -- the name the site displayed on the confirmation screen. The default gives
  -- those clients a correct answer without waiting for a redeploy.
  v_requested := COALESCE(
    p_assignee_id,
    (SELECT NULLIF(t.settings ->> 'defaultAssigneeId', '')::uuid
       FROM tenants t WHERE t.id = p_tenant_id)
  );

  SELECT w.assignee_id INTO v_assignee
  FROM agenda_working_windows(
         p_tenant_id, (p_starts_at AT TIME ZONE v_tz)::date, v_requested) w
  WHERE (p_starts_at AT TIME ZONE v_tz)::time >= w.win_start
    AND (v_ends AT TIME ZONE v_tz)::time <= w.win_end
  ORDER BY w.assignee_id
  LIMIT 1;
  IF v_assignee IS NULL THEN RAISE EXCEPTION 'slot outside working hours'; END IF;

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

  -- upsert the client by (tenant, kind, phone), serialized by advisory lock
  -- (kind is tenant-configured, so the customer-only partial index can't
  -- arbitrate)
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || v_phone, 1));

  SELECT p.id INTO v_person_id
  FROM people p
  WHERE p.tenant_id = p_tenant_id AND p.kind = v_client_kind AND p.phone = v_phone
  ORDER BY p.created_at
  LIMIT 1;

  IF v_person_id IS NOT NULL THEN
    UPDATE people SET
      name = trim(p_name),
      email = COALESCE(p_email, people.email),
      updated_at = now()
    WHERE id = v_person_id;
  ELSE
    INSERT INTO people (tenant_id, kind, name, phone, email, metadata)
    VALUES (p_tenant_id, v_client_kind, trim(p_name), v_phone, p_email,
            jsonb_build_object('source', 'public_booking'))
    RETURNING id INTO v_person_id;
  END IF;

  -- order + booking + order_item (statuses hardcoded — caller cannot set)
  INSERT INTO orders (tenant_id, kind, status, party_id, assignee_id, subtotal, total, notes, metadata)
  VALUES (p_tenant_id, 'appointment', 'scheduled', v_person_id, v_assignee,
          v_service.price, v_service.price, v_notes,
          jsonb_build_object('source', 'public_booking',
                             'serviceNames', v_service.name,
                             'contactName', trim(p_name)))
  RETURNING id INTO v_order;

  INSERT INTO appointments (tenant_id, kind, party_id, assignee_id, order_id,
                        starts_at, ends_at, status, notes, metadata)
  VALUES (p_tenant_id, 'appointment', v_person_id, v_assignee, v_order,
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
