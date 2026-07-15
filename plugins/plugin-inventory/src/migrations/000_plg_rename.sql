-- 000_plg_rename.sql — rename legacy inventory tables to plg_inventory_* for pools
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
