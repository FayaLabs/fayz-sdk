-- Inventory Plugin: Recipes & Technical Specs

CREATE TABLE IF NOT EXISTS public.plg_inventory_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  product_id uuid REFERENCES public.products(id),
  yield_quantity numeric(14,4) DEFAULT 1,
  yield_unit_id uuid,
  preparation_time_minutes integer,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_recipes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_recipes_tenant ON public.plg_inventory_recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_inventory_recipes_product ON public.plg_inventory_recipes(product_id);

CREATE TABLE IF NOT EXISTS public.plg_inventory_recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.plg_inventory_recipes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(14,4) NOT NULL,
  unit_id uuid,
  display_order integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_recipe_ingredients_tenant ON public.plg_inventory_recipe_ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_inventory_recipe_ingredients_recipe ON public.plg_inventory_recipe_ingredients(recipe_id);
