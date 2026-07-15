-- Move any saas_core table the converter does not know about into public,
-- so the converter's emptiness gate can pass and drop the schema safely.
-- Found live: salon carries saas_core.tenant_roles (RBAC iteration that only
-- ever existed there). Runs between 0000_legacy_quarantine and
-- 000_core_v1_convert ('0000b' < '000_' lexically). Idempotent: no-ops when
-- saas_core is gone or has no stragglers. A public-name collision aborts —
-- that case must be quarantined explicitly, never guessed.

DO $sweep$
DECLARE
  r record;
  known text[] := ARRAY[
    'tenants', 'profiles', 'tenant_members', 'plans', 'permissions',
    'role_permissions', 'tenant_role_overrides', 'invitations',
    'payment_events', 'locations', 'location_members', 'audit_logs',
    'subscriptions', 'invoices', 'notifications',
    'persons', 'categories', 'products', 'services', 'orders', 'order_items',
    'transactions', 'bookings', 'booking_items', 'schedules',
    'sequences', 'documents'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'saas_core') THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'saas_core' AND table_type = 'BASE TABLE'
      AND table_name <> ALL (known)
  LOOP
    IF to_regclass('public.' || quote_ident(r.table_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'straggler saas_core.% collides with an existing public table — quarantine it explicitly', r.table_name;
    END IF;
    EXECUTE format('ALTER TABLE saas_core.%I SET SCHEMA public', r.table_name);
    RAISE NOTICE 'straggler moved: saas_core.% -> public', r.table_name;
  END LOOP;
END $sweep$;
