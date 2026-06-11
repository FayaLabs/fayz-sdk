-- Inventory Plugin: Recipes & Technical Specs

CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  product_id uuid REFERENCES saas_core.products(id),
  yield_quantity numeric(14,4) DEFAULT 1,
  yield_unit_id uuid,
  preparation_time_minutes integer,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON public.recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON public.recipes(product_id);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES saas_core.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES saas_core.products(id),
  quantity numeric(14,4) NOT NULL,
  unit_id uuid,
  display_order integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_tenant ON public.recipe_ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
