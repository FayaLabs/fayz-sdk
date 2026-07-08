-- Marketing Plugin: Content Planner
-- Prefix: mkt_
-- Social accounts + content plans + posts (Notion-style markdown pages).

CREATE TABLE IF NOT EXISTS public.mkt_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  handle text,
  platform text NOT NULL DEFAULT 'instagram'
    CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mkt_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mkt_social_accounts_tenant ON public.mkt_social_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS public.mkt_content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.mkt_social_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  weeks_count integer NOT NULL DEFAULT 8,
  start_date date,
  objective text,
  tone text,
  pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  formats jsonb NOT NULL DEFAULT '[]'::jsonb,
  weekly_frequency integer NOT NULL DEFAULT 3,
  brief_md text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mkt_content_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mkt_content_plans_tenant ON public.mkt_content_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mkt_content_plans_account ON public.mkt_content_plans(account_id);

CREATE TABLE IF NOT EXISTS public.mkt_content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.mkt_content_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  format text NOT NULL DEFAULT 'reel'
    CHECK (format IN ('reel', 'static', 'carousel', 'story')),
  status text NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'script', 'recording', 'editing', 'scheduled', 'published')),
  scheduled_date date,
  hook text,
  cta text,
  content_md text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mkt_content_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mkt_content_posts_tenant ON public.mkt_content_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mkt_content_posts_plan ON public.mkt_content_posts(plan_id, week_number, position);
CREATE INDEX IF NOT EXISTS idx_mkt_content_posts_status ON public.mkt_content_posts(tenant_id, status);

-- RLS policies for mkt_social_accounts
DROP POLICY IF EXISTS mkt_social_accounts_select ON public.mkt_social_accounts;
DROP POLICY IF EXISTS mkt_social_accounts_insert ON public.mkt_social_accounts;
DROP POLICY IF EXISTS mkt_social_accounts_update ON public.mkt_social_accounts;
DROP POLICY IF EXISTS mkt_social_accounts_delete ON public.mkt_social_accounts;
CREATE POLICY mkt_social_accounts_select ON public.mkt_social_accounts FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_social_accounts_insert ON public.mkt_social_accounts FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_social_accounts_update ON public.mkt_social_accounts FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_social_accounts_delete ON public.mkt_social_accounts FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_social_accounts TO authenticated;

-- RLS policies for mkt_content_plans
DROP POLICY IF EXISTS mkt_content_plans_select ON public.mkt_content_plans;
DROP POLICY IF EXISTS mkt_content_plans_insert ON public.mkt_content_plans;
DROP POLICY IF EXISTS mkt_content_plans_update ON public.mkt_content_plans;
DROP POLICY IF EXISTS mkt_content_plans_delete ON public.mkt_content_plans;
CREATE POLICY mkt_content_plans_select ON public.mkt_content_plans FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_content_plans_insert ON public.mkt_content_plans FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_content_plans_update ON public.mkt_content_plans FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_content_plans_delete ON public.mkt_content_plans FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_content_plans TO authenticated;

-- RLS policies for mkt_content_posts
DROP POLICY IF EXISTS mkt_content_posts_select ON public.mkt_content_posts;
DROP POLICY IF EXISTS mkt_content_posts_insert ON public.mkt_content_posts;
DROP POLICY IF EXISTS mkt_content_posts_update ON public.mkt_content_posts;
DROP POLICY IF EXISTS mkt_content_posts_delete ON public.mkt_content_posts;
CREATE POLICY mkt_content_posts_select ON public.mkt_content_posts FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_content_posts_insert ON public.mkt_content_posts FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_content_posts_update ON public.mkt_content_posts FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY mkt_content_posts_delete ON public.mkt_content_posts FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_content_posts TO authenticated;
