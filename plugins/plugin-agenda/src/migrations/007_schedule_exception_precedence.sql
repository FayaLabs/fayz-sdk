-- ============================================================================
-- plugin-agenda 007: specific-date exceptions take PRECEDENCE over weekly hours.
--
-- The admin ScheduleEditor (saveException) writes two kinds of specific-date
-- rows: 'available' = active rows with custom windows for the date; day off
-- ('unavailable') = ONE inactive 00:00–00:00 sentinel. Until now every reader
-- treated schedules as a flat union filtered by is_active, so:
--   • a day off was INVISIBLE (inactive sentinel filtered out, weekly rows
--     still matched) — the public site kept selling a day the admin closed;
--   • an 'available' exception ADDED to the weekly hours instead of replacing
--     them ("horário especial" should define the date's hours).
--
-- Fix: one helper — agenda_working_windows(tenant, date, assignee) — is now the
-- single source of a day's windows: if ANY specific-date row exists for an
-- assignee (active or sentinel), only the ACTIVE specific-date rows count for
-- that assignee; otherwise the weekly (day_of_week) rows apply. Both readers
-- are redefined on top of it:
--   • get_available_slots — body otherwise identical to the latest version
--     (google-calendar/002_smart_sync §5, tenant-wide 'block' clause KEPT);
--   • create_public_booking — body otherwise identical to 004.
--
-- ORDERING: on pools with the Google Calendar connector this file must run
-- AFTER integrations/google-calendar/migrations/002_smart_sync.sql (both
-- redefine get_available_slots; 007 is the superset and must win). Re-running
-- 007 last is always safe — it preserves 002's block semantics.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1  agenda_working_windows — the day's working windows, exception-aware.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agenda_working_windows(
  p_tenant_id uuid,
  p_date date,
  p_assignee_id uuid DEFAULT NULL
) RETURNS TABLE (assignee_id uuid, win_start time, win_end time)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH exc AS (
    -- Every specific-date row for the date, ACTIVE OR NOT: the inactive day-off
    -- sentinel must still suppress the weekly rows below.
    SELECT sc.assignee_id, sc.starts_at, sc.ends_at, sc.is_active
    FROM schedules sc
    WHERE sc.tenant_id = p_tenant_id
      AND sc.kind = 'working_hours'
      AND sc.specific_date = p_date
      AND (p_assignee_id IS NULL OR sc.assignee_id = p_assignee_id)
  )
  SELECT e.assignee_id, e.starts_at, e.ends_at
  FROM exc e
  WHERE e.is_active
  UNION ALL
  SELECT sc.assignee_id, sc.starts_at, sc.ends_at
  FROM schedules sc
  WHERE sc.tenant_id = p_tenant_id
    AND sc.kind = 'working_hours'
    AND sc.is_active
    AND sc.specific_date IS NULL
    AND sc.day_of_week = EXTRACT(dow FROM p_date)::smallint
    AND (p_assignee_id IS NULL OR sc.assignee_id = p_assignee_id)
    AND NOT EXISTS (SELECT 1 FROM exc e WHERE e.assignee_id = sc.assignee_id)
$$;

REVOKE ALL ON FUNCTION public.agenda_working_windows(uuid, date, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.agenda_working_windows(uuid, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.agenda_working_windows(uuid, date, uuid)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- §2  get_available_slots — day_schedules now comes from the helper.
--     Everything else is byte-identical to google-calendar/002_smart_sync §5.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_tenant_id uuid,
  p_date date,
  p_duration_minutes integer,
  p_assignee_id uuid DEFAULT NULL,
  p_slot_interval integer DEFAULT 30
) RETURNS TABLE (slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
BEGIN
  -- tight validation: this function is anon-callable
  IF p_duration_minutes IS NULL OR p_duration_minutes NOT BETWEEN 5 AND 480 THEN
    RAISE EXCEPTION 'invalid duration';
  END IF;
  IF p_slot_interval IS NULL OR p_slot_interval NOT BETWEEN 5 AND 240 THEN
    RAISE EXCEPTION 'invalid interval';
  END IF;
  IF p_date IS NULL OR p_date < current_date OR p_date > current_date + 90 THEN
    RETURN;
  END IF;

  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo') INTO v_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN RETURN; END IF;  -- unknown tenant → empty, not an error

  RETURN QUERY
  WITH day_schedules AS (
    SELECT w.assignee_id, w.win_start, w.win_end
    FROM agenda_working_windows(p_tenant_id, p_date, p_assignee_id) w
  ),
  candidate AS (
    SELECT
      ds.assignee_id,
      gs                                              AS s_start,
      gs + make_interval(mins => p_duration_minutes)  AS s_end
    FROM day_schedules ds
    CROSS JOIN LATERAL generate_series(
      (p_date + ds.win_start) AT TIME ZONE v_tz,
      ((p_date + ds.win_end) AT TIME ZONE v_tz) - make_interval(mins => p_duration_minutes),
      make_interval(mins => p_slot_interval)
    ) AS gs
  )
  SELECT DISTINCT c.s_start, c.s_end
  FROM candidate c
  WHERE NOT EXISTS (
    SELECT 1 FROM appointments b
    WHERE b.tenant_id = p_tenant_id
      -- SMART SYNC (gcal 002): this professional's own bookings OR any
      -- tenant-wide BLOCK (assignee_id IS NULL AND kind='block') busy the slot.
      AND (b.assignee_id = c.assignee_id
           OR (b.assignee_id IS NULL AND b.kind = 'block'))
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.starts_at < c.s_end
      AND COALESCE(b.ends_at, b.starts_at) > c.s_start
  )
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_slots(uuid, date, integer, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, integer, uuid, integer)
  TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- §3  create_public_booking — professional resolution goes through the helper
--     (a booking on a closed date now fails 'slot outside working hours').
--     Everything else is byte-identical to 004.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_tenant_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_assignee_id uuid DEFAULT NULL
) RETURNS TABLE (booking_id uuid, starts_at timestamptz, ends_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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

  -- resolve the professional: the one the visitor saw (validated), else the
  -- first whose EXCEPTION-AWARE working hours cover the slot (007)
  SELECT w.assignee_id INTO v_assignee
  FROM agenda_working_windows(
         p_tenant_id, (p_starts_at AT TIME ZONE v_tz)::date, p_assignee_id) w
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
$$;

REVOKE ALL ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text, uuid)
  TO anon, authenticated, service_role;
