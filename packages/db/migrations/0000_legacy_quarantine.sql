-- ============================================================================
-- 0000_legacy_quarantine.sql — pre-convert collision guard (ALL pools)
--
-- MUST run BEFORE 000_core_v1_convert.sql. The filename starts `0000_` so it
-- lexically sorts ahead of `000_core_v1_convert.sql` (the runner orders files
-- with a plain string sort — verify: ['0000_legacy_quarantine.sql',
-- '000_core_v1_convert.sql'].sort()).
--
-- WHY: the in-place converter moves saas_core.<source> -> public.<target> only
-- when public.<target> is FREE (guarded on target absence). If a pool already
-- holds a legacy public.<target> (a bespoke pre-pool table sharing the name),
-- the move/rename silently no-ops and the live saas_core.<source> is left
-- behind — then `DROP SCHEMA saas_core CASCADE` would DESTROY it. This file
-- gets the colliding legacy table out of the way first, into a quarantine
-- schema, so every source table has a free target to land on.
--
-- For EVERY (source -> target) pair the converter touches, if BOTH
-- saas_core.<source> AND public.<target> exist, move public.<target> into
-- legacy_pre_pools. The presence of saas_core.<source> proves the convert has
-- not run yet, so this public.<target> must be a legacy collision (not the
-- converted core table).
--
-- Known real collisions from the 2026-07-14 backups (all covered by the loop):
--   * creators   — public.subscriptions (4 rows, direct-move pair)
--   * salon/gphx — public.appointments (0 rows, bookings->appointments rename)
--   * restaurant — public.orders + public.order_items (0 rows, direct-move pairs)
--
-- Idempotent: guarded on saas_core existing; each move guarded on both source
-- present AND target present; a no-op on fresh pools and on already-converted
-- pools (saas_core dropped -> early return).
-- ============================================================================

DO $quarantine$
DECLARE
  r record;
BEGIN
  -- Only act on pools that still carry the legacy schema (pre-convert).
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'saas_core') THEN
    RETURN;
  END IF;

  -- (source in saas_core) -> (target in public) for every table the converter
  -- moves. Direct moves keep the name; the three changed entities are renamed
  -- (persons->people, bookings->appointments, booking_items->appointment_items).
  -- Mirrors the move list in 000_core_v1_convert.sql exactly.
  FOR r IN
    SELECT * FROM (VALUES
      ('tenants',                'tenants'),
      ('profiles',               'profiles'),
      ('tenant_members',         'tenant_members'),
      ('plans',                  'plans'),
      ('permissions',            'permissions'),
      ('role_permissions',       'role_permissions'),
      ('tenant_role_overrides',  'tenant_role_overrides'),
      ('invitations',            'invitations'),
      ('payment_events',         'payment_events'),
      ('locations',              'locations'),
      ('location_members',       'location_members'),
      ('audit_logs',             'audit_logs'),
      ('subscriptions',          'subscriptions'),
      ('invoices',               'invoices'),
      ('notifications',          'notifications'),
      ('persons',                'people'),
      ('categories',             'categories'),
      ('products',               'products'),
      ('services',               'services'),
      ('orders',                 'orders'),
      ('order_items',            'order_items'),
      ('transactions',           'transactions'),
      ('bookings',               'appointments'),
      ('booking_items',          'appointment_items'),
      ('schedules',              'schedules'),
      ('sequences',              'sequences'),
      ('documents',              'documents')
    ) AS m(source, target)
  LOOP
    IF to_regclass('saas_core.' || quote_ident(r.source)) IS NOT NULL
       AND to_regclass('public.' || quote_ident(r.target)) IS NOT NULL THEN
      CREATE SCHEMA IF NOT EXISTS legacy_pre_pools;
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA legacy_pre_pools', r.target);
      RAISE NOTICE 'legacy_pre_pools: quarantined public.% (collides with the saas_core.% -> public.% move)',
        r.target, r.source, r.target;
    END IF;
  END LOOP;
END;
$quarantine$;
