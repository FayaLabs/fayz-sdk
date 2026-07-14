-- CRM Plugin: Activities & Tasks

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
