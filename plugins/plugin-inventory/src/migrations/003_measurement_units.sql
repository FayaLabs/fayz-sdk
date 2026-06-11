-- Inventory Plugin: Measurement Units

CREATE TABLE IF NOT EXISTS public.measurement_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  abbreviation text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_measurement_units_tenant ON public.measurement_units(tenant_id);
