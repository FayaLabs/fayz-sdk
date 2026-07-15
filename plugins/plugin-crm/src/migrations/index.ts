// AUTO-GENERATED from 000_plg_rename.sql, 001_crm_base.sql, 002_activities.sql, 003_crm_views_rls.sql, 004_seed_default_pipeline.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000_PLG_RENAME = `-- 000_plg_rename.sql — rename legacy CRM tables to the plg_crm_* convention for
-- pools provisioned before the industry-pool rename. Guarded: only fires when the
-- legacy name exists and the target does not, so fresh pools skip every branch and
-- the create-table migrations below build clean.
DO $$
BEGIN
  IF to_regclass('public.crm_activities') IS NOT NULL AND to_regclass('public.plg_crm_activities') IS NULL THEN
    ALTER TABLE public.crm_activities RENAME TO plg_crm_activities;
  END IF;
  IF to_regclass('public.crm_tags') IS NOT NULL AND to_regclass('public.plg_crm_tags') IS NULL THEN
    ALTER TABLE public.crm_tags RENAME TO plg_crm_tags;
  END IF;
  IF to_regclass('public.crm_activity_types') IS NOT NULL AND to_regclass('public.plg_crm_activity_types') IS NULL THEN
    ALTER TABLE public.crm_activity_types RENAME TO plg_crm_activity_types;
  END IF;
  IF to_regclass('public.pipelines') IS NOT NULL AND to_regclass('public.plg_crm_pipelines') IS NULL THEN
    ALTER TABLE public.pipelines RENAME TO plg_crm_pipelines;
  END IF;
  IF to_regclass('public.pipeline_stages') IS NOT NULL AND to_regclass('public.plg_crm_pipeline_stages') IS NULL THEN
    ALTER TABLE public.pipeline_stages RENAME TO plg_crm_pipeline_stages;
  END IF;
  IF to_regclass('public.deal_extensions') IS NOT NULL AND to_regclass('public.plg_crm_deal_extensions') IS NULL THEN
    ALTER TABLE public.deal_extensions RENAME TO plg_crm_deal_extensions;
  END IF;
  IF to_regclass('public.lead_sources') IS NOT NULL AND to_regclass('public.plg_crm_lead_sources') IS NULL THEN
    ALTER TABLE public.lead_sources RENAME TO plg_crm_lead_sources;
  END IF;
END $$;
`

export const MIGRATION_001_CRM_BASE = `-- CRM Plugin: Base Tables
-- Leads use public.people (kind='lead')
-- Deals use public.orders (kind='deal')
-- Quotes use public.orders (kind='quote') + public.order_items
-- These are plugin-specific extension tables

CREATE TABLE IF NOT EXISTS public.plg_crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_pipelines_tenant ON public.plg_crm_pipelines(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.plg_crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  color text DEFAULT '#6366f1',
  probability numeric(5,2) DEFAULT 0,
  is_won boolean DEFAULT false,
  is_lost boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_pipeline_stages_tenant ON public.plg_crm_pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_crm_pipeline_stages_pipeline ON public.plg_crm_pipeline_stages(pipeline_id);

CREATE TABLE IF NOT EXISTS public.plg_crm_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_lead_sources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_lead_sources_tenant ON public.plg_crm_lead_sources(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_tags ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_tags_tenant ON public.plg_crm_tags(tenant_id);

-- Deal extension: links public.orders (kind='deal') to pipeline stage
CREATE TABLE IF NOT EXISTS public.plg_crm_deal_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pipeline_id uuid REFERENCES public.plg_crm_pipelines(id),
  stage_id uuid REFERENCES public.plg_crm_pipeline_stages(id),
  probability numeric(5,2) DEFAULT 0,
  expected_close_date date,
  lead_id uuid REFERENCES public.people(id),
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_deal_extensions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_deal_extensions_tenant ON public.plg_crm_deal_extensions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_crm_deal_extensions_order ON public.plg_crm_deal_extensions(order_id);
CREATE INDEX IF NOT EXISTS idx_plg_crm_deal_extensions_stage ON public.plg_crm_deal_extensions(stage_id);
`

export const MIGRATION_002_ACTIVITIES = `-- CRM Plugin: Activities & Tasks

CREATE TABLE IF NOT EXISTS public.plg_crm_activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_activity_types ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_activity_types_tenant ON public.plg_crm_activity_types(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.orders(id),
  lead_id uuid REFERENCES public.people(id),
  contact_id uuid REFERENCES public.people(id),
  contact_name text,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  completed_at timestamptz,
  assigned_to_id uuid,
  assigned_to_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_crm_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_crm_activities_tenant ON public.plg_crm_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_crm_activities_deal ON public.plg_crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_plg_crm_activities_lead ON public.plg_crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_plg_crm_activities_due ON public.plg_crm_activities(tenant_id, due_date);
`

export const MIGRATION_003_CRM_VIEWS_RLS = `-- CRM plugin — companion SQL (functions/views/RLS Drizzle doesn't diff).
-- Tables come from the Drizzle schema (src/schema/); this is everything else the
-- plugin's data provider depends on: RLS policies + grants + the read-views.
-- Idempotent. Canonical RLS form: tenant_id IN (SELECT public.user_tenant_ids()).

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'plg_crm_pipelines','plg_crm_pipeline_stages','plg_crm_lead_sources','plg_crm_tags',
    'plg_crm_deal_extensions','plg_crm_activity_types','plg_crm_activities'
  ])
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

-- v_leads: public.people (kind='lead')
CREATE OR REPLACE VIEW public.v_leads WITH (security_invoker=true) AS
SELECT
  p.id, p.tenant_id, p.name, p.email, p.phone, p.notes, p.tags, p.is_active,
  p.metadata->>'company'       AS company,
  p.metadata->>'sourceId'      AS source_id,
  p.metadata->>'sourceName'    AS source_name,
  COALESCE(p.metadata->>'status','new') AS lead_status,
  p.metadata->>'value'         AS lead_value,
  p.metadata->>'assignedToId'  AS assigned_to_id,
  p.created_at, p.updated_at
FROM public.people p
WHERE p.kind = 'lead';
GRANT SELECT ON public.v_leads TO authenticated;

-- v_deals: public.orders (kind='deal') JOIN plg_crm_deal_extensions JOIN plg_crm_pipeline_stages
CREATE OR REPLACE VIEW public.v_deals WITH (security_invoker=true) AS
SELECT
  o.id, o.tenant_id, o.status,
  o.total AS value, o.notes AS title,
  o.party_id AS contact_id, o.assignee_id AS assigned_to_id, o.tags,
  o.metadata->>'contactName' AS contact_name,
  o.created_at, o.updated_at,
  de.pipeline_id, de.stage_id, de.probability, de.expected_close_date,
  de.lead_id, de.lost_reason,
  ps.name AS stage_name, ps.color AS stage_color, ps."order" AS stage_order
FROM public.orders o
LEFT JOIN public.plg_crm_deal_extensions de ON de.order_id = o.id
LEFT JOIN public.plg_crm_pipeline_stages ps ON ps.id = de.stage_id
WHERE o.kind = 'deal';
GRANT SELECT ON public.v_deals TO authenticated;
`

export const MIGRATION_004_SEED_DEFAULT_PIPELINE = `-- CRM plugin — seed: default "Sales Pipeline" + canonical stages.
-- The pipeline board (#/sales/pipeline) reads public.plg_crm_pipelines / plg_crm_pipeline_stages
-- directly; a fresh tenant has zero rows and the board renders blank. This
-- backfills the default pipeline (matching the plugin's mock/offline provider)
-- for every tenant that has none. Idempotent — tenants with a pipeline are skipped.
-- Plugin-owned so EVERY app gets it on install (not re-authored per app).

DO $$
DECLARE
  t_id uuid;
  p_id uuid;
BEGIN
  FOR t_id IN (
    SELECT id FROM public.tenants
    WHERE id NOT IN (SELECT tenant_id FROM public.plg_crm_pipelines)
  )
  LOOP
    INSERT INTO public.plg_crm_pipelines (tenant_id, name, is_default, is_active)
    VALUES (t_id, 'Sales Pipeline', true, true)
    RETURNING id INTO p_id;

    INSERT INTO public.plg_crm_pipeline_stages (tenant_id, pipeline_id, name, "order", color, probability, is_won, is_lost) VALUES
      (t_id, p_id, 'New',         0, '#6366f1', 10,  false, false),
      (t_id, p_id, 'Contacted',   1, '#3b82f6', 25,  false, false),
      (t_id, p_id, 'Qualified',   2, '#f59e0b', 50,  false, false),
      (t_id, p_id, 'Proposal',    3, '#f97316', 75,  false, false),
      (t_id, p_id, 'Negotiation', 4, '#8b5cf6', 90,  false, false),
      (t_id, p_id, 'Won',         5, '#22c55e', 100, true,  false),
      (t_id, p_id, 'Lost',        6, '#ef4444', 0,   false, true);
  END LOOP;
END $$;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_crm_base", sql: MIGRATION_001_CRM_BASE },
  { id: "002_activities", sql: MIGRATION_002_ACTIVITIES },
  { id: "003_crm_views_rls", sql: MIGRATION_003_CRM_VIEWS_RLS },
  { id: "004_seed_default_pipeline", sql: MIGRATION_004_SEED_DEFAULT_PIPELINE },
]
