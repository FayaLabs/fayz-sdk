// ---------------------------------------------------------------------------
// Inventory Plugin — Pure TypeScript types
// Zero dependencies. Abstracted from beautyplace Estoque module.
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

/** Product classification — a product can have multiple types */
export type ProductType = 'ingredient' | 'sale' | 'intermediate' | 'asset'

/** Stock movement direction/reason */
export type MovementType = 'entry' | 'exit' | 'adjustment' | 'transfer' | 'loss'

/** Product purpose for filtering */
export type ProductPurpose = 'purchase' | 'sale' | 'both' | 'internal'

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  brand?: string
  categoryId?: string
  categoryName?: string
  productType: ProductType
  purpose?: ProductPurpose
  currentQuantity: number
  minQuantity: number
  maxQuantity?: number
  costPrice: number
  salePrice?: number
  measurementUnitId?: string
  measurementUnitName?: string
  isActive: boolean
  supplierId?: string
  supplierName?: string
  defaultLocationId?: string
  imageUrl?: string
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  productName?: string
  quantity: number
  movementType: MovementType
  unitCost: number
  totalCost: number
  stockLocationId?: string
  stockLocationName?: string
  destinationLocationId?: string
  destinationLocationName?: string
  supplierId?: string
  supplierName?: string
  documentNumber?: string
  reason?: string
  notes?: string
  movementDate: string
  userId?: string
  userName?: string
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
}

export interface StockPosition {
  id: string
  productId: string
  productName?: string
  quantity: number
  unitCost: number
  stockLocationId?: string
  stockLocationName?: string
  batchNumber?: string
  expirationDate?: string
  tenantId: string
  createdAt: string
}

export interface StockLocation {
  id: string
  name: string
  description?: string
  isActive: boolean
  unitId?: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface Recipe {
  id: string
  name: string
  description?: string
  productId: string
  productName?: string
  yieldQuantity: number
  yieldUnitId?: string
  yieldUnitName?: string
  preparationTimeMinutes?: number
  instructions?: string
  isActive: boolean
  ingredientCount?: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface RecipeIngredient {
  id: string
  recipeId: string
  productId: string
  productName?: string
  quantity: number
  unitId?: string
  unitName?: string
  displayOrder: number
  notes?: string
  createdAt: string
}

export interface MeasurementUnit {
  id: string
  name: string
  abbreviation: string
  isActive: boolean
  tenantId: string
  createdAt: string
}

export interface ProductCategory {
  id: string
  name: string
  parentId?: string
  isActive: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateProductInput {
  name: string
  description?: string
  sku?: string
  barcode?: string
  brand?: string
  categoryId?: string
  productType: ProductType
  purpose?: ProductPurpose
  minQuantity?: number
  maxQuantity?: number
  costPrice?: number
  salePrice?: number
  measurementUnitId?: string
  supplierId?: string
  defaultLocationId?: string
  imageUrl?: string
  metadata?: Record<string, unknown>
}

export interface CreateStockMovementInput {
  productId: string
  quantity: number
  movementType: MovementType
  unitCost?: number
  stockLocationId?: string
  destinationLocationId?: string
  supplierId?: string
  documentNumber?: string
  reason?: string
  notes?: string
  movementDate?: string
  batchNumber?: string
  expirationDate?: string
}

export interface CreateRecipeInput {
  name: string
  description?: string
  productId: string
  yieldQuantity: number
  yieldUnitId?: string
  preparationTimeMinutes?: number
  instructions?: string
  ingredients: CreateRecipeIngredientInput[]
}

export interface CreateRecipeIngredientInput {
  productId: string
  quantity: number
  unitId?: string
  displayOrder?: number
  notes?: string
}

// ============================================================
// QUERY / FILTER TYPES
// ============================================================

export interface DateRange {
  from: string
  to: string
}

export interface ProductQuery {
  productType?: ProductType
  categoryId?: string
  search?: string
  lowStockOnly?: boolean
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface MovementQuery {
  productId?: string
  movementType?: MovementType | MovementType[]
  stockLocationId?: string
  dateRange?: DateRange
  search?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ============================================================
// AGGREGATION TYPES
// ============================================================

export interface InventorySummary {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  totalStockValue: number
  recentMovementCount: number
  movementsByType: Record<MovementType, number>
}
