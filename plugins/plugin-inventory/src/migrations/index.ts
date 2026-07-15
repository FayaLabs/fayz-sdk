// AUTO-GENERATED from 000_plg_rename.sql, 001_inventory_base.sql, 002_recipes.sql, 003_measurement_units.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_000_PLG_RENAME = `-- 000_plg_rename.sql — rename legacy inventory tables to plg_inventory_* for pools
-- provisioned before the industry-pool rename. Guarded: fires only when the legacy
-- name exists and the target does not, so fresh pools skip every branch.
DO $$
BEGIN
  IF to_regclass('public.stock_locations') IS NOT NULL AND to_regclass('public.plg_inventory_stock_locations') IS NULL THEN
    ALTER TABLE public.stock_locations RENAME TO plg_inventory_stock_locations;
  END IF;
  IF to_regclass('public.stock_movements') IS NOT NULL AND to_regclass('public.plg_inventory_stock_movements') IS NULL THEN
    ALTER TABLE public.stock_movements RENAME TO plg_inventory_stock_movements;
  END IF;
  IF to_regclass('public.stock_positions') IS NOT NULL AND to_regclass('public.plg_inventory_stock_positions') IS NULL THEN
    ALTER TABLE public.stock_positions RENAME TO plg_inventory_stock_positions;
  END IF;
  IF to_regclass('public.recipes') IS NOT NULL AND to_regclass('public.plg_inventory_recipes') IS NULL THEN
    ALTER TABLE public.recipes RENAME TO plg_inventory_recipes;
  END IF;
  IF to_regclass('public.recipe_ingredients') IS NOT NULL AND to_regclass('public.plg_inventory_recipe_ingredients') IS NULL THEN
    ALTER TABLE public.recipe_ingredients RENAME TO plg_inventory_recipe_ingredients;
  END IF;
  IF to_regclass('public.measurement_units') IS NOT NULL AND to_regclass('public.plg_inventory_measurement_units') IS NULL THEN
    ALTER TABLE public.measurement_units RENAME TO plg_inventory_measurement_units;
  END IF;
  IF to_regclass('public.product_categories') IS NOT NULL AND to_regclass('public.plg_inventory_product_categories') IS NULL THEN
    ALTER TABLE public.product_categories RENAME TO plg_inventory_product_categories;
  END IF;
END $$;
`

export const MIGRATION_001_INVENTORY_BASE = `-- Inventory Plugin: Base Tables
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
`

export const MIGRATION_002_RECIPES = `-- Inventory Plugin: Recipes & Technical Specs

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
`

export const MIGRATION_003_MEASUREMENT_UNITS = `-- Inventory Plugin: Measurement Units

CREATE TABLE IF NOT EXISTS public.plg_inventory_measurement_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  abbreviation text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_inventory_measurement_units ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_inventory_measurement_units_tenant ON public.plg_inventory_measurement_units(tenant_id);
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "000_plg_rename", sql: MIGRATION_000_PLG_RENAME },
  { id: "001_inventory_base", sql: MIGRATION_001_INVENTORY_BASE },
  { id: "002_recipes", sql: MIGRATION_002_RECIPES },
  { id: "003_measurement_units", sql: MIGRATION_003_MEASUREMENT_UNITS },
]
