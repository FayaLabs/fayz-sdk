// AUTO-GENERATED from 000_plg_rename.sql, 001_content_planner.sql, 002_multi_platform.sql, 003_recording_ops.sql, 004_ranklayer.sql, 005_analytics_base.sql, 006_analytics_views.sql, 007_agent_rpcs.sql — regenerate with scripts/embed-migrations.mjs
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

export const MIGRATION_004_RANKLAYER = `-- Marketing Plugin: RankLayer integration (SEO content publishing).
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
`

export const MIGRATION_005_ANALYTICS_BASE = `-- Marketing Plugin: analytics base tables (channels + campaigns).
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
`

export const MIGRATION_006_ANALYTICS_VIEWS = `-- Marketing Plugin: analytics read views.
-- v_marketing_channels / v_marketing_campaigns — bridge views for the surface
-- and the agent's data primitives.
-- v_marketing_attribution — GENERIC, spine-only attribution event stream
-- (people/appointments/orders metadata). \`channel_raw\` is the unnormalized
-- origin string; the provider matches it against the app's channel set
-- (id or label, case/punctuation-insensitive).
-- Apps whose origin lives in an app-local extension table (e.g. beauty's
-- clients.origin) may CREATE OR REPLACE this view in their own incubator
-- migration, KEEPING the column contract:
--   (tenant_id uuid, kind text, source text, channel_raw text,
--    occurred_at timestamptz, value numeric)

CREATE OR REPLACE VIEW public.v_marketing_channels WITH (security_invoker=true) AS
SELECT c.id, c.tenant_id, c.channel_key, c.label, c.icon, c.kind,
       c.is_active, c.monthly_spend, c.created_at, c.updated_at
FROM public.plg_marketing_channels c;
GRANT SELECT ON public.v_marketing_channels TO authenticated;

CREATE OR REPLACE VIEW public.v_marketing_campaigns WITH (security_invoker=true) AS
SELECT g.id, g.tenant_id, g.name, g.channel_key, ch.label AS channel_label,
       g.status, g.starts_at, g.ends_at, g.spend, g.created_at, g.updated_at
FROM public.plg_marketing_campaigns g
LEFT JOIN public.plg_marketing_channels ch
  ON ch.tenant_id = g.tenant_id AND ch.channel_key = g.channel_key;
GRANT SELECT ON public.v_marketing_campaigns TO authenticated;

CREATE OR REPLACE VIEW public.v_marketing_attribution WITH (security_invoker=true) AS
-- lead events (CRM leads; sourceId aligns with lead-sources/channel ids)
SELECT p.tenant_id,
       'lead'::text AS kind,
       'crm'::text AS source,
       COALESCE(p.metadata->>'sourceId', p.metadata->>'sourceName', p.metadata->>'origin') AS channel_raw,
       p.created_at AS occurred_at,
       NULLIF(p.metadata->>'value', '')::numeric AS value
FROM public.people p
WHERE p.kind = 'lead'
UNION ALL
-- booking conversions (agenda verticals)
SELECT b.tenant_id, 'conversion', 'agenda',
       COALESCE(b.metadata->>'origin', pc.metadata->>'origin', pc.metadata->>'sourceId', pc.metadata->>'sourceName'),
       b.starts_at,
       o.total
FROM public.appointments b
LEFT JOIN public.people pc ON pc.id = b.party_id
LEFT JOIN public.orders o ON o.id = b.order_id
WHERE b.status NOT IN ('cancelled', 'no_show')
UNION ALL
-- order conversions (commerce verticals)
SELECT o.tenant_id, 'conversion', 'orders',
       COALESCE(o.metadata->>'origin', pp.metadata->>'origin', pp.metadata->>'sourceId'),
       o.created_at,
       o.total
FROM public.orders o
LEFT JOIN public.people pp ON pp.id = o.party_id
WHERE o.kind NOT IN ('appointment', 'deal')
  AND o.status NOT IN ('cancelled', 'draft')
UNION ALL
-- won-deal conversions (CRM verticals)
SELECT o.tenant_id, 'conversion', 'crm',
       COALESCE(pp.metadata->>'sourceId', pp.metadata->>'sourceName', o.metadata->>'origin'),
       o.updated_at,
       o.total
FROM public.orders o
LEFT JOIN public.people pp ON pp.id = o.party_id
WHERE o.kind = 'deal' AND o.status = 'won';

GRANT SELECT ON public.v_marketing_attribution TO authenticated;
`

export const MIGRATION_007_AGENT_RPCS = `-- ============================================================================
-- plugin-marketing 007: server-plane agent write RPC.
--
-- public.agent_marketing_create_campaign — guarded campaign create for the
-- assistant. Mirrors agent_agenda_create_appointment (agenda 005):
--   * actor-authorized: public.agent_guard (spine 015) runs role→plan→limit
--     BEFORE anything — denial comes back as structured jsonb;
--   * channel is validated against the tenant's plg_marketing_channels rows
--     (key or label, case/punctuation-insensitive); when the tenant has no
--     channel rows yet (surface not opened → lazy seed not run) the raw key is
--     accepted as-is;
--   * audited: audit_logs row with the acting user.
--
-- Contract (all agent_* RPCs): (p_tenant_id, p_actor_user_id, p_payload jsonb)
-- → jsonb {ok:true, id, record:{...}} | {ok:false, denial:{...}} | {ok:false,
-- error text}. GRANT authenticated+service_role — NEVER anon.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_marketing_create_campaign(
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
  v_name text;
  v_channel_raw text;
  v_channel_key text;
  v_status text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_spend numeric;
  v_has_channels boolean;
  v_id uuid;
BEGIN
  -- ── payload ──────────────────────────────────────────────────────────────
  v_name := left(trim(p_payload->>'name'), 200);
  v_channel_raw := trim(p_payload->>'channel_key');
  v_status := COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'draft');
  v_spend := COALESCE(NULLIF(p_payload->>'spend', '')::numeric, 0);
  BEGIN
    v_starts := NULLIF(p_payload->>'starts_at', '')::timestamptz;
    v_ends := NULLIF(p_payload->>'ends_at', '')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid payload: ' || SQLERRM);
  END;
  IF v_name IS NULL OR v_name = '' OR v_channel_raw IS NULL OR v_channel_raw = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name and channel_key are required');
  END IF;
  IF v_status NOT IN ('active', 'paused', 'ended', 'draft') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'status must be one of active|paused|ended|draft');
  END IF;

  -- ── authorization: role → plan → campaigns_active cap ────────────────────
  SELECT count(*) INTO v_used FROM plg_marketing_campaigns c
  WHERE c.tenant_id = p_tenant_id AND c.status = 'active';
  v_denial := agent_guard(p_tenant_id, p_actor_user_id,
                          'marketing', 'create', 'campaigns_active', v_used,
                          CASE WHEN v_status = 'active' THEN 1 ELSE 0 END);
  IF v_denial IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'denial', v_denial);
  END IF;

  -- ── channel resolution (key or label, normalized) ────────────────────────
  SELECT EXISTS (SELECT 1 FROM plg_marketing_channels ch WHERE ch.tenant_id = p_tenant_id)
    INTO v_has_channels;
  IF v_has_channels THEN
    SELECT ch.channel_key INTO v_channel_key
    FROM plg_marketing_channels ch
    WHERE ch.tenant_id = p_tenant_id
      AND (
        regexp_replace(lower(ch.channel_key), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(v_channel_raw), '[^a-z0-9]', '', 'g')
        OR regexp_replace(lower(ch.label), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(v_channel_raw), '[^a-z0-9]', '', 'g')
      )
    LIMIT 1;
    IF v_channel_key IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'unknown channel "' || v_channel_raw || '" — valid channels: ' ||
        COALESCE((SELECT string_agg(ch.channel_key, ', ' ORDER BY ch.channel_key)
                  FROM plg_marketing_channels ch WHERE ch.tenant_id = p_tenant_id), ''));
    END IF;
  ELSE
    v_channel_key := v_channel_raw;
  END IF;

  -- ── write + audit ────────────────────────────────────────────────────────
  INSERT INTO plg_marketing_campaigns (tenant_id, name, channel_key, status, starts_at, ends_at, spend)
  VALUES (p_tenant_id, v_name, v_channel_key, v_status, COALESCE(v_starts, now()), v_ends, v_spend)
  RETURNING id INTO v_id;

  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_user_id, 'agent.createCampaign', 'marketing_campaign', v_id::text,
          jsonb_build_object('payload', p_payload));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'record', jsonb_build_object(
      'id', v_id,
      'name', v_name,
      'channel_key', v_channel_key,
      'status', v_status,
      'starts_at', COALESCE(v_starts, now()),
      'spend', v_spend
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_marketing_create_campaign(uuid, uuid, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.agent_marketing_create_campaign(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_marketing_create_campaign(uuid, uuid, jsonb)
  TO authenticated, service_role;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_content_planner", sql: MIGRATION_001_CONTENT_PLANNER },
  { id: "002_multi_platform", sql: MIGRATION_002_MULTI_PLATFORM },
  { id: "003_recording_ops", sql: MIGRATION_003_RECORDING_OPS },
  { id: "004_ranklayer", sql: MIGRATION_004_RANKLAYER },
  { id: "005_analytics_base", sql: MIGRATION_005_ANALYTICS_BASE },
  { id: "006_analytics_views", sql: MIGRATION_006_ANALYTICS_VIEWS },
  { id: "007_agent_rpcs", sql: MIGRATION_007_AGENT_RPCS },
]
