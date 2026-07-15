// AUTO-GENERATED from 000_plg_rename.sql, 001_content_planner.sql, 002_multi_platform.sql, 003_recording_ops.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000_PLG_RENAME = `-- 000_plg_rename.sql — rename legacy marketing tables to plg_marketing_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when legacy
-- name exists and target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.mkt_social_accounts') IS NOT NULL AND to_regclass('public.plg_marketing_social_accounts') IS NULL THEN
    ALTER TABLE public.mkt_social_accounts RENAME TO plg_marketing_social_accounts;
  END IF;
  IF to_regclass('public.mkt_content_plans') IS NOT NULL AND to_regclass('public.plg_marketing_content_plans') IS NULL THEN
    ALTER TABLE public.mkt_content_plans RENAME TO plg_marketing_content_plans;
  END IF;
  IF to_regclass('public.mkt_content_posts') IS NOT NULL AND to_regclass('public.plg_marketing_content_posts') IS NULL THEN
    ALTER TABLE public.mkt_content_posts RENAME TO plg_marketing_content_posts;
  END IF;
END $$;
`

export const MIGRATION_001_CONTENT_PLANNER = `-- Marketing Plugin: Content Planner
-- Prefix: plg_marketing_
-- Social accounts + content plans + posts (Notion-style markdown pages).

CREATE TABLE IF NOT EXISTS public.plg_marketing_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  handle text,
  platform text NOT NULL DEFAULT 'instagram'
    CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_marketing_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_marketing_social_accounts_tenant ON public.plg_marketing_social_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_marketing_content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.plg_marketing_social_accounts(id) ON DELETE CASCADE,
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
ALTER TABLE public.plg_marketing_content_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_marketing_content_plans_tenant ON public.plg_marketing_content_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_marketing_content_plans_account ON public.plg_marketing_content_plans(account_id);

CREATE TABLE IF NOT EXISTS public.plg_marketing_content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plg_marketing_content_plans(id) ON DELETE CASCADE,
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
ALTER TABLE public.plg_marketing_content_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_marketing_content_posts_tenant ON public.plg_marketing_content_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_marketing_content_posts_plan ON public.plg_marketing_content_posts(plan_id, week_number, position);
CREATE INDEX IF NOT EXISTS idx_plg_marketing_content_posts_status ON public.plg_marketing_content_posts(tenant_id, status);

-- RLS policies for plg_marketing_social_accounts
DROP POLICY IF EXISTS plg_marketing_social_accounts_select ON public.plg_marketing_social_accounts;
DROP POLICY IF EXISTS plg_marketing_social_accounts_insert ON public.plg_marketing_social_accounts;
DROP POLICY IF EXISTS plg_marketing_social_accounts_update ON public.plg_marketing_social_accounts;
DROP POLICY IF EXISTS plg_marketing_social_accounts_delete ON public.plg_marketing_social_accounts;
CREATE POLICY plg_marketing_social_accounts_select ON public.plg_marketing_social_accounts FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_social_accounts_insert ON public.plg_marketing_social_accounts FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_social_accounts_update ON public.plg_marketing_social_accounts FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_social_accounts_delete ON public.plg_marketing_social_accounts FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_marketing_social_accounts TO authenticated;

-- RLS policies for plg_marketing_content_plans
DROP POLICY IF EXISTS plg_marketing_content_plans_select ON public.plg_marketing_content_plans;
DROP POLICY IF EXISTS plg_marketing_content_plans_insert ON public.plg_marketing_content_plans;
DROP POLICY IF EXISTS plg_marketing_content_plans_update ON public.plg_marketing_content_plans;
DROP POLICY IF EXISTS plg_marketing_content_plans_delete ON public.plg_marketing_content_plans;
CREATE POLICY plg_marketing_content_plans_select ON public.plg_marketing_content_plans FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_content_plans_insert ON public.plg_marketing_content_plans FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_content_plans_update ON public.plg_marketing_content_plans FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_content_plans_delete ON public.plg_marketing_content_plans FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_marketing_content_plans TO authenticated;

-- RLS policies for plg_marketing_content_posts
DROP POLICY IF EXISTS plg_marketing_content_posts_select ON public.plg_marketing_content_posts;
DROP POLICY IF EXISTS plg_marketing_content_posts_insert ON public.plg_marketing_content_posts;
DROP POLICY IF EXISTS plg_marketing_content_posts_update ON public.plg_marketing_content_posts;
DROP POLICY IF EXISTS plg_marketing_content_posts_delete ON public.plg_marketing_content_posts;
CREATE POLICY plg_marketing_content_posts_select ON public.plg_marketing_content_posts FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_content_posts_insert ON public.plg_marketing_content_posts FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_content_posts_update ON public.plg_marketing_content_posts FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_marketing_content_posts_delete ON public.plg_marketing_content_posts FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_marketing_content_posts TO authenticated;
`

export const MIGRATION_002_MULTI_PLATFORM = `-- Marketing Plugin: multi-platform accounts + per-post targets.
-- An account is a brand/profile that publishes to MANY platforms (Instagram,
-- YouTube, TikTok, ...). Posts optionally narrow the target platforms; an
-- empty array means "inherit the account's platforms".

ALTER TABLE public.plg_marketing_social_accounts
  ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT '{instagram}';

-- Backfill from the legacy single-platform column, then drop it (also drops
-- its CHECK constraint — the platform list is UI-driven from here on).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plg_marketing_social_accounts' AND column_name = 'platform'
  ) THEN
    UPDATE public.plg_marketing_social_accounts
      SET platforms = ARRAY[platform]
      WHERE platform IS NOT NULL AND platforms = '{instagram}';
    ALTER TABLE public.plg_marketing_social_accounts DROP COLUMN platform;
  END IF;
END $$;

ALTER TABLE public.plg_marketing_content_posts
  ADD COLUMN IF NOT EXISTS platforms text[] NOT NULL DEFAULT '{}';
`

export const MIGRATION_003_RECORDING_OPS = `-- Marketing Plugin: recording-day ops on posts.
-- checklist: shooting checklist items [{ id, text, done }] — the on-set
-- companion for recording day. media_url: uploaded asset (static posts get a
-- caption + final art instead of a script).

ALTER TABLE public.plg_marketing_content_posts
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]';

ALTER TABLE public.plg_marketing_content_posts
  ADD COLUMN IF NOT EXISTS media_url text;

-- Public media bucket for content assets (mirrors the avatars-bucket pattern:
-- public read, authenticated write). Path convention: content/{tenantId}/{postId}-{ts}.{ext}
INSERT INTO storage.buckets (id, name, public)
  VALUES ('mkt-media', 'mkt-media', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS plg_marketing_media_read ON storage.objects;
DROP POLICY IF EXISTS plg_marketing_media_insert ON storage.objects;
DROP POLICY IF EXISTS plg_marketing_media_update ON storage.objects;
DROP POLICY IF EXISTS plg_marketing_media_delete ON storage.objects;
CREATE POLICY plg_marketing_media_read ON storage.objects FOR SELECT TO public USING (bucket_id = 'mkt-media');
CREATE POLICY plg_marketing_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mkt-media');
CREATE POLICY plg_marketing_media_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mkt-media');
CREATE POLICY plg_marketing_media_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mkt-media');
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_content_planner", sql: MIGRATION_001_CONTENT_PLANNER },
  { id: "002_multi_platform", sql: MIGRATION_002_MULTI_PLATFORM },
  { id: "003_recording_ops", sql: MIGRATION_003_RECORDING_OPS },
]
