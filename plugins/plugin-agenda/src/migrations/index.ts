// AUTO-GENERATED from 000b_v_bookings_rename.sql, 000c_dedupe_customer_phones.sql, 001_public_booking.sql, 002_v_bookings_compat.sql, 003_public_client_kind.sql, 004_public_booking_assignee.sql, 005_agent_rpcs.sql, 006_agent_rpc_localtime.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000B_V_BOOKINGS_RENAME = `-- Salon-only unblock: the pre-pools beauty deployment built rep_* report
-- views on top of its (wider) v_bookings view, so 001's cleanup DROP cannot
-- run there. Renaming keeps the dependents attached (they track the OID) and
-- frees the name for 001; 002_v_bookings_compat re-creates v_bookings as a
-- thin alias for live pre-M5 clients. No-op on fresh pools and on pools whose
-- v_bookings has no dependents (001's DROP handles those).

DO $rename$
BEGIN
  IF to_regclass('public.v_bookings') IS NOT NULL
     AND to_regclass('public.v_bookings_legacy_beauty') IS NULL
     AND EXISTS (
       SELECT 1 FROM pg_depend d
       JOIN pg_rewrite rw ON rw.oid = d.objid
       JOIN pg_class dep ON dep.oid = rw.ev_class
       JOIN pg_class ref ON ref.oid = d.refobjid
       WHERE ref.relname = 'v_bookings' AND dep.relname <> 'v_bookings'
     ) THEN
    EXECUTE 'ALTER VIEW public.v_bookings RENAME TO v_bookings_legacy_beauty';
  END IF;
END $rename$;
`

export const MIGRATION_000C_DEDUPE_CUSTOMER_PHONES = `-- 001 needs the customer-phone upsert key UNIQUE(tenant_id, phone). Converted
-- pools can carry duplicates (found live on salon: 9 dogfood test records all
-- sharing the founder's phone). Non-destructive dedupe: per (tenant_id, phone)
-- customer group keep the row with most appointments (tie: oldest), NULL the
-- phone on the rest and stash the original in metadata->'dedupedPhone'.
-- Idempotent: reruns find no groups > 1.

DO $dedupe$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.people') IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT p.id, p.phone
    FROM public.people p
    JOIN LATERAL (
      SELECT count(*) AS appts
      FROM public.appointments a WHERE a.party_id = p.id
    ) ac ON true
    WHERE p.kind = 'customer' AND p.phone IS NOT NULL
      AND p.id NOT IN (
        SELECT DISTINCT ON (p2.tenant_id, p2.phone) p2.id
        FROM public.people p2
        WHERE p2.kind = 'customer' AND p2.phone IS NOT NULL
        ORDER BY p2.tenant_id, p2.phone,
          (SELECT count(*) FROM public.appointments a2 WHERE a2.party_id = p2.id) DESC,
          p2.created_at ASC
      )
      AND (p.tenant_id, p.phone) IN (
        SELECT tenant_id, phone FROM public.people
        WHERE kind = 'customer' AND phone IS NOT NULL
        GROUP BY tenant_id, phone HAVING count(*) > 1
      )
  LOOP
    UPDATE public.people
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('dedupedPhone', r.phone),
        phone = NULL
    WHERE id = r.id;
  END LOOP;
END $dedupe$;
`

export const MIGRATION_001_PUBLIC_BOOKING = `-- ============================================================================
-- plugin-agenda 001: booking read model + public (anon) booking surface
--
-- Ships the objects the agenda providers reference but the spine (packages/db
-- migrations 001–010) does not define:
--   §0  converted-pool cleanup — drop the pre-rename v_bookings view / indexes
--   §1  order_items columns the admin provider writes (duration/assignee)
--   §2  public.v_appointments    — admin read model (authenticated, RLS applies)
--   §3  public.v_public_services — anon-readable service catalog
--   §4  public.get_available_slots      — anon RPC (mirrors the mock algorithm)
--   §5  public.create_public_booking    — anon RPC (validated, race-safe write)
--
-- Core v1 lives directly in PUBLIC (no separate core schema): people (was
-- persons), appointments (was bookings). This migration is written against public
-- names and is idempotent + safe on both fresh and converted pools.
--
-- Anon-access design: public booking pages run with the publishable key and no
-- session, so the canonical tenant RLS yields nothing. Anon access is granted
-- ONLY via the column-whitelisted view (§3) and SECURITY DEFINER RPCs (§4, §5)
-- with tight input validation and hardcoded statuses.
-- ============================================================================

-- §0 — converted-pool cleanup. The pre-industry-pool shape shipped a v_bookings
-- view and persons_/bookings_-named indexes; drop them so this file re-emits the
-- canonical v_appointments view + people_/appointments_ indexes without leaving
-- duplicates. All guarded with IF EXISTS → no-ops on a fresh pool.
DROP VIEW IF EXISTS public.v_bookings;
DROP INDEX IF EXISTS public.persons_tenant_customer_phone;
DROP INDEX IF EXISTS public.bookings_assignee_time;

-- §1 — columns the agenda provider writes but 004_archetypes lacks
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

-- Upsert key for public customers (per tenant, by normalized phone)
CREATE UNIQUE INDEX IF NOT EXISTS people_tenant_customer_phone
  ON public.people(tenant_id, phone)
  WHERE kind = 'customer' AND phone IS NOT NULL;

-- Slot-conflict scan
CREATE INDEX IF NOT EXISTS appointments_assignee_time
  ON public.appointments(assignee_id, starts_at, ends_at)
  WHERE status NOT IN ('cancelled', 'no_show');

-- §2 — admin read model (security_invoker → underlying RLS applies; anon sees 0 rows)
CREATE OR REPLACE VIEW public.v_appointments
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
FROM public.appointments b
LEFT JOIN public.people    pc ON pc.id = b.party_id
LEFT JOIN public.people    ps ON ps.id = b.assignee_id
LEFT JOIN public.locations l  ON l.id  = b.location_id
LEFT JOIN public.orders    o  ON o.id  = b.order_id;

GRANT SELECT ON public.v_appointments TO authenticated, service_role;
REVOKE SELECT ON public.v_appointments FROM anon;

-- §3 — anon-readable public catalog (owner-rights view = deliberate, whitelisted)
CREATE OR REPLACE VIEW public.v_public_services AS
SELECT
  s.id, s.tenant_id, s.name, s.description, s.price, s.currency,
  COALESCE(s.duration_minutes, 30)                AS duration_minutes,
  s.image_url,
  COALESCE((s.metadata->>'sort_order')::int, 0)   AS sort_order
FROM public.services s
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
    SELECT 1 FROM appointments b
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

REVOKE ALL ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text)
  TO anon, authenticated, service_role;
`

export const MIGRATION_002_V_BOOKINGS_COMPAT = `-- Where 000b preserved the legacy beauty view, re-create v_bookings as a
-- thin alias over it so live pre-M5 clients that SELECT v_bookings by name
-- keep their full legacy column set. Dropped for good once the beauty app
-- ships on v_appointments (M5 follow-up).

DO $compat$
BEGIN
  IF to_regclass('public.v_bookings_legacy_beauty') IS NOT NULL
     AND to_regclass('public.v_bookings') IS NULL THEN
    EXECUTE 'CREATE VIEW public.v_bookings WITH (security_invoker = true) AS SELECT * FROM public.v_bookings_legacy_beauty';
    EXECUTE 'GRANT SELECT ON public.v_bookings TO authenticated, service_role';
    EXECUTE 'REVOKE SELECT ON public.v_bookings FROM anon';
  END IF;
END $compat$;
`

export const MIGRATION_003_PUBLIC_CLIENT_KIND = `-- ---------------------------------------------------------------------------
-- Public booking — tenant-configurable client kind
-- ---------------------------------------------------------------------------
-- 001 hardcoded kind='customer' for people created by create_public_booking.
-- Verticals whose client archetype uses another kind (school → 'student',
-- clinic → whatever the app registers) ended up with people invisible to the
-- app's own pages/lookups and with entity links resolving to unregistered
-- routes (#/customers/:id → not found).
--
-- The client kind now comes from TENANT SETTINGS (admin-controlled — never
-- from the anon caller):   tenants.settings.booking.client_kind
-- Default remains 'customer', so existing pools/tenants are unaffected until
-- they opt in:
--   UPDATE tenants SET settings = jsonb_set(COALESCE(settings,'{}'::jsonb),
--     '{booking,client_kind}', '"student"') WHERE id = '<tenant>';
--
-- The upsert no longer relies on the kind-specific partial unique index
-- (people_tenant_customer_phone) — a per-(tenant, phone) advisory lock
-- serializes concurrent first-bookings for any kind. The 001 index stays in
-- place (harmless, still guards direct customer writes).
--
-- Idempotent: CREATE OR REPLACE, same signature as 001.
-- ---------------------------------------------------------------------------
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

  -- tenant config: timezone + client kind (admin-set; sanitized, never caller input)
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo'),
         COALESCE(NULLIF(trim(t.settings->'booking'->>'client_kind'), ''), 'customer')
    INTO v_tz, v_client_kind
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN RAISE EXCEPTION 'unknown tenant'; END IF;
  IF v_client_kind !~ '^[a-z_]{2,32}$' THEN v_client_kind := 'customer'; END IF;

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

  -- upsert the client by (tenant, kind, phone). Kind is tenant-configured, so
  -- the 001 customer-only partial index can't arbitrate — a per-(tenant,
  -- phone) advisory lock serializes concurrent first-bookings instead.
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

REVOKE ALL ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text)
  TO anon, authenticated, service_role;
`

export const MIGRATION_004_PUBLIC_BOOKING_ASSIGNEE = `-- ---------------------------------------------------------------------------
-- Public booking — respect the professional the visitor saw
-- ---------------------------------------------------------------------------
-- Until now create_public_booking IGNORED which professional the site showed
-- availability for and re-picked by working hours (ORDER BY assignee_id
-- LIMIT 1). With several professionals covering the same slot the booking
-- landed on someone else than displayed ("Equipe Great DJs" on the site,
-- "Rafa Groove" in the agenda). New optional p_assignee_id:
--   * provided → validate THAT professional's working hours cover the slot and
--     book them — never silently reassign (mismatch becomes an explicit error);
--   * NULL → auto-pick as before (sites that don't pin a professional).
-- Conflict check + advisory lock already run against the resolved assignee, so
-- the double-book guard follows whichever path resolves.
--
-- Signature change (8th arg): the old 7-arg function is DROPPED first —
-- CREATE OR REPLACE with a different signature would create an ambiguous
-- PostgREST overload instead of replacing.
-- Includes 003's tenant-configurable client kind. Idempotent.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text);

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

  -- tenant config: timezone + client kind (admin-set; sanitized, never caller input)
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo'),
         COALESCE(NULLIF(trim(t.settings->'booking'->>'client_kind'), ''), 'customer')
    INTO v_tz, v_client_kind
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN RAISE EXCEPTION 'unknown tenant'; END IF;
  IF v_client_kind !~ '^[a-z_]{2,32}$' THEN v_client_kind := 'customer'; END IF;

  -- resolve the professional: the one the visitor saw (validated), else the
  -- first whose working hours cover the slot
  SELECT sc.assignee_id INTO v_assignee
  FROM schedules sc
  WHERE sc.tenant_id = p_tenant_id
    AND sc.kind = 'working_hours'
    AND sc.is_active
    AND (p_assignee_id IS NULL OR sc.assignee_id = p_assignee_id)
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
`

export const MIGRATION_005_AGENT_RPCS = `-- ============================================================================
-- plugin-agenda 005: server-plane agent write RPC.
--
-- public.agent_agenda_create_appointment — the INTERNAL (operator-actor)
-- counterpart of create_public_booking (001 §5): same invariants (working
-- hours, advisory-lock race safety, hardcoded statuses), but:
--   * actor-authorized: public.agent_guard (spine 015) runs role→plan→limit
--     BEFORE anything — denial comes back as a structured jsonb the agent can
--     explain conversationally, never a raised exception;
--   * the client is an EXISTING person id (the agent resolves names→ids via
--     reads first — ambiguity is a conversation problem, not a SQL one);
--   * a requested professional is honored (working hours permitting);
--   * audited: audit_logs row with the acting user.
--
-- Contract (all agent_* RPCs): (p_tenant_id, p_actor_user_id, p_payload jsonb)
-- → jsonb {ok:true, id, record:{...}} | {ok:false, denial:{...}} | {ok:false,
-- error text}. GRANT authenticated+service_role — NEVER anon (the Fayz broker
-- calls with the pool service key and injects tenant/actor server-side).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_agenda_create_appointment(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_denial jsonb;
  v_used int;
  v_client_id uuid;
  v_service_id uuid;
  v_professional uuid;
  v_starts timestamptz;
  v_notes text;
  v_service record;
  v_client record;
  v_ends timestamptz;
  v_tz text;
  v_order uuid;
  v_booking uuid;
BEGIN
  -- ── payload ──────────────────────────────────────────────────────────────
  BEGIN
    v_client_id    := (p_payload->>'client_id')::uuid;
    v_service_id   := (p_payload->>'service_id')::uuid;
    v_professional := (p_payload->>'professional_id')::uuid;
    v_starts       := (p_payload->>'starts_at')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid payload: ' || SQLERRM);
  END;
  v_notes := left(p_payload->>'notes', 500);
  IF v_client_id IS NULL OR v_service_id IS NULL OR v_starts IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'client_id, service_id and starts_at are required');
  END IF;
  IF v_starts <= now() OR v_starts > now() + interval '365 days' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'starts_at must be in the future (max 1 year)');
  END IF;

  -- ── authorization: role → plan → bookings_month cap ──────────────────────
  SELECT count(*) INTO v_used FROM appointments b
  WHERE b.tenant_id = p_tenant_id
    AND b.created_at >= date_trunc('month', now());
  v_denial := agent_guard(p_tenant_id, p_actor_user_id,
                          'appointments', 'create', 'bookings_month', v_used, 1);
  IF v_denial IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'denial', v_denial);
  END IF;

  -- ── invariants ───────────────────────────────────────────────────────────
  SELECT p.id, p.name INTO v_client
  FROM people p
  WHERE p.id = v_client_id AND p.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown client for this tenant');
  END IF;

  SELECT s.id, s.name, s.price, COALESCE(s.duration_minutes, 30) AS duration_minutes
    INTO v_service
  FROM services s
  WHERE s.id = v_service_id AND s.tenant_id = p_tenant_id
    AND s.is_active AND s.status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown or inactive service');
  END IF;

  v_ends := v_starts + make_interval(mins => v_service.duration_minutes);
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo') INTO v_tz
  FROM tenants t WHERE t.id = p_tenant_id;

  -- requested professional honored; otherwise pick one whose hours cover the slot
  SELECT sc.assignee_id INTO v_professional
  FROM schedules sc
  WHERE sc.tenant_id = p_tenant_id
    AND sc.kind = 'working_hours'
    AND sc.is_active
    AND (v_professional IS NULL OR sc.assignee_id = v_professional)
    AND (
      sc.specific_date = (v_starts AT TIME ZONE v_tz)::date
      OR (sc.specific_date IS NULL
          AND sc.day_of_week = EXTRACT(dow FROM v_starts AT TIME ZONE v_tz)::smallint)
    )
    AND (v_starts AT TIME ZONE v_tz)::time >= sc.starts_at
    AND (v_ends AT TIME ZONE v_tz)::time <= sc.ends_at
  ORDER BY sc.assignee_id
  LIMIT 1;
  IF v_professional IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot outside working hours for the requested professional');
  END IF;

  -- race safety: serialize per (tenant, professional), then conflict-check
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || v_professional::text, 0));
  IF EXISTS (
    SELECT 1 FROM appointments b
    WHERE b.tenant_id = p_tenant_id
      AND b.assignee_id = v_professional
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.starts_at < v_ends
      AND COALESCE(b.ends_at, b.starts_at) > v_starts
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot no longer available');
  END IF;

  -- ── write (statuses hardcoded) + audit ───────────────────────────────────
  INSERT INTO orders (tenant_id, kind, status, party_id, assignee_id, subtotal, total, notes, metadata)
  VALUES (p_tenant_id, 'appointment', 'scheduled', v_client_id, v_professional,
          v_service.price, v_service.price, v_notes,
          jsonb_build_object('source', 'agent', 'serviceNames', v_service.name))
  RETURNING id INTO v_order;

  INSERT INTO appointments (tenant_id, kind, party_id, assignee_id, order_id,
                            starts_at, ends_at, status, notes, metadata)
  VALUES (p_tenant_id, 'appointment', v_client_id, v_professional, v_order,
          v_starts, v_ends, 'scheduled', v_notes,
          jsonb_build_object('source', 'agent', 'serviceNames', v_service.name))
  RETURNING id INTO v_booking;

  INSERT INTO order_items (order_id, service_id, name, quantity, unit_price, total,
                           sort_order, duration_minutes, assignee_id)
  VALUES (v_order, v_service.id, v_service.name, 1, v_service.price, v_service.price,
          0, v_service.duration_minutes, v_professional);

  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_user_id, 'agent.createAppointment', 'appointment', v_booking::text,
          jsonb_build_object('payload', p_payload, 'order_id', v_order));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_booking,
    'record', jsonb_build_object(
      'ref', jsonb_build_object('id', v_booking, 'resource', 'appointments',
                                'archetype', 'schedule:appointment'),
      'starts_at', v_starts,
      'ends_at', v_ends,
      'client_name', v_client.name,
      'service_name', v_service.name,
      'price', v_service.price,
      'status', 'scheduled'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb)
  TO authenticated, service_role;
`

export const MIGRATION_006_AGENT_RPC_LOCALTIME = `-- ============================================================================
-- plugin-agenda 006: agent_agenda_create_appointment speaks LOCAL time.
--
-- Models reliably mangle UTC↔local offsets ("10h" became 13:00 BRT via a
-- wrong sign). The RPC knows the tenant's timezone — so stop asking the model
-- to convert: \`starts_at\` WITHOUT an offset (2026-07-27T10:00) is interpreted
-- in the tenant tz; an explicit offset still works. The result now carries
-- starts_at_local/ends_at_local strings so the reply echoes the truth in the
-- user's own clock. Supersedes 005's function body (new file — applied
-- migrations are never edited).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_agenda_create_appointment(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_denial jsonb;
  v_used int;
  v_client_id uuid;
  v_service_id uuid;
  v_professional uuid;
  v_starts timestamptz;
  v_starts_raw text;
  v_notes text;
  v_service record;
  v_client record;
  v_ends timestamptz;
  v_tz text;
  v_order uuid;
  v_booking uuid;
BEGIN
  SELECT COALESCE(t.settings->>'timezone', 'America/Sao_Paulo') INTO v_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  IF v_tz IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown tenant');
  END IF;

  -- ── payload ──────────────────────────────────────────────────────────────
  BEGIN
    v_client_id    := (p_payload->>'client_id')::uuid;
    v_service_id   := (p_payload->>'service_id')::uuid;
    v_professional := (p_payload->>'professional_id')::uuid;
    v_starts_raw   := p_payload->>'starts_at';
    IF v_starts_raw ~ '(Z|[+-][0-9]{2}:?[0-9]{2})$' THEN
      v_starts := v_starts_raw::timestamptz;              -- explicit offset
    ELSE
      v_starts := (v_starts_raw::timestamp) AT TIME ZONE v_tz;  -- tenant-local
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid payload: ' || SQLERRM);
  END;
  v_notes := left(p_payload->>'notes', 500);
  IF v_client_id IS NULL OR v_service_id IS NULL OR v_starts IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'client_id, service_id and starts_at are required');
  END IF;
  IF v_starts <= now() OR v_starts > now() + interval '365 days' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'starts_at must be in the future (max 1 year)');
  END IF;

  -- ── authorization: role → plan → bookings_month cap ──────────────────────
  SELECT count(*) INTO v_used FROM appointments b
  WHERE b.tenant_id = p_tenant_id
    AND b.created_at >= date_trunc('month', now());
  v_denial := agent_guard(p_tenant_id, p_actor_user_id,
                          'appointments', 'create', 'bookings_month', v_used, 1);
  IF v_denial IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'denial', v_denial);
  END IF;

  -- ── invariants ───────────────────────────────────────────────────────────
  SELECT p.id, p.name INTO v_client
  FROM people p
  WHERE p.id = v_client_id AND p.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown client for this tenant');
  END IF;

  SELECT s.id, s.name, s.price, COALESCE(s.duration_minutes, 30) AS duration_minutes
    INTO v_service
  FROM services s
  WHERE s.id = v_service_id AND s.tenant_id = p_tenant_id
    AND s.is_active AND s.status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown or inactive service');
  END IF;

  v_ends := v_starts + make_interval(mins => v_service.duration_minutes);

  SELECT sc.assignee_id INTO v_professional
  FROM schedules sc
  WHERE sc.tenant_id = p_tenant_id
    AND sc.kind = 'working_hours'
    AND sc.is_active
    AND (v_professional IS NULL OR sc.assignee_id = v_professional)
    AND (
      sc.specific_date = (v_starts AT TIME ZONE v_tz)::date
      OR (sc.specific_date IS NULL
          AND sc.day_of_week = EXTRACT(dow FROM v_starts AT TIME ZONE v_tz)::smallint)
    )
    AND (v_starts AT TIME ZONE v_tz)::time >= sc.starts_at
    AND (v_ends AT TIME ZONE v_tz)::time <= sc.ends_at
    -- prefer a professional who is actually FREE at the slot (when the user
    -- did not name one, the first busy professional must not block the booking)
    AND NOT EXISTS (
      SELECT 1 FROM appointments b
      WHERE b.tenant_id = p_tenant_id
        AND b.assignee_id = sc.assignee_id
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.starts_at < v_ends
        AND COALESCE(b.ends_at, b.starts_at) > v_starts
    )
  ORDER BY sc.assignee_id
  LIMIT 1;
  IF v_professional IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'no professional is available at that slot (outside working hours or already booked). Suggest a different time. Times are tenant-local, tz ' || v_tz);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || v_professional::text, 0));
  IF EXISTS (
    SELECT 1 FROM appointments b
    WHERE b.tenant_id = p_tenant_id
      AND b.assignee_id = v_professional
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.starts_at < v_ends
      AND COALESCE(b.ends_at, b.starts_at) > v_starts
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot no longer available');
  END IF;

  -- ── write + audit ────────────────────────────────────────────────────────
  INSERT INTO orders (tenant_id, kind, status, party_id, assignee_id, subtotal, total, notes, metadata)
  VALUES (p_tenant_id, 'appointment', 'scheduled', v_client_id, v_professional,
          v_service.price, v_service.price, v_notes,
          jsonb_build_object('source', 'agent', 'serviceNames', v_service.name))
  RETURNING id INTO v_order;

  INSERT INTO appointments (tenant_id, kind, party_id, assignee_id, order_id,
                            starts_at, ends_at, status, notes, metadata)
  VALUES (p_tenant_id, 'appointment', v_client_id, v_professional, v_order,
          v_starts, v_ends, 'scheduled', v_notes,
          jsonb_build_object('source', 'agent', 'serviceNames', v_service.name))
  RETURNING id INTO v_booking;

  INSERT INTO order_items (order_id, service_id, name, quantity, unit_price, total,
                           sort_order, duration_minutes, assignee_id)
  VALUES (v_order, v_service.id, v_service.name, 1, v_service.price, v_service.price,
          0, v_service.duration_minutes, v_professional);

  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_user_id, 'agent.createAppointment', 'appointment', v_booking::text,
          jsonb_build_object('payload', p_payload, 'order_id', v_order));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_booking,
    'record', jsonb_build_object(
      'ref', jsonb_build_object('id', v_booking, 'resource', 'appointments',
                                'archetype', 'schedule:appointment'),
      'starts_at', v_starts,
      'ends_at', v_ends,
      'starts_at_local', to_char(v_starts AT TIME ZONE v_tz, 'YYYY-MM-DD (Dy) HH24:MI') || ' ' || v_tz,
      'ends_at_local', to_char(v_ends AT TIME ZONE v_tz, 'HH24:MI'),
      'client_name', v_client.name,
      'service_name', v_service.name,
      'price', v_service.price,
      'status', 'scheduled'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_agenda_create_appointment(uuid, uuid, jsonb)
  TO authenticated, service_role;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000b_v_bookings_rename", sql: MIGRATION_000B_V_BOOKINGS_RENAME },
  { id: "000c_dedupe_customer_phones", sql: MIGRATION_000C_DEDUPE_CUSTOMER_PHONES },
  { id: "001_public_booking", sql: MIGRATION_001_PUBLIC_BOOKING },
  { id: "002_v_bookings_compat", sql: MIGRATION_002_V_BOOKINGS_COMPAT },
  { id: "003_public_client_kind", sql: MIGRATION_003_PUBLIC_CLIENT_KIND },
  { id: "004_public_booking_assignee", sql: MIGRATION_004_PUBLIC_BOOKING_ASSIGNEE },
  { id: "005_agent_rpcs", sql: MIGRATION_005_AGENT_RPCS },
  { id: "006_agent_rpc_localtime", sql: MIGRATION_006_AGENT_RPC_LOCALTIME },
]
