import type { InventoryDataProvider } from './types'
import type {
  Product, StockMovement, StockPosition, StockLocation,
  Recipe, RecipeIngredient,
  CreateProductInput, CreateStockMovementInput, CreateRecipeInput,
  ProductQuery, MovementQuery,
  PaginatedResult, InventorySummary, MovementType,
} from '../types'

let nextId = 1
function uid(): string { return String(nextId++) }
function now(): string { return new Date().toISOString() }
function today(): string { return new Date().toISOString().slice(0, 10) }

function paginate<T>(items: T[], page?: number, pageSize?: number): PaginatedResult<T> {
  const p = page ?? 1
  const ps = pageSize ?? 50
  const start = (p - 1) * ps
  return { data: items.slice(start, start + ps), total: items.length }
}

interface MockStore {
  products: Product[]
  movements: StockMovement[]
  positions: StockPosition[]
  locations: StockLocation[]
  recipes: Recipe[]
  recipeIngredients: RecipeIngredient[]
}

function createStore(): MockStore {
  return {
    products: [],
    movements: [],
    positions: [],
    locations: [
      { id: uid(), name: 'Main Storage', description: 'Primary storage area', isActive: true, tenantId: 'mock-tenant', createdAt: now(), updatedAt: now() },
    ],
    recipes: [],
    recipeIngredients: [],
  }
}

export function createMockInventoryProvider(): InventoryDataProvider {
  const store = createStore()
  const tenantId = 'mock-tenant'

  const provider: InventoryDataProvider = {
    // --- Products ---
    async getProducts(query: ProductQuery): Promise<PaginatedResult<Product>> {
      let results = [...store.products]
      if (query.productType) results = results.filter((p) => p.productType === query.productType)
      if (query.categoryId) results = results.filter((p) => p.categoryId === query.categoryId)
      if (query.isActive !== undefined) results = results.filter((p) => p.isActive === query.isActive)
      if (query.lowStockOnly) results = results.filter((p) => p.currentQuantity <= p.minQuantity)
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((p) => p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) || p.barcode?.includes(s))
      }
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(results, query.page, query.pageSize)
    },

    async getProductById(id: string): Promise<Product | null> {
      return store.products.find((p) => p.id === id) ?? null
    },

    async createProduct(input: CreateProductInput): Promise<Product> {
      const product: Product = {
        id: uid(),
        name: input.name,
        description: input.description,
        sku: input.sku,
        barcode: input.barcode,
        brand: input.brand,
        categoryId: input.categoryId,
        productType: input.productType,
        purpose: input.purpose,
        currentQuantity: 0,
        minQuantity: input.minQuantity ?? 0,
        maxQuantity: input.maxQuantity,
        costPrice: input.costPrice ?? 0,
        salePrice: input.salePrice,
        measurementUnitId: input.measurementUnitId,
        isActive: true,
        supplierId: input.supplierId,
        defaultLocationId: input.defaultLocationId,
        imageUrl: input.imageUrl,
        metadata: input.metadata,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.products.push(product)
      return product
    },

    async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
      const product = store.products.find((p) => p.id === id)
      if (!product) throw new Error(`Product ${id} not found`)
      Object.assign(product, data, { updatedAt: now() })
      return product
    },

    // --- Stock Movements ---
    async getMovements(query: MovementQuery): Promise<PaginatedResult<StockMovement>> {
      let results = [...store.movements]
      if (query.productId) results = results.filter((m) => m.productId === query.productId)
      if (query.movementType) {
        const types = Array.isArray(query.movementType) ? query.movementType : [query.movementType]
        results = results.filter((m) => types.includes(m.movementType))
      }
      if (query.stockLocationId) results = results.filter((m) => m.stockLocationId === query.stockLocationId)
      if (query.dateRange) {
        results = results.filter((m) => m.movementDate >= query.dateRange!.from && m.movementDate <= query.dateRange!.to)
      }
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((m) => m.productName?.toLowerCase().includes(s) || m.notes?.toLowerCase().includes(s))
      }
      results.sort((a, b) => b.movementDate.localeCompare(a.movementDate))
      return paginate(results, query.page, query.pageSize)
    },

    async createMovement(input: CreateStockMovementInput): Promise<StockMovement> {
      const product = store.products.find((p) => p.id === input.productId)
      const location = input.stockLocationId ? store.locations.find((l) => l.id === input.stockLocationId) : undefined
      const unitCost = input.unitCost ?? product?.costPrice ?? 0

      const movement: StockMovement = {
        id: uid(),
        productId: input.productId,
        productName: product?.name,
        quantity: input.quantity,
        movementType: input.movementType,
        unitCost,
        totalCost: unitCost * input.quantity,
        stockLocationId: input.stockLocationId,
        stockLocationName: location?.name,
        destinationLocationId: input.destinationLocationId,
        supplierId: input.supplierId,
        documentNumber: input.documentNumber,
        reason: input.reason,
        notes: input.notes,
        movementDate: input.movementDate ?? today(),
        tenantId,
        createdAt: now(),
      }
      store.movements.push(movement)

      // Update product quantity
      if (product) {
        if (input.movementType === 'entry') product.currentQuantity += input.quantity
        else if (input.movementType === 'exit' || input.movementType === 'loss') product.currentQuantity -= input.quantity
        // adjustment sets absolute, transfer moves between locations
        product.updatedAt = now()
      }

      return movement
    },

    // --- Stock Positions ---
    async getPositions(productId: string): Promise<StockPosition[]> {
      return store.positions.filter((p) => p.productId === productId)
    },

    // --- Stock Locations ---
    async getLocations(): Promise<StockLocation[]> {
      return store.locations.filter((l) => l.isActive)
    },

    async createLocation(data): Promise<StockLocation> {
      const location: StockLocation = {
        id: uid(),
        name: data.name,
        description: data.description,
        isActive: true,
        unitId: data.unitId,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.locations.push(location)
      return location
    },

    // --- Recipes ---
    async getRecipes(): Promise<Recipe[]> {
      return store.recipes.filter((r) => r.isActive)
    },

    async getRecipeById(id: string): Promise<Recipe | null> {
      return store.recipes.find((r) => r.id === id) ?? null
    },

    async getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
      return store.recipeIngredients.filter((ri) => ri.recipeId === recipeId).sort((a, b) => a.displayOrder - b.displayOrder)
    },

    async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
      const product = store.products.find((p) => p.id === input.productId)
      const recipeId = uid()
      const recipe: Recipe = {
        id: recipeId,
        name: input.name,
        description: input.description,
        productId: input.productId,
        productName: product?.name,
        yieldQuantity: input.yieldQuantity,
        yieldUnitId: input.yieldUnitId,
        preparationTimeMinutes: input.preparationTimeMinutes,
        instructions: input.instructions,
        isActive: true,
        ingredientCount: input.ingredients.length,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      store.recipes.push(recipe)

      for (const ing of input.ingredients) {
        const ingProduct = store.products.find((p) => p.id === ing.productId)
        store.recipeIngredients.push({
          id: uid(),
          recipeId,
          productId: ing.productId,
          productName: ingProduct?.name,
          quantity: ing.quantity,
          unitId: ing.unitId,
          displayOrder: ing.displayOrder ?? 0,
          notes: ing.notes,
          createdAt: now(),
        })
      }

      return recipe
    },

    // --- Summary ---
    async getSummary(): Promise<InventorySummary> {
      const active = store.products.filter((p) => p.isActive)
      const lowStock = active.filter((p) => p.currentQuantity <= p.minQuantity && p.currentQuantity > 0)
      const outOfStock = active.filter((p) => p.currentQuantity <= 0)
      const totalValue = active.reduce((sum, p) => sum + p.currentQuantity * p.costPrice, 0)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().slice(0, 10)
      const recent = store.movements.filter((m) => m.movementDate >= weekAgoStr)

      const movementsByType: Record<MovementType, number> = { entry: 0, exit: 0, adjustment: 0, transfer: 0, loss: 0 }
      for (const m of recent) movementsByType[m.movementType]++

      return {
        totalProducts: active.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        totalStockValue: totalValue,
        recentMovementCount: recent.length,
        movementsByType,
      }
    },
  }

  return provider
}
