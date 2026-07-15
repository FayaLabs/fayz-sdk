-- Inventory Plugin: Base Tables
-- Products use public.products archetype directly
-- These are plugin-specific extension tables

CREATE TABLE IF NOT EXISTS public.plg_inventory_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.plg_inventory_product_categories(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_product_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_product_categories_tenant ON public.plg_inventory_product_categories(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_inventory_stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_stock_locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_stock_locations_tenant ON public.plg_inventory_stock_locations(tenant_id);

CREATE TABLE IF NOT EXISTS public.plg_inventory_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(14,4) NOT NULL,
  movement_type text NOT NULL,
  unit_cost numeric(14,2) DEFAULT 0,
  total_cost numeric(14,2) DEFAULT 0,
  stock_location_id uuid REFERENCES public.plg_inventory_stock_locations(id),
  destination_location_id uuid REFERENCES public.plg_inventory_stock_locations(id),
  supplier_id uuid REFERENCES public.people(id),
  document_number text,
  reason text,
  notes text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid,
  batch_number text,
  expiration_date date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_stock_movements_tenant ON public.plg_inventory_stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_inventory_stock_movements_product ON public.plg_inventory_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_plg_inventory_stock_movements_date ON public.plg_inventory_stock_movements(tenant_id, movement_date);

CREATE TABLE IF NOT EXISTS public.plg_inventory_stock_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(14,4) NOT NULL,
  unit_cost numeric(14,2) DEFAULT 0,
  stock_location_id uuid REFERENCES public.plg_inventory_stock_locations(id),
  batch_number text,
  expiration_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_stock_positions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_stock_positions_tenant ON public.plg_inventory_stock_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_inventory_stock_positions_product ON public.plg_inventory_stock_positions(product_id);
