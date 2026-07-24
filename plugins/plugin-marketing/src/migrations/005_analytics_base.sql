-- Marketing Plugin: analytics base tables (channels + campaigns).
-- Prefix: plg_marketing_
-- Channels are tenant-owned rows lazily seeded from the app's domain preset
-- (channel_key = preset/config id). Campaign performance is DERIVED at read
-- time from v_marketing_attribution (006); only spend is stored.
-- Canonical RLS form: tenant_id IN (SELECT public.user_tenant_ids()).

CREATE TABLE IF NOT EXISTS public.plg_marketing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_key text NOT NULL,
  label text NOT NULL,
  icon text,
  kind text NOT NULL DEFAULT 'organic'
    CHECK (kind IN ('paid', 'organic', 'social', 'referral', 'direct', 'outbound')),
  is_active boolean NOT NULL DEFAULT true,
  monthly_spend numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plg_marketing_channels_tenant ON public.plg_marketing_channels(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS u_plg_marketing_channels_tenant_key ON public.plg_marketing_channels(tenant_id, channel_key);

CREATE TABLE IF NOT EXISTS public.plg_marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'paused', 'ended', 'draft')),
  starts_at timestamptz,
  ends_at timestamptz,
  spend numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plg_marketing_campaigns_tenant ON public.plg_marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_marketing_campaigns_channel ON public.plg_marketing_campaigns(tenant_id, channel_key);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['plg_marketing_channels','plg_marketing_campaigns'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_select') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_select', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_insert') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_insert', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_update') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_update', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=t||'_delete') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()))', t||'_delete', t);
    END IF;
  END LOOP;
END $$;
