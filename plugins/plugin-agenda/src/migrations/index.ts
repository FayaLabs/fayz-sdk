// AUTO-GENERATED from 001_public_booking.sql — regenerate with scripts/embed-migrations.mjs
// (kept in sync so the manifest can declare migrations as data, plugin-tasks pattern)

export const MIGRATION_001_PUBLIC_BOOKING = `-- ============================================================================
-- plugin-agenda 001: booking read model + public (anon) booking surface
--
-- Ships the objects the agenda providers reference but the spine (packages/db
-- migrations 001–008) does not define:
--   §1  order_items columns the admin provider writes (duration/assignee)
--   §2  public.v_bookings        — admin read model (authenticated, RLS applies)
--   §3  public.v_public_services — anon-readable service catalog
--   §4  public.get_available_slots      — anon RPC (mirrors the mock algorithm)
--   §5  public.create_public_booking    — anon RPC (validated, race-safe write)
--
-- Anon-access design: public booking pages run with the publishable key and no
-- session, so the canonical tenant RLS yields nothing. Anon access is granted
-- ONLY via the column-whitelisted view (§3) and SECURITY DEFINER RPCs (§4, §5)
-- with tight input validation and hardcoded statuses.
-- ============================================================================

-- §1 — columns the agenda provider writes but 004_archetypes lacks
ALTER TABLE saas_core.order_items
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES saas_core.persons(id) ON DELETE SET NULL;

-- Upsert key for public customers (per tenant, by normalized phone)
CREATE UNIQUE INDEX IF NOT EXISTS persons_tenant_customer_phone
  ON saas_core.persons(tenant_id, phone)
  WHERE kind = 'customer' AND phone IS NOT NULL;

-- Slot-conflict scan
CREATE INDEX IF NOT EXISTS bookings_assignee_time
  ON saas_core.bookings(assignee_id, starts_at, ends_at)
  WHERE status NOT IN ('cancelled', 'no_show');

-- §2 — admin read model (security_invoker → underlying RLS applies; anon sees 0 rows)
CREATE OR REPLACE VIEW public.v_bookings
WITH (security_invoker = true) AS
SELECT
  b.id, b.tenant_id, b.kind, b.starts_at, b.ends_at, b.status, b.notes,
  b.order_id, b.location_id, b.metadata, b.created_at, b.updated_at,
  b.party_id                              AS client_id,
  COALESCE(pc.name, b.metadata->>'title') AS client_name,
  pc.phone                                AS client_phone,
  pc.email                                AS client_email,
  pc.avatar_url                           AS client_avatar_url,
  b.assignee_id                           AS professional_id,
  ps.name                                 AS professional_name,
  ps.avatar_url                           AS professional_avatar_url,
  l.name                                  AS location_name,
  o.total                                 AS order_total,
  o.status                                AS order_status,
  (EXTRACT(EPOCH FROM (COALESCE(b.ends_at, b.starts_at) - b.starts_at))::int / 60)
                                          AS total_duration_minutes
FROM saas_core.bookings b
LEFT JOIN saas_core.persons   pc ON pc.id = b.party_id
LEFT JOIN saas_core.persons   ps ON ps.id = b.assignee_id
LEFT JOIN saas_core.locations l  ON l.id  = b.location_id
LEFT JOIN saas_core.orders    o  ON o.id  = b.order_id;

GRANT SELECT ON public.v_bookings TO authenticated, service_role;
REVOKE SELECT ON public.v_bookings FROM anon;

-- §3 — anon-readable public catalog (owner-rights view = deliberate, whitelisted)
CREATE OR REPLACE VIEW public.v_public_services AS
SELECT
  s.id, s.tenant_id, s.name, s.description, s.price, s.currency,
  COALESCE(s.duration_minutes, 30)                AS duration_minutes,
  s.image_url,
  COALESCE((s.metadata->>'sort_order')::int, 0)   AS sort_order
FROM saas_core.services s
WHERE s.is_active AND s.status = 'active';

GRANT SELECT ON public.v_public_services TO anon, authenticated, service_role;

-- §4 — availability RPC (mirrors plugin-agenda/src/data/mock.ts getAvailableSlots)
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_tenant_id uuid,
  p_date date,
  p_duration_minutes integer,
  p_assignee_id uuid DEFAULT NULL,
  p_slot_interval integer DEFAULT 30
) RETURNS TABLE (slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = saas_core, public
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
    SELECT sc.assignee_id, sc.starts_at AS win_start, sc.ends_at AS win_end
    FROM schedules sc
    WHERE sc.tenant_id = p_tenant_id
      AND sc.kind = 'working_hours'
      AND sc.is_active
      AND (p_assignee_id IS NULL OR sc.assignee_id = p_assignee_id)
      AND (
        sc.specific_date = p_date
        OR (sc.specific_date IS NULL AND sc.day_of_week = EXTRACT(dow FROM p_date)::smallint)
      )
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
    SELECT 1 FROM bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.assignee_id = c.assignee_id
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

-- §5 — public booking write RPC (validated, race-safe, hardcoded statuses)
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_tenant_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS TABLE (booking_id uuid, starts_at timestamptz, ends_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = saas_core, public
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
BEGIN
  -- validation: anon-callable, everything tight
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;
  v_phone := regexp_replace(COALESCE(p_phone, ''), '\\D', '', 'g');
  IF length(v_phone) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;
  IF p_email IS NOT NULL AND (length(p_email) > 254 OR p_email !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$') THEN
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

  -- serialize per (tenant, assignee) to kill the double-book race
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || v_assignee::text, 0));

  IF EXISTS (
    SELECT 1 FROM bookings b
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
    SELECT count(*) FROM bookings b
    JOIN persons p ON p.id = b.party_id
    WHERE b.tenant_id = p_tenant_id
      AND p.phone = v_phone
      AND b.starts_at > now()
      AND b.status = 'scheduled'
  ) >= 3 THEN
    RAISE EXCEPTION 'too many open bookings for this phone';
  END IF;

  -- upsert the customer by (tenant, phone) — matches persons_tenant_customer_phone
  INSERT INTO persons (tenant_id, kind, name, phone, email, metadata)
  VALUES (p_tenant_id, 'customer', trim(p_name), v_phone, p_email,
          jsonb_build_object('source', 'public_booking'))
  ON CONFLICT (tenant_id, phone) WHERE kind = 'customer' AND phone IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, persons.email),
    updated_at = now()
  RETURNING id INTO v_person_id;

  -- order + booking + order_item (statuses hardcoded — caller cannot set)
  INSERT INTO orders (tenant_id, kind, status, party_id, assignee_id, subtotal, total, notes, metadata)
  VALUES (p_tenant_id, 'appointment', 'scheduled', v_person_id, v_assignee,
          v_service.price, v_service.price, v_notes,
          jsonb_build_object('source', 'public_booking',
                             'serviceNames', v_service.name,
                             'contactName', trim(p_name)))
  RETURNING id INTO v_order;

  INSERT INTO bookings (tenant_id, kind, party_id, assignee_id, order_id,
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

REVOKE ALL ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text)
  TO anon, authenticated, service_role;
`
