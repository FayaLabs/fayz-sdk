-- core: RLS for project tables (public schema)
-- Ensures every plugin/app table with tenant_id is scoped to the user's tenants.

-- Helper: get tenant IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

-- Apply generic tenant-isolation RLS to public tables that have a tenant_id
-- column. Runs as a DO block so it auto-discovers tables.
--
-- Scope note: the core tables (tenants/tenant_members/locations/... created in
-- 001, and the archetype tables created later in 004) carry their OWN curated
-- policies and must NOT receive the generic isolation policy (e.g. payment_events
-- would otherwise become readable by tenant members). They are excluded below.
-- What remains covered: plugin (plg_*) and app tables that carry a tenant_id.
-- Child tables (order_items/appointment_items/*_items) have no tenant_id column,
-- so they are skipped here and instead get parent-FK policies in their own
-- migrations.
DO $$
DECLARE
  t text;
  core_tables text[] := ARRAY[
    -- 001 core spine
    'tenants', 'profiles', 'tenant_members', 'plans', 'permissions',
    'role_permissions', 'tenant_role_overrides', 'invitations',
    'payment_events', 'locations', 'location_members', 'audit_logs',
    'subscriptions', 'invoices', 'notifications',
    -- 004 archetypes (self-governed via 004/006 policies)
    'people', 'categories', 'products', 'services', 'orders', 'order_items',
    'transactions', 'appointments', 'appointment_items', 'schedules',
    -- core, non-API helper tables (both ledger names kept for pre/post-rename compat;
    -- `_migrations` is also covered by the NOT LIKE '\_%' filter below)
    'sequences', 'documents', 'fayz_migration_ledger', '_migrations'
  ];
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tbl ON tbl.table_name = c.table_name AND tbl.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND tbl.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE '\_%'
      AND c.table_name <> ALL(core_tables)
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop existing policies (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON public.%I', t);

    -- Create tenant isolation policies
    EXECUTE format('CREATE POLICY tenant_isolation_select ON public.%I FOR SELECT USING (tenant_id::uuid IN (SELECT public.user_tenant_ids()))', t);
    EXECUTE format('CREATE POLICY tenant_isolation_insert ON public.%I FOR INSERT WITH CHECK (tenant_id::uuid IN (SELECT public.user_tenant_ids()))', t);
    EXECUTE format('CREATE POLICY tenant_isolation_update ON public.%I FOR UPDATE USING (tenant_id::uuid IN (SELECT public.user_tenant_ids()))', t);
    EXECUTE format('CREATE POLICY tenant_isolation_delete ON public.%I FOR DELETE USING (tenant_id::uuid IN (SELECT public.user_tenant_ids()))', t);
  END LOOP;
END $$;
