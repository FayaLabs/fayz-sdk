-- Marketing Plugin: RankLayer integration (SEO content publishing).
-- Control-plane state for the RankLayer connector rendered in Marketing →
-- Integrações. Prefix: plg_marketing_ranklayer_. Scaffold: the real sync
-- (edge function + RankLayer API calls) lands via an external PR — see
-- src/integrations/ranklayer/RANKLAYER.md.

CREATE TABLE IF NOT EXISTS public.plg_marketing_ranklayer_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key text,
  site_domain text,
  active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_marketing_ranklayer_integrations ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_plg_marketing_ranklayer_integrations_tenant
  ON public.plg_marketing_ranklayer_integrations(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_marketing_ranklayer_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.plg_marketing_ranklayer_integrations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error')),
  message text,
  fetched integer NOT NULL DEFAULT 0,
  written integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_marketing_ranklayer_sync_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_marketing_ranklayer_sync_log_tenant
  ON public.plg_marketing_ranklayer_sync_log(tenant_id, created_at DESC);

-- RLS: authenticated tenant CRUD
DROP POLICY IF EXISTS plg_marketing_ranklayer_integrations_select ON public.plg_marketing_ranklayer_integrations;
DROP POLICY IF EXISTS plg_marketing_ranklayer_integrations_insert ON public.plg_marketing_ranklayer_integrations;
DROP POLICY IF EXISTS plg_marketing_ranklayer_integrations_update ON public.plg_marketing_ranklayer_integrations;
DROP POLICY IF EXISTS plg_marketing_ranklayer_integrations_delete ON public.plg_marketing_ranklayer_integrations;
CREATE POLICY plg_marketing_ranklayer_integrations_select ON public.plg_marketing_ranklayer_integrations FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_ranklayer_integrations_insert ON public.plg_marketing_ranklayer_integrations FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_ranklayer_integrations_update ON public.plg_marketing_ranklayer_integrations FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_ranklayer_integrations_delete ON public.plg_marketing_ranklayer_integrations FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_marketing_ranklayer_integrations TO authenticated;

DROP POLICY IF EXISTS plg_marketing_ranklayer_sync_log_select ON public.plg_marketing_ranklayer_sync_log;
DROP POLICY IF EXISTS plg_marketing_ranklayer_sync_log_insert ON public.plg_marketing_ranklayer_sync_log;
CREATE POLICY plg_marketing_ranklayer_sync_log_select ON public.plg_marketing_ranklayer_sync_log FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_ranklayer_sync_log_insert ON public.plg_marketing_ranklayer_sync_log FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT ON public.plg_marketing_ranklayer_sync_log TO authenticated;
