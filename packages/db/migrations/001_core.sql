-- core: minimal core schema for each SaaS project (industry-pool model)
-- All core entities live directly in the PUBLIC schema — no saas_core schema.
-- Plugin registry, verticals, billing live in Fayz platform DB — not here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tenants (organizations)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  plan text NOT NULL DEFAULT 'free',
  vertical_id text,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tenant members (org membership + role)
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create tenant + owner atomically (bypasses RLS chicken-and-egg).
-- This public function IS the body — PostgREST exposes public directly, so
-- there is no saas_core wrapper indirection anymore.
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  p_name text, p_slug text, p_user_id uuid,
  p_vertical_id text DEFAULT NULL, p_plan text DEFAULT 'free', p_settings jsonb DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; v_tenant jsonb;
BEGIN
  INSERT INTO public.tenants (name, slug, plan, vertical_id, settings)
  VALUES (p_name, p_slug, p_plan, p_vertical_id, p_settings) RETURNING id INTO v_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_id, p_user_id, 'owner');

  SELECT to_jsonb(t) INTO v_tenant FROM public.tenants t WHERE t.id = v_id;
  RETURN v_tenant;
END; $$;

-- Admin check (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

-- Plans
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  vertical_id text,
  price_monthly integer DEFAULT 0,
  price_yearly integer DEFAULT 0,
  features jsonb DEFAULT '[]',
  is_popular boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Permissions (RBAC)
CREATE TABLE public.permissions (
  id text PRIMARY KEY,
  category text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Role permissions (default grants per role)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_id text NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  actions text[] NOT NULL DEFAULT '{read}',
  UNIQUE(role, permission_id)
);

-- Tenant role overrides (per-tenant permission customization)
CREATE TABLE public.tenant_role_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL,
  permission_id text NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  UNIQUE(tenant_id, role, permission_id)
);

-- Invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  location_ids uuid[] DEFAULT '{}',
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payment events (webhook log)
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Locations (multi-branch)
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'branch',
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text DEFAULT 'BR',
  postal_code text,
  is_headquarters boolean DEFAULT false,
  is_active boolean DEFAULT true,
  tags text[] DEFAULT '{}',
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Location members (staff assigned to locations)
CREATE TABLE public.location_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'staff',
  UNIQUE(location_id, user_id)
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions (billing)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_role_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tenants: members can see, authenticated can create
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE
  USING (public.is_tenant_admin(id));

-- Profiles: own profile only
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Tenant members: see own, insert own, admins manage
CREATE POLICY "members_select" ON public.tenant_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "members_insert_own" ON public.tenant_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_update" ON public.tenant_members FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "members_delete" ON public.tenant_members FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- Plans/permissions: readable by all authenticated
CREATE POLICY "plans_select" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "perms_select" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_perms_select" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Tenant role overrides: members can see their tenant's overrides
CREATE POLICY "overrides_select" ON public.tenant_role_overrides FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "overrides_manage" ON public.tenant_role_overrides FOR ALL
  USING (public.is_tenant_admin(tenant_id));

-- Invitations: admins manage, anyone can read (to accept)
CREATE POLICY "invites_select" ON public.invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "invites_insert" ON public.invitations FOR INSERT
  WITH CHECK (public.is_tenant_admin(tenant_id));
CREATE POLICY "invites_update" ON public.invitations FOR UPDATE
  USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "invites_delete" ON public.invitations FOR DELETE
  USING (public.is_tenant_admin(tenant_id));

-- Locations: tenant members can see, admins manage
CREATE POLICY "locations_select" ON public.locations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "locations_manage" ON public.locations FOR ALL
  USING (public.is_tenant_admin(tenant_id));

-- Location members: same as locations
CREATE POLICY "loc_members_select" ON public.location_members FOR SELECT
  USING (location_id IN (SELECT id FROM public.locations WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )));

-- Subscriptions/invoices: members can see
CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Payment events: service_role only (webhook handler)
CREATE POLICY "events_service" ON public.payment_events FOR ALL TO service_role USING (true);

-- Audit logs: tenant members can see their tenant's logs
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications: own notifications
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Grant schema access (public is the only API schema now)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Expose ONLY the public schema to the PostgREST API
ALTER ROLE authenticator SET pgrst.db_schemas = 'public';
NOTIFY pgrst, 'reload config';
