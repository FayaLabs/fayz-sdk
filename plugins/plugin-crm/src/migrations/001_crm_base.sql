-- CRM Plugin: Base Tables
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
