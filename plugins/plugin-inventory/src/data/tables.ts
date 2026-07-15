// Central physical-table-name registry for plugin-inventory.
export const T = {
  stockLocations: 'plg_inventory_stock_locations',
  stockMovements: 'plg_inventory_stock_movements',
  stockPositions: 'plg_inventory_stock_positions',
  recipes: 'plg_inventory_recipes',
  recipeIngredients: 'plg_inventory_recipe_ingredients',
  measurementUnits: 'plg_inventory_measurement_units',
  productCategories: 'plg_inventory_product_categories',
} as const
