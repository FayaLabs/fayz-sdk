-- Financial Plugin: Chart of Accounts + Cost Centers

CREATE TABLE IF NOT EXISTS public.plg_financial_chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  node_type text NOT NULL DEFAULT 'leaf',
  parent_id uuid REFERENCES public.plg_financial_chart_of_accounts(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_chart_of_accounts_tenant ON public.plg_financial_chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_financial_chart_of_accounts_parent ON public.plg_financial_chart_of_accounts(parent_id);

CREATE TABLE IF NOT EXISTS public.plg_financial_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_financial_cost_centers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_financial_cost_centers_tenant ON public.plg_financial_cost_centers(tenant_id);
