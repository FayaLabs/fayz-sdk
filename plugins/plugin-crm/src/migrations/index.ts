// AUTO-GENERATED from 000_plg_rename.sql, 001_crm_base.sql, 002_activities.sql, 003_crm_views_rls.sql, 004_seed_default_pipeline.sql, 005_public_lead.sql, 006_lead_enters_pipeline.sql — regenerate with scripts/embed-migrations.mjs
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

export const MIGRATION_005_PUBLIC_LEAD = `-- plugin-crm 005: anon-safe lead capture from public sites.
--
-- The counterpart of agenda's create_public_booking: a marketing site posts a
-- form and a lead lands in the CRM of the right tenant. Same shape of trust —
-- the caller is an anonymous browser holding only a publishable key, so every
-- decision that matters (which tenant, which status, whether it is spam) is
-- made here and cannot be set by the caller.
--
-- Why p_fields jsonb: every landing page asks something different (hair
-- coverage on one, discount coupon on another, subject/message on a third).
-- Modelling those as columns means a migration per campaign — the site this was
-- built for already had 22 columns on its lead table. They go to people.metadata
-- under 'fields', which v_leads already reads from, so a new form ships with
-- zero schema change.

CREATE OR REPLACE FUNCTION public.create_public_lead(
  p_tenant_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_form_id text DEFAULT NULL,
  p_form_name text DEFAULT NULL,
  p_fields jsonb DEFAULT '{}'::jsonb,
  p_notes text DEFAULT NULL,
  p_utm jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(lead_id uuid, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_person_id uuid;
  v_phone text;
  v_email text;
  v_fields jsonb;
  v_utm jsonb;
  v_recent int;
BEGIN
  -- ---------------------------------------------------------------------
  -- validation: anon-callable, so everything is checked here
  -- ---------------------------------------------------------------------
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;

  v_phone := NULLIF(regexp_replace(COALESCE(p_phone, ''), '\\D', '', 'g'), '');
  IF v_phone IS NOT NULL AND length(v_phone) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;

  v_email := NULLIF(trim(COALESCE(p_email, '')), '');
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$') THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  -- a lead with no way to reach them back is not a lead
  IF v_phone IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'phone or email required';
  END IF;

  PERFORM 1 FROM tenants t WHERE t.id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown tenant'; END IF;

  -- ---------------------------------------------------------------------
  -- custom fields: object-only, bounded, and scalars only.
  -- Bounding the payload keeps a hostile caller from parking documents in
  -- the CRM; flattening nested values keeps the detail panel renderable.
  -- ---------------------------------------------------------------------
  v_fields := COALESCE(p_fields, '{}'::jsonb);
  IF jsonb_typeof(v_fields) <> 'object' THEN
    RAISE EXCEPTION 'fields must be an object';
  END IF;
  IF length(v_fields::text) > 8000 THEN
    RAISE EXCEPTION 'fields too large';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(v_fields)) > 40 THEN
    RAISE EXCEPTION 'too many fields';
  END IF;

  v_utm := COALESCE(p_utm, '{}'::jsonb);
  IF jsonb_typeof(v_utm) <> 'object' OR length(v_utm::text) > 2000 THEN
    RAISE EXCEPTION 'invalid utm';
  END IF;

  -- ---------------------------------------------------------------------
  -- anti-spam: same tenant + same contact + same form, twice in 5 minutes is
  -- a double-click or a bot, not two inquiries. Repeat interest days later IS
  -- a new lead, so this window stays deliberately short.
  -- ---------------------------------------------------------------------
  SELECT count(*) INTO v_recent
  FROM people p
  WHERE p.tenant_id = p_tenant_id
    AND p.kind = 'lead'
    AND p.created_at > now() - interval '5 minutes'
    AND COALESCE(p.metadata->>'formId', '') = COALESCE(p_form_id, '')
    AND (
      (v_phone IS NOT NULL AND p.phone = v_phone)
      OR (v_email IS NOT NULL AND p.email = v_email)
    );
  IF v_recent > 0 THEN
    RAISE EXCEPTION 'duplicate submission';
  END IF;

  -- burst cap per tenant: a flood is never legitimate marketing traffic
  IF (
    SELECT count(*) FROM people p
    WHERE p.tenant_id = p_tenant_id
      AND p.kind = 'lead'
      AND p.created_at > now() - interval '1 minute'
  ) >= 20 THEN
    RAISE EXCEPTION 'too many submissions';
  END IF;

  -- ---------------------------------------------------------------------
  -- the lead. status/kind are hardcoded — the caller cannot promote itself
  -- into a customer or land pre-qualified.
  -- ---------------------------------------------------------------------
  INSERT INTO people (tenant_id, kind, name, phone, email, notes, tags, is_active, metadata)
  VALUES (
    p_tenant_id,
    'lead',
    trim(p_name),
    v_phone,
    v_email,
    left(p_notes, 2000),
    ARRAY[]::text[],
    true,
    jsonb_strip_nulls(
      jsonb_build_object(
        'status',     'new',
        'source',     'public_form',
        'sourceName', COALESCE(NULLIF(trim(COALESCE(p_form_name, '')), ''), 'Site'),
        'formId',     NULLIF(trim(COALESCE(p_form_id, '')), ''),
        'fields',     v_fields,
        'utm',        CASE WHEN v_utm = '{}'::jsonb THEN NULL ELSE v_utm END
      )
    )
  )
  RETURNING id, people.created_at INTO v_person_id, created_at;

  lead_id := v_person_id;
  RETURN NEXT;
END;
$function$;

-- anon: the whole point. authenticated too, so a logged-in visitor on the same
-- site takes the identical path.
GRANT EXECUTE ON FUNCTION public.create_public_lead(uuid, text, text, text, text, text, jsonb, text, jsonb)
  TO anon, authenticated;

-- Leads are read through v_leads, which is tenant-scoped by RLS on people.
-- No anon SELECT is granted here: a public form writes, it never reads back.
CREATE INDEX IF NOT EXISTS idx_people_lead_tenant_created
  ON public.people (tenant_id, created_at DESC)
  WHERE kind = 'lead';

-- ---------------------------------------------------------------------------
-- v_leads gains the custom-field payload.
--
-- Without this the whole abstraction is write-only: a form's answers reach
-- people.metadata and no CRM screen can read them back. Columns are APPENDED
-- (CREATE OR REPLACE VIEW cannot reorder or drop), and the view keeps
-- security_invoker=true so people's RLS still scopes rows per tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_leads
WITH (security_invoker = true) AS
SELECT id,
    tenant_id,
    name,
    email,
    phone,
    notes,
    tags,
    is_active,
    (metadata ->> 'company'::text) AS company,
    (metadata ->> 'sourceId'::text) AS source_id,
    (metadata ->> 'sourceName'::text) AS source_name,
    COALESCE((metadata ->> 'status'::text), 'new'::text) AS lead_status,
    (metadata ->> 'value'::text) AS lead_value,
    (metadata ->> 'assignedToId'::text) AS assigned_to_id,
    created_at,
    updated_at,
    -- appended:
    (metadata ->> 'formId'::text) AS form_id,
    COALESCE(metadata -> 'fields'::text, '{}'::jsonb) AS custom_fields,
    COALESCE(metadata -> 'utm'::text, '{}'::jsonb) AS utm
   FROM people p
  WHERE (kind = 'lead'::text);
`

export const MIGRATION_006_LEAD_ENTERS_PIPELINE = `-- plugin-crm 006: every lead lands on the board, guaranteed by the database.
--
-- The bug this closes: the leads LIST reads v_leads (public.people WHERE
-- kind='lead') while the PIPELINE reads v_deals (public.orders WHERE kind='deal'
-- + plg_crm_deal_extensions). A lead is a person; a card is an order. Nothing
-- created the second from the first — create_public_lead never touches orders —
-- so form leads landed in the list and the board stayed empty. Forever, not
-- intermittently. plg_crm_deal_extensions.lead_id has existed since 001 and was
-- NULL on every row in the pool: the link was designed and never wired.
--
-- Why a TRIGGER and not application code: a lead reaches people through at
-- least four independent writers today — the anon RPC create_public_lead, the
-- agent's generic createRecord, CSV import, and the CRM's own form. Putting the
-- board insert in any one of them leaves the other three silently broken, and
-- the next writer added leaves a fifth. Here it cannot be forgotten or bypassed,
-- including by a direct SQL insert.
--
-- Idempotent by construction: a UNIQUE index on deal_extensions.lead_id means a
-- second attempt for the same lead is a no-op, so re-running the backfill or
-- replaying the migration cannot double-card anyone.

-- ---------------------------------------------------------------------------
-- 1. One card per lead, enforced by the database rather than by the trigger
--    remembering to check.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS plg_crm_deal_extensions_lead_idx
  ON public.plg_crm_deal_extensions (lead_id) WHERE lead_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 1b. The default board, as a callable function instead of 004's one-shot loop.
--     Same pipeline and stages 004 seeds; idempotent per tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_seed_default_pipeline(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pipeline uuid;
BEGIN
  SELECT id INTO v_pipeline
    FROM public.plg_crm_pipelines
   WHERE tenant_id = p_tenant_id
   ORDER BY is_default DESC, created_at ASC
   LIMIT 1;
  IF v_pipeline IS NOT NULL THEN
    RETURN v_pipeline;
  END IF;

  INSERT INTO public.plg_crm_pipelines (tenant_id, name, is_default, is_active)
  VALUES (p_tenant_id, 'Sales Pipeline', true, true)
  RETURNING id INTO v_pipeline;

  INSERT INTO public.plg_crm_pipeline_stages
    (tenant_id, pipeline_id, name, "order", color, probability, is_won, is_lost)
  VALUES
    (p_tenant_id, v_pipeline, 'New',         0, '#6366f1', 10,  false, false),
    (p_tenant_id, v_pipeline, 'Contacted',   1, '#3b82f6', 25,  false, false),
    (p_tenant_id, v_pipeline, 'Qualified',   2, '#f59e0b', 50,  false, false),
    (p_tenant_id, v_pipeline, 'Proposal',    3, '#f97316', 75,  false, false),
    (p_tenant_id, v_pipeline, 'Negotiation', 4, '#8b5cf6', 90,  false, false),
    (p_tenant_id, v_pipeline, 'Won',         5, '#22c55e', 100, true,  false),
    (p_tenant_id, v_pipeline, 'Lost',        6, '#ef4444', 0,   false, true);

  RETURN v_pipeline;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. The lead → card projection, shared by the trigger and the backfill so the
--    two can never drift apart.
--
--    Placement is the tenant's DEFAULT pipeline, lowest \`order\` stage that is
--    neither won nor lost (the "New" column). A tenant with no pipeline yet is
--    skipped rather than failing: the lead must still be captured — losing a
--    real customer enquiry because a board was not configured would be a far
--    worse bug than a missing card. 004 seeds a default pipeline for every
--    tenant, so this is the empty-tenant edge, not the normal path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_place_lead_on_board(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead     public.people%ROWTYPE;
  v_pipeline uuid;
  v_stage    uuid;
  v_prob     numeric;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_lead FROM public.people WHERE id = p_lead_id;
  IF NOT FOUND OR v_lead.kind <> 'lead' THEN
    RETURN NULL;
  END IF;

  -- Already on the board (re-run, or a card made by hand): nothing to do.
  IF EXISTS (SELECT 1 FROM public.plg_crm_deal_extensions WHERE lead_id = p_lead_id) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_pipeline
    FROM public.plg_crm_pipelines
   WHERE tenant_id = v_lead.tenant_id
   ORDER BY is_default DESC, created_at ASC
   LIMIT 1;

  -- No board yet? Build the default one and carry on.
  --
  -- 004 seeds the default pipeline as a ONE-SHOT backfill with no trigger, so
  -- every tenant created after it ran has none — 3 of the 8 tenants in this pool
  -- were in that state. Their board renders blank no matter how many leads
  -- arrive, and it would punch a hole straight through the guarantee this
  -- migration exists to make: a lead in such a tenant would be captured and then
  -- silently skipped for want of a stage to sit in.
  --
  -- Seeded here, on demand, rather than from a trigger on public.tenants: the
  -- board is the CRM's own concern, and a plugin has no business attaching
  -- itself to tenant creation in a core table.
  IF v_pipeline IS NULL THEN
    v_pipeline := public.crm_seed_default_pipeline(v_lead.tenant_id);
  END IF;
  IF v_pipeline IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, probability INTO v_stage, v_prob
    FROM public.plg_crm_pipeline_stages
   WHERE pipeline_id = v_pipeline AND NOT is_won AND NOT is_lost
   ORDER BY "order" ASC
   LIMIT 1;
  IF v_stage IS NULL THEN
    RETURN NULL;
  END IF;

  -- The card's money value comes from the lead when the form captured one;
  -- 0 otherwise. \`notes\` is the deal TITLE (v_deals maps o.notes -> title), so
  -- it carries the lead's name, not the lead's message.
  INSERT INTO public.orders (
    tenant_id, kind, status, total, currency, party_id, notes, tags, metadata
  ) VALUES (
    v_lead.tenant_id,
    'deal',
    'open',
    COALESCE((v_lead.metadata ->> 'value')::numeric, 0),
    'BRL',
    v_lead.id,
    v_lead.name,
    COALESCE(v_lead.tags, '{}'),
    jsonb_build_object(
      'contactName', v_lead.name,
      'createdFrom', 'lead',
      -- Which form produced it, when there was one: lets the board be filtered
      -- by campaign without re-joining people.
      'formId', v_lead.metadata ->> 'formId'
    )
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.plg_crm_deal_extensions (
    order_id, tenant_id, pipeline_id, stage_id, probability, lead_id
  ) VALUES (
    v_order_id, v_lead.tenant_id, v_pipeline, v_stage, COALESCE(v_prob, 0), v_lead.id
  )
  -- Concurrent inserts for the same lead: the unique index above turns the
  -- loser into a no-op instead of an error the trigger would propagate back to
  -- the form submission.
  ON CONFLICT (lead_id) WHERE lead_id IS NOT NULL DO NOTHING;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.crm_place_lead_on_board(uuid) IS
  'Projects a people row of kind=lead onto the tenant default pipeline as an orders(kind=deal) + deal_extension. Idempotent per lead.';

-- ---------------------------------------------------------------------------
-- 3. The trigger. AFTER INSERT so a failure here can never roll back the lead
--    itself, and EXCEPTION-guarded for the same reason: capturing the enquiry
--    is the part that must not fail. A board that missed a card is recoverable
--    (step 4 re-runs); a lost lead is not.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_lead_to_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.kind = 'lead' THEN
    BEGIN
      PERFORM public.crm_place_lead_on_board(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'crm_lead_to_board: lead % captured but not placed on the board: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS people_lead_to_board ON public.people;
CREATE TRIGGER people_lead_to_board
  AFTER INSERT ON public.people
  FOR EACH ROW
  WHEN (NEW.kind = 'lead')
  EXECUTE FUNCTION public.crm_lead_to_board();

-- A person PROMOTED to lead later (kind edited from contact/customer) must land
-- on the board too — otherwise the guarantee holds only for the insert path.
DROP TRIGGER IF EXISTS people_promoted_to_lead_to_board ON public.people;
CREATE TRIGGER people_promoted_to_lead_to_board
  AFTER UPDATE OF kind ON public.people
  FOR EACH ROW
  WHEN (NEW.kind = 'lead' AND OLD.kind IS DISTINCT FROM 'lead')
  EXECUTE FUNCTION public.crm_lead_to_board();

-- ---------------------------------------------------------------------------
-- 4. Realtime, so an open board updates itself instead of waiting for a reload.
--
--    The trigger above writes the card with no client involved, so the browser
--    has nothing to react to unless the change is streamed. The pool's
--    supabase_realtime publication was EMPTY — every .subscribe() in the SDK
--    was silently receiving nothing — so the table is added explicitly rather
--    than assumed. FOR EACH ROW replica identity stays default (PK): the
--    handler refetches the board, so the payload's contents are irrelevant.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'plg_crm_deal_extensions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plg_crm_deal_extensions;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Backfill every lead that predates the trigger. Idempotent via step 2's
--    own guard, so replaying this migration adds nothing.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT p.id
      FROM public.people p
      LEFT JOIN public.plg_crm_deal_extensions de ON de.lead_id = p.id
     WHERE p.kind = 'lead' AND de.id IS NULL
     ORDER BY p.created_at
  LOOP
    IF public.crm_place_lead_on_board(r.id) IS NOT NULL THEN
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'crm 006 backfill: % lead(s) placed on the board', n;
END $$;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_crm_base", sql: MIGRATION_001_CRM_BASE },
  { id: "002_activities", sql: MIGRATION_002_ACTIVITIES },
  { id: "003_crm_views_rls", sql: MIGRATION_003_CRM_VIEWS_RLS },
  { id: "004_seed_default_pipeline", sql: MIGRATION_004_SEED_DEFAULT_PIPELINE },
  { id: "005_public_lead", sql: MIGRATION_005_PUBLIC_LEAD },
  { id: "006_lead_enters_pipeline", sql: MIGRATION_006_LEAD_ENTERS_PIPELINE },
]
