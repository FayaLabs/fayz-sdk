# Inventory Plugin

Product catalog, stock management, movement tracking, and recipe/production formulas for any SaaS vertical.

## Quick Start

```typescript
import { createInventoryPlugin } from '@fayz/saas-core/plugins/inventory'

// In your createSaasApp config:
plugins: [
  createInventoryPlugin({
    currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  }),
]
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modules.recipes` | boolean | true | Production recipes/technical specs |
| `modules.stockLocations` | boolean | true | Multi-location stock |
| `modules.batchTracking` | boolean | false | Batch numbers + expiry dates |
| `productTypes` | array | ingredient, sale, intermediate, asset | Available product classifications |
| `currency` | object | BRL/pt-BR | Currency code, locale, symbol |
| `locations` | array | [] | Business units (shows unit picker when 1+) |
| `dataProvider` | InventoryDataProvider | mock | Custom data provider |
| `navPosition` | number | 4 | Navigation order |

## Architecture

```
src/plugins/inventory/
  index.ts                    # createInventoryPlugin() factory
  types.ts                    # Pure TS domain types (zero deps)
  registries.ts               # CRUD entities: units, categories, locations
  store.ts                    # Zustand UI state + provider actions
  InventoryContext.tsx         # React contexts: config, provider, store
  InventoryPage.tsx            # Main page with ModulePage layout
  data/
    types.ts                  # InventoryDataProvider interface
    mock.ts                   # In-memory mock provider
  views/                      # Dashboard, Products, Stock, Recipes
  components/                 # Settings, onboarding
  migrations/                 # SQL migration files
```

### Data Flow

Same pattern as the Financial plugin:

```
createInventoryPlugin(options)
  → resolves config
  → creates provider (mock or custom)
  → creates zustand store
  → returns PluginManifest

InventoryPage
  → InventoryContextProvider wraps all views
  → useModuleNavigation for view switching + animations
  → views call useInventoryStore(selector) for data
```

## Type System

### Product Types

Products are classified by type — a product can be one type at a time:

| Type | Description | Example |
|------|-------------|---------|
| `ingredient` | Raw material consumed in production | Hair dye, flour |
| `sale` | Sold directly to customers | Shampoo bottle, menu item |
| `intermediate` | Produced internally from ingredients | Pre-mixed color, dough |
| `asset` | Fixed asset for patrimony tracking | Equipment, furniture |

The `productTypes` option lets verticals customize available types:

```typescript
// Restaurant — simplified types
createInventoryPlugin({
  productTypes: [
    { value: 'ingredient', label: 'Ingredient' },
    { value: 'sale', label: 'Menu Item' },
  ],
})
```

### Stock Movements

| Movement Type | Direction | Description |
|--------------|-----------|-------------|
| `entry` | +quantity | Receiving goods from supplier |
| `exit` | -quantity | Using/selling goods |
| `adjustment` | +/- | Quantity correction after audit |
| `transfer` | neutral | Between stock locations |
| `loss` | -quantity | Waste, damage, or expiry |

### Core Entities

| Entity | Purpose |
|--------|---------|
| `Product` | Master product with type, pricing, stock levels |
| `StockMovement` | Transaction log: entries, exits, adjustments |
| `StockPosition` | Physical inventory by location + batch + expiry |
| `StockLocation` | Warehouses, storage areas |
| `Recipe` | Production formula for intermediate/final products |
| `RecipeIngredient` | What goes into a recipe |
| `MeasurementUnit` | Units of measure (kg, L, unit, box) |
| `ProductCategory` | Hierarchical product organization |

## Registries (Plugin Settings)

Accessible via gear icon or global Settings > Inventory tab:

| Registry | Seed Data |
|----------|-----------|
| Measurement Units | Unit, Box, Kg, g, L, mL |
| Product Categories | — |
| Stock Locations | — |

## Database Migrations

Run in order:

1. `001_inventory_base.sql` — product_categories, stock_locations, products, stock_movements, stock_positions
2. `002_recipes.sql` — recipes, recipe_ingredients
3. `003_measurement_units.sql` — measurement_units

All tables use `tenant_id` for multi-tenant isolation.

## Views

| View | Route suffix | Description |
|------|-------------|-------------|
| Dashboard | `/inventory` | KPIs: total products, low stock, stock value |
| Products List | `/inventory/products/list` | Filterable by type |
| Products New | `/inventory/products/new` | Create product |
| Stock Entry | `/inventory/stock/entry` | Record goods received |
| Stock Exit | `/inventory/stock/exit` | Record goods consumed |
| Stock History | `/inventory/stock/history` | Movement log |
| Recipes | `/inventory/recipes/list` | Production formulas |
| Settings | `/inventory/settings/*` | Registry management |

## Extending

### Custom Data Provider

```typescript
import type { InventoryDataProvider } from '@fayz/saas-core/plugins/inventory'

const supabaseProvider: InventoryDataProvider = {
  async getProducts(query) { /* Supabase query */ },
  async createMovement(input) { /* Supabase insert + trigger */ },
  // ... implement all methods
}

createInventoryPlugin({ dataProvider: supabaseProvider })
```

### Future: Unit Conversion System

The types support multi-unit products (base unit, content unit, purchase unit) following the beautyplace pattern. Example:

```
Shampoo bottle (base: UNIT)
  - Content: 300mL per unit
  - Purchase: BOX of 12 units
```

This will be implemented when the Supabase provider is built.

### Future: DANFE/NF-e Import

Invoice XML import for automatic stock entry — will be added as a sub-module.
