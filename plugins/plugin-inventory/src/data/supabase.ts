import type { InventoryDataProvider } from './types'
import type {
  Product, StockMovement, StockPosition, StockLocation,
  Recipe, RecipeIngredient,
  CreateProductInput, CreateStockMovementInput, CreateRecipeInput,
  ProductQuery, MovementQuery,
  PaginatedResult, InventorySummary, MovementType,
} from '../types'
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { getInventoryTenantId } from '../lib/tenant'
import { T } from './tables'

function getTenantId(): string | undefined {
  // Local override wins; else use the app's active tenant so writes pass RLS.
  return getInventoryTenantId() ?? getActiveTenantId()
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

/** Map a public.products row to our Product type */
function mapProductRow(row: Record<string, any>): Product {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sku: row.sku,
    barcode: meta.barcode,
    brand: meta.brand,
    productType: meta.productType ?? 'sale',
    currentQuantity: row.stock ?? 0,
    minQuantity: row.min_stock ?? 0,
    maxQuantity: meta.maxQuantity,
    costPrice: row.cost ?? 0,
    salePrice: row.price,
    isActive: row.is_active ?? true,
    imageUrl: row.image_url,
    metadata: meta,
    tenantId: row.tenant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createSupabaseInventoryProvider(): InventoryDataProvider {
  // Lazy resolution — Supabase client may not exist at factory time
  // but will be available when methods are called (after createSaasApp initializes it)
  function getClients() {
    const supabase = getSupabaseClientOptional() as any
    if (!supabase) throw new Error('Supabase not initialized')
    return { core: supabase, pub: supabase }
  }

  const provider: InventoryDataProvider = {
    // --- Products (public.products) ---
    async getProducts(query: ProductQuery): Promise<PaginatedResult<Product>> {
      const { core, pub } = getClients()
      let qb = core.from('products').select('*', { count: 'exact' })
      if (query.search) qb = qb.ilike('name', `%${query.search}%`)
      // productType lives in the metadata JSON column → filter on metadata->>productType.
      if (query.productType) qb = qb.eq('metadata->>productType', query.productType)
      if (query.isActive !== undefined) qb = qb.eq('is_active', query.isActive)
      if (query.lowStockOnly) qb = qb.lte('stock', 0) // simplified
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('created_at', { ascending: false })
      const { data, count } = await qb
      return { data: (data ?? []).map(mapProductRow), total: count ?? 0 }
    },

    async getProductById(id: string): Promise<Product | null> {
      const { core } = getClients()
      const { data } = await core.from('products').select('*').eq('id', id).single()
      return data ? mapProductRow(data) : null
    },

    async createProduct(input: CreateProductInput): Promise<Product> {
      const { core } = getClients()
      const tenantId = getTenantId()
      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        name: input.name,
        description: input.description,
        sku: input.sku,
        price: input.salePrice ?? 0,
        cost: input.costPrice ?? 0,
        stock: 0,
        min_stock: input.minQuantity ?? 0,
        is_active: true,
        image_url: input.imageUrl,
        metadata: { productType: input.productType, barcode: input.barcode, brand: input.brand, maxQuantity: input.maxQuantity },
      }
      const { data, error } = await core.from('products').insert(row).select().single()
      if (error) throw new Error(error.message)
      return mapProductRow(data!)
    },

    async updateProduct(id: string, partial: Partial<Product>): Promise<Product> {
      const { core } = getClients()
      const row: Record<string, unknown> = {}
      if (partial.name !== undefined) row.name = partial.name
      if (partial.description !== undefined) row.description = partial.description
      if (partial.sku !== undefined) row.sku = partial.sku
      if (partial.salePrice !== undefined) row.price = partial.salePrice
      if (partial.costPrice !== undefined) row.cost = partial.costPrice
      if (partial.minQuantity !== undefined) row.min_stock = partial.minQuantity
      if (partial.isActive !== undefined) row.is_active = partial.isActive
      if (partial.imageUrl !== undefined) row.image_url = partial.imageUrl
      if (partial.productType !== undefined || partial.barcode !== undefined || partial.brand !== undefined) {
        row.metadata = { productType: partial.productType, barcode: partial.barcode, brand: partial.brand }
      }
      const { data, error } = await core.from('products').update(row).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return mapProductRow(data!)
    },

    // --- Stock Movements (via view with product join — single query) ---
    async getMovements(query: MovementQuery): Promise<PaginatedResult<StockMovement>> {
      const { pub } = getClients()
      // Single query via v_stock_movements view (JOINs with public.products)
      let qb = pub.from('v_stock_movements').select('*', { count: 'exact' })
      if (query.productId) qb = qb.eq('product_id', query.productId)
      if (query.movementType) {
        const types = Array.isArray(query.movementType) ? query.movementType : [query.movementType]
        qb = qb.in('movement_type', types)
      }
      if (query.stockLocationId) qb = qb.eq('stock_location_id', query.stockLocationId)
      if (query.dateRange) qb = qb.gte('movement_date', query.dateRange.from).lte('movement_date', query.dateRange.to)
      if (query.search) qb = qb.ilike('product_name', `%${query.search}%`)
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      qb = qb.range((page - 1) * pageSize, page * pageSize - 1).order('movement_date', { ascending: false })
      const { data, count } = await qb

      const movements = (data ?? []).map((r: any) => {
        const mov = snakeToCamel(r) as any
        mov.productName = r.product_name ?? mov.productName
        mov.productSku = r.product_sku ?? mov.productSku
        // View may include location names if the updated migration has been applied
        mov.stockLocationName = r.stock_location_name ?? mov.stockLocationName
        mov.destinationLocationName = r.destination_location_name ?? mov.destinationLocationName
        return mov as StockMovement
      })

      // Resolve location names if not provided by the view
      const needsLocationResolve = movements.some(
        (m: any) => (m.stockLocationId && !m.stockLocationName) || (m.destinationLocationId && !m.destinationLocationName)
      )
      if (needsLocationResolve) {
        const locationIds = new Set<string>()
        for (const m of movements) {
          if (m.stockLocationId && !m.stockLocationName) locationIds.add(m.stockLocationId)
          if (m.destinationLocationId && !m.destinationLocationName) locationIds.add(m.destinationLocationId)
        }
        if (locationIds.size > 0) {
          const { data: locs } = await pub.from(T.stockLocations).select('id, name').in('id', [...locationIds])
          const locMap = new Map((locs ?? []).map((l: any) => [l.id, l.name]))
          for (const m of movements) {
            if (m.stockLocationId && !m.stockLocationName) m.stockLocationName = locMap.get(m.stockLocationId)
            if (m.destinationLocationId && !m.destinationLocationName) m.destinationLocationName = locMap.get(m.destinationLocationId)
          }
        }
      }

      return { data: movements, total: count ?? 0 }
    },

    async createMovement(input: CreateStockMovementInput): Promise<StockMovement> {
      const { core, pub } = getClients()
      const tenantId = getTenantId()
      const unitCost = input.unitCost ?? 0
      const row = {
        ...camelToSnake(input as any),
        tenant_id: tenantId,
        unit_cost: unitCost,
        total_cost: unitCost * input.quantity,
        movement_date: input.movementDate ?? new Date().toISOString().slice(0, 10),
      }
      const { data, error } = await pub.from(T.stockMovements).insert(row).select().single()
      if (error) throw new Error(error.message)

      // Fetch product name + current stock for the response and stock update
      const { data: product } = await core.from('products').select('id, name, stock').eq('id', input.productId).single()

      // Update product stock
      if (product) {
        const delta = (input.movementType === 'entry') ? input.quantity : -(input.quantity)
        if (input.movementType !== 'adjustment' && input.movementType !== 'transfer') {
          await core.from('products').update({ stock: (product.stock ?? 0) + delta }).eq('id', input.productId)
        }
      }

      // Update stock_positions when a location is specified (best-effort — don't fail the movement)
      if (input.stockLocationId) {
        try {
          const posDelta = (input.movementType === 'entry') ? input.quantity : -(input.quantity)
          const { data: existing } = await pub.from(T.stockPositions)
            .select('id, quantity')
            .eq('product_id', input.productId)
            .eq('stock_location_id', input.stockLocationId)
            .maybeSingle()

          if (existing) {
            await pub.from(T.stockPositions)
              .update({ quantity: (existing.quantity ?? 0) + posDelta, unit_cost: input.unitCost ?? 0 })
              .eq('id', existing.id)
          } else {
            await pub.from(T.stockPositions).insert({
              tenant_id: tenantId,
              product_id: input.productId,
              stock_location_id: input.stockLocationId,
              quantity: Math.max(0, posDelta),
              unit_cost: input.unitCost ?? 0,
              batch_number: input.batchNumber ?? null,
              expiration_date: input.expirationDate ?? null,
            })
          }

          // For transfers, also update the destination position
          if (input.movementType === 'transfer' && input.destinationLocationId) {
            const { data: destExisting } = await pub.from(T.stockPositions)
              .select('id, quantity')
              .eq('product_id', input.productId)
              .eq('stock_location_id', input.destinationLocationId)
              .maybeSingle()

            if (destExisting) {
              await pub.from(T.stockPositions)
                .update({ quantity: (destExisting.quantity ?? 0) + input.quantity, unit_cost: input.unitCost ?? 0 })
                .eq('id', destExisting.id)
            } else {
              await pub.from(T.stockPositions).insert({
                tenant_id: tenantId,
                product_id: input.productId,
                stock_location_id: input.destinationLocationId,
                quantity: input.quantity,
                unit_cost: input.unitCost ?? 0,
                batch_number: input.batchNumber ?? null,
                expiration_date: input.expirationDate ?? null,
              })
            }
          }
        } catch {
          // stock_positions update is best-effort — log but don't fail the movement
          console.warn('Failed to update stock_positions — table may not exist yet')
        }
      }

      const movement = snakeToCamel(data) as any
      movement.productName = product?.name
      // Resolve location name
      if (input.stockLocationId) {
        const { data: loc } = await pub.from(T.stockLocations).select('name').eq('id', input.stockLocationId).single()
        movement.stockLocationName = loc?.name
      }
      if (input.destinationLocationId) {
        const { data: loc } = await pub.from(T.stockLocations).select('name').eq('id', input.destinationLocationId).single()
        movement.destinationLocationName = loc?.name
      }
      return movement as StockMovement
    },

    // --- Stock Positions ---
    async getPositions(productId: string): Promise<StockPosition[]> {
      const { pub } = getClients()
      const { data } = await pub.from(T.stockPositions).select('*').eq('product_id', productId)
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as StockPosition)
    },

    // --- Stock Locations ---
    async getLocations(): Promise<StockLocation[]> {
      const { pub } = getClients()
      const { data } = await pub.from(T.stockLocations).select('*').eq('is_active', true).order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as StockLocation)
    },

    async createLocation(input): Promise<StockLocation> {
      const { pub } = getClients()
      const tenantId = getTenantId()
      const { data } = await pub.from(T.stockLocations).insert({ ...camelToSnake(input as any), tenant_id: tenantId }).select().single()
      return snakeToCamel(data!) as unknown as StockLocation
    },

    // --- Recipes ---
    async getRecipes(): Promise<Recipe[]> {
      const { pub } = getClients()
      const { data } = await pub.from(T.recipes).select('*').eq('is_active', true).order('name')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as Recipe)
    },

    async getRecipeById(id: string): Promise<Recipe | null> {
      const { pub } = getClients()
      const { data } = await pub.from(T.recipes).select('*').eq('id', id).single()
      return data ? snakeToCamel(data) as unknown as Recipe : null
    },

    async getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
      const { pub } = getClients()
      const { data } = await pub.from(T.recipeIngredients).select('*').eq('recipe_id', recipeId).order('display_order')
      return (data ?? []).map((r: any) => snakeToCamel(r) as unknown as RecipeIngredient)
    },

    async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
      const { pub } = getClients()
      const tenantId = getTenantId()
      const { ingredients, ...recipeData } = input
      const { data: recipe } = await pub.from(T.recipes).insert({ ...camelToSnake(recipeData as any), tenant_id: tenantId }).select().single()
      if (recipe && ingredients.length > 0) {
        await pub.from(T.recipeIngredients).insert(
          ingredients.map((ing) => ({ ...camelToSnake(ing as any), recipe_id: recipe.id, tenant_id: tenantId }))
        )
      }
      return snakeToCamel(recipe!) as unknown as Recipe
    },

    // --- Summary ---
    async getSummary(): Promise<InventorySummary> {
      const { core, pub } = getClients()
      const { data: products } = await core.from('products').select('stock, min_stock, price, is_active').eq('is_active', true)
      const items = products ?? []
      const lowStock = items.filter((p: any) => p.stock > 0 && p.stock <= (p.min_stock ?? 0))
      const outOfStock = items.filter((p: any) => p.stock <= 0)
      const totalValue = items.reduce((sum: number, p: any) => sum + (p.stock ?? 0) * (p.price ?? 0), 0)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { data: movements } = await pub.from(T.stockMovements).select('movement_type').gte('movement_date', weekAgo.toISOString().slice(0, 10))
      const movs = movements ?? []
      const movementsByType: Record<MovementType, number> = { entry: 0, exit: 0, adjustment: 0, transfer: 0, loss: 0 }
      for (const m of movs) movementsByType[m.movement_type as MovementType]++

      return {
        totalProducts: items.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        totalStockValue: totalValue,
        recentMovementCount: movs.length,
        movementsByType,
      }
    },
  }

  return provider
}
