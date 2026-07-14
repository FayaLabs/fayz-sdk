-- ============================================================================
-- 000_core_v1_convert.sql — in-place converter: saas_core  ->  public
--
-- For EXISTING pools that already hold live data in the saas_core schema.
-- Moves every core table into public, renames the three entities that changed
-- (persons->people, bookings->appointments, booking_items->appointment_items),
-- re-authors the core functions/triggers/policies in public terms, then drops
-- the saas_core schema and re-points PostgREST at public only.
--
-- Idempotent + partial-re-run safe: guarded by the existence of the saas_core
-- schema, and every table move/rename is individually guarded with to_regclass.
--
-- Relies on Postgres semantics:
--   * ALTER TABLE ... SET SCHEMA preserves data / PKs / FKs / indexes /
--     policies / grants (only the containing schema changes).
--   * ALTER TABLE ... RENAME cascades FK / index / policy references.
--   * Function BODIES and trigger function references do NOT auto-follow a
--     schema move -> they are re-emitted below before saas_core is dropped.
--
-- ORDERING NOTE (salon pool gphx only): 000b_gphx_quarantine.sql MUST be
-- applied BEFORE this file, because a legacy 0-row public.appointments would
-- otherwise block the bookings->appointments rename (guarded on target absence).
-- ============================================================================

DO $convert$
DECLARE
  t text;
  r record;
  core_tables text[] := ARRAY[
    'tenants', 'profiles', 'tenant_members', 'plans', 'permissions',
    'role_permissions', 'tenant_role_overrides', 'invitations',
    'payment_events', 'locations', 'location_members', 'audit_logs',
    'subscriptions', 'invoices', 'notifications',
    'persons', 'categories', 'products', 'services', 'orders', 'order_items',
    'transactions', 'bookings', 'booking_items', 'schedules',
    -- may or may not exist depending on installed plugins (stay core, unprefixed)
    'sequences', 'documents'
  ];
  -- post-move / post-rename public names carrying an updated_at trigger
  ts_tables text[] := ARRAY[
    'tenants', 'profiles', 'locations', 'subscriptions', 'people', 'categories',
    'products', 'services', 'orders', 'transactions', 'appointments', 'schedules'
  ];
  -- post-move / post-rename public names governed by generic tenant isolation
  archetype_tables text[] := ARRAY[
    'people', 'categories', 'products', 'services',
    'orders', 'transactions', 'appointments', 'schedules'
  ];
  -- every core table that must be re-policied in public terms
  policy_tables text[];
BEGIN
  -- Only act on pools that still have the legacy schema.
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'saas_core') THEN
    RETURN;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3a. Re-emit the core functions in public (bodies do not follow a move).
  -- --------------------------------------------------------------------------
  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;
  $q$;

  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, avatar_url)
      VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END; $fn$;
  $q$;

  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
      p_name text, p_slug text, p_user_id uuid,
      p_vertical_id text DEFAULT NULL, p_plan text DEFAULT 'free', p_settings jsonb DEFAULT '{}'
    )
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $fn$
    DECLARE v_id uuid; v_tenant jsonb;
    BEGIN
      INSERT INTO public.tenants (name, slug, plan, vertical_id, settings)
      VALUES (p_name, p_slug, p_plan, p_vertical_id, p_settings) RETURNING id INTO v_id;
      INSERT INTO public.tenant_members (tenant_id, user_id, role)
      VALUES (v_id, p_user_id, 'owner');
      SELECT to_jsonb(t) INTO v_tenant FROM public.tenants t WHERE t.id = v_id;
      RETURN v_tenant;
    END; $fn$;
  $q$;

  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.tenant_members
        WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
      );
    $fn$;
  $q$;

  EXECUTE $q$
    CREATE OR REPLACE FUNCTION public.user_tenant_ids()
    RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER AS $fn$
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
    $fn$;
  $q$;

  -- Re-point the auth.users trigger at the public function.
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- --------------------------------------------------------------------------
  -- 1. Move every core table saas_core.* -> public.* (guarded, idempotent).
  -- --------------------------------------------------------------------------
  FOREACH t IN ARRAY core_tables LOOP
    IF to_regclass('saas_core.' || quote_ident(t)) IS NOT NULL
       AND to_regclass('public.' || quote_ident(t)) IS NULL THEN
      EXECUTE format('ALTER TABLE saas_core.%I SET SCHEMA public', t);
    END IF;
  END LOOP;

  -- --------------------------------------------------------------------------
  -- 2. Rename the three entities that changed (only if source present, target free).
  -- --------------------------------------------------------------------------
  IF to_regclass('public.persons') IS NOT NULL AND to_regclass('public.people') IS NULL THEN
    ALTER TABLE public.persons RENAME TO people;
  END IF;
  IF to_regclass('public.bookings') IS NOT NULL AND to_regclass('public.appointments') IS NULL THEN
    ALTER TABLE public.bookings RENAME TO appointments;
  END IF;
  IF to_regclass('public.booking_items') IS NOT NULL AND to_regclass('public.appointment_items') IS NULL THEN
    ALTER TABLE public.booking_items RENAME TO appointment_items;
  END IF;

  -- --------------------------------------------------------------------------
  -- 4. Re-create updated_at triggers to call public.handle_updated_at.
  -- --------------------------------------------------------------------------
  FOREACH t IN ARRAY ts_tables LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
        t || '_updated_at', t
      );
    END IF;
  END LOOP;
  -- Legacy trigger names carried over by the RENAME.
  IF to_regclass('public.people') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS persons_updated_at ON public.people;
  END IF;
  IF to_regclass('public.appointments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS bookings_updated_at ON public.appointments;
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. Re-emit RLS policies in public terms.
  --    Drop EVERY existing policy on the moved tables (their bodies still
  --    reference saas_core.*) and recreate the canonical public policy set —
  --    identical end-state to a fresh baseline (001 + 006).
  -- --------------------------------------------------------------------------
  policy_tables := core_tables
    || ARRAY['people', 'appointments', 'appointment_items']::text[];

  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(policy_tables)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  -- tenants
  CREATE POLICY "tenants_select" ON public.tenants FOR SELECT
    USING (id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (public.is_tenant_admin(id));

  -- profiles
  CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (id = auth.uid());
  CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
  CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

  -- tenant_members
  CREATE POLICY "members_select" ON public.tenant_members FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "members_insert_own" ON public.tenant_members FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "members_update" ON public.tenant_members FOR UPDATE USING (public.is_tenant_admin(tenant_id));
  CREATE POLICY "members_delete" ON public.tenant_members FOR DELETE USING (public.is_tenant_admin(tenant_id));

  -- plans / permissions / role_permissions
  CREATE POLICY "plans_select" ON public.plans FOR SELECT TO authenticated USING (true);
  CREATE POLICY "perms_select" ON public.permissions FOR SELECT TO authenticated USING (true);
  CREATE POLICY "role_perms_select" ON public.role_permissions FOR SELECT TO authenticated USING (true);

  -- tenant_role_overrides
  CREATE POLICY "overrides_select" ON public.tenant_role_overrides FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  CREATE POLICY "overrides_manage" ON public.tenant_role_overrides FOR ALL
    USING (public.is_tenant_admin(tenant_id));

  -- invitations
  CREATE POLICY "invites_select" ON public.invitations FOR SELECT TO authenticated USING (true);
  CREATE POLICY "invites_insert" ON public.invitations FOR INSERT WITH CHECK (public.is_tenant_admin(tenant_id));
  CREATE POLICY "invites_update" ON public.invitations FOR UPDATE USING (public.is_tenant_admin(tenant_id));
  CREATE POLICY "invites_delete" ON public.invitations FOR DELETE USING (public.is_tenant_admin(tenant_id));

  -- payment_events
  CREATE POLICY "events_service" ON public.payment_events FOR ALL TO service_role USING (true);

  -- locations
  CREATE POLICY "locations_select" ON public.locations FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  CREATE POLICY "locations_manage" ON public.locations FOR ALL USING (public.is_tenant_admin(tenant_id));

  -- location_members
  CREATE POLICY "loc_members_select" ON public.location_members FOR SELECT
    USING (location_id IN (SELECT id FROM public.locations WHERE tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )));

  -- subscriptions / invoices
  CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

  -- audit_logs
  CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

  -- notifications
  CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

  -- archetype tables (generic tenant isolation via SECURITY DEFINER helper)
  FOREACH t IN ARRAY archetype_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t, t);
  END LOOP;

  -- order_items (parent-FK policies)
  CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));
  CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated
    WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));
  CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));
  CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE TO authenticated
    USING (order_id IN (SELECT id FROM public.orders WHERE tenant_id IN (SELECT public.user_tenant_ids())));

  -- appointment_items (parent-FK policies; booking_id column preserved by rename)
  CREATE POLICY "appointment_items_select" ON public.appointment_items FOR SELECT TO authenticated
    USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
  CREATE POLICY "appointment_items_insert" ON public.appointment_items FOR INSERT TO authenticated
    WITH CHECK (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
  CREATE POLICY "appointment_items_update" ON public.appointment_items FOR UPDATE TO authenticated
    USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));
  CREATE POLICY "appointment_items_delete" ON public.appointment_items FOR DELETE TO authenticated
    USING (booking_id IN (SELECT id FROM public.appointments WHERE tenant_id IN (SELECT public.user_tenant_ids())));

  -- --------------------------------------------------------------------------
  -- 6. Drop the now-empty legacy schema (any residue is old wrappers/functions).
  -- --------------------------------------------------------------------------
  DROP SCHEMA IF EXISTS saas_core CASCADE;

  -- --------------------------------------------------------------------------
  -- 7. Point PostgREST at public only.
  -- --------------------------------------------------------------------------
  EXECUTE 'ALTER ROLE authenticator SET pgrst.db_schemas = ''public''';
END;
$convert$;

NOTIFY pgrst, 'reload config';
