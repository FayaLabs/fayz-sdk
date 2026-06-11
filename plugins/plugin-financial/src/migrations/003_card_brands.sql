-- Financial Plugin: Card Brands

CREATE TABLE IF NOT EXISTS public.card_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.card_brands ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_card_brands_tenant ON public.card_brands(tenant_id);
