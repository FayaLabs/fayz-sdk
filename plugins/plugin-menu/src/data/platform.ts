import { createFayzClient, type FayzClientOptions, type FayzTableFilter } from '@fayz-ai/sdk'
import type {
  CreateMenuCategoryInput,
  CreateMenuItemInput,
  MenuCategory,
  MenuItem,
  MenuItemQuery,
  MenuItemStatus,
  MenuSummary,
  ModifierGroup,
  PaginatedResult,
  UpdateMenuItemInput,
} from '../types'
import type { MenuDataProvider } from './types'

export interface FayzMenuProviderOptions extends FayzClientOptions {
  projectId?: string
  schema?: string
  runtime?: boolean
  categoriesTable?: string
  productsTable?: string
  categoryKind?: string
}

interface CategoryRow {
  id: string
  tenant_id?: string | null
  kind?: string | null
  name: string
  slug?: string | null
  parent_id?: string | null
  icon?: string | null
  color?: string | null
  sort_order?: number | null
  is_active?: boolean | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

interface ProductRow {
  id: string
  tenant_id?: string | null
  category_id?: string | null
  name: string
  description?: string | null
  sku?: string | null
  price?: number | string | null
  cost?: number | string | null
  currency?: string | null
  image_url?: string | null
  status?: string | null
  is_active?: boolean | null
  tags?: string[] | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

const DEFAULT_CATEGORY_KIND = 'menu_category'
const MENU_METADATA_KEY = 'fayzMenu'

function nowIso(): string {
  return new Date().toISOString()
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function numberValue(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function menuMetadata(row: ProductRow): Record<string, unknown> {
  const raw = row.metadata?.[MENU_METADATA_KEY]
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
}

function rowToCategory(row: CategoryRow, itemCount = 0): MenuCategory {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id ?? undefined,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    itemCount,
    tenantId: row.tenant_id ?? 'runtime-tenant',
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function rowToItem(row: ProductRow, categoryName?: string): MenuItem {
  const metadata = menuMetadata(row)
  const status = (metadata.status ?? row.status ?? 'available') as MenuItemStatus
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    price: numberValue(row.price),
    cost: numberValue(row.cost),
    currency: row.currency ?? 'BRL',
    sku: row.sku ?? undefined,
    imageUrl: row.image_url ?? undefined,
    categoryId: row.category_id ?? undefined,
    categoryName,
    status,
    isActive: row.is_active ?? true,
    prepTimeMinutes: typeof metadata.prepTimeMinutes === 'number' ? metadata.prepTimeMinutes : undefined,
    allergens: Array.isArray(metadata.allergens) ? metadata.allergens as string[] : undefined,
    dietaryTags: Array.isArray(metadata.dietaryTags) ? metadata.dietaryTags as string[] : row.tags ?? undefined,
    availableForPos: typeof metadata.availableForPos === 'boolean' ? metadata.availableForPos : true,
    availableForDelivery: typeof metadata.availableForDelivery === 'boolean' ? metadata.availableForDelivery : true,
    deliveryPrice: typeof metadata.deliveryPrice === 'number' ? metadata.deliveryPrice : undefined,
    sortOrder: typeof metadata.sortOrder === 'number' ? metadata.sortOrder : 0,
    isFeatured: typeof metadata.isFeatured === 'boolean' ? metadata.isFeatured : false,
    modifierGroupIds: Array.isArray(metadata.modifierGroupIds) ? metadata.modifierGroupIds as string[] : undefined,
    metadata: row.metadata ?? {},
    tenantId: row.tenant_id ?? 'runtime-tenant',
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function categoryPayload(input: CreateMenuCategoryInput, kind: string): Record<string, unknown> {
  return {
    kind,
    name: input.name,
    slug: slugify(input.name),
    parent_id: input.parentId ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    sort_order: input.sortOrder ?? 0,
    is_active: true,
  }
}

function itemMetadata(input: Partial<CreateMenuItemInput>, existing?: Record<string, unknown>): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    [MENU_METADATA_KEY]: {
      ...((existing?.[MENU_METADATA_KEY] && typeof existing[MENU_METADATA_KEY] === 'object') ? existing[MENU_METADATA_KEY] as Record<string, unknown> : {}),
      status: input.status,
      prepTimeMinutes: input.prepTimeMinutes,
      allergens: input.allergens,
      dietaryTags: input.dietaryTags,
      availableForPos: input.availableForPos ?? true,
      availableForDelivery: input.availableForDelivery ?? true,
      deliveryPrice: input.deliveryPrice,
      isFeatured: input.isFeatured ?? false,
      modifierGroupIds: input.modifierGroupIds,
    },
  }
}

function itemCreatePayload(input: CreateMenuItemInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    cost: input.cost ?? null,
    currency: 'BRL',
    image_url: input.imageUrl ?? null,
    category_id: input.categoryId ?? null,
    status: input.status === 'hidden' ? 'archived' : 'active',
    is_active: input.status !== 'hidden',
    tags: input.dietaryTags ?? [],
    metadata: itemMetadata(input),
  }
}

function itemUpdatePayload(input: UpdateMenuItemInput, existing?: MenuItem): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.description !== undefined) payload.description = input.description
  if (input.price !== undefined) payload.price = input.price
  if (input.cost !== undefined) payload.cost = input.cost
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl
  if (input.categoryId !== undefined) payload.category_id = input.categoryId
  if (input.status !== undefined) {
    payload.status = input.status === 'hidden' ? 'archived' : 'active'
    payload.is_active = input.status !== 'hidden'
  }
  if (input.dietaryTags !== undefined) payload.tags = input.dietaryTags
  payload.metadata = itemMetadata(input, existing?.metadata)
  return payload
}

function filtersFromQuery(query: MenuItemQuery): FayzTableFilter[] {
  const filters: FayzTableFilter[] = [{ column: 'is_active', operator: 'eq', value: true }]
  if (query.categoryId) filters.push({ column: 'category_id', operator: 'eq', value: query.categoryId })
  return filters
}

function matchesClientQuery(item: MenuItem, query: MenuItemQuery): boolean {
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status]
    if (!statuses.includes(item.status)) return false
  }
  if (query.availableForPos !== undefined && item.availableForPos !== query.availableForPos) return false
  if (query.availableForDelivery !== undefined && item.availableForDelivery !== query.availableForDelivery) return false
  if (query.isFeatured !== undefined && item.isFeatured !== query.isFeatured) return false
  if (query.search) {
    const search = query.search.toLowerCase()
    return item.name.toLowerCase().includes(search)
      || (item.description?.toLowerCase().includes(search) ?? false)
  }
  return true
}

function paginate<T>(items: T[], page?: number, pageSize?: number): PaginatedResult<T> {
  const currentPage = page ?? 1
  const limit = pageSize ?? 50
  const start = (currentPage - 1) * limit
  return { data: items.slice(start, start + limit), total: items.length }
}

export function createFayzMenuProvider(options: FayzMenuProviderOptions = {}): MenuDataProvider {
  const client = createFayzClient(options)
  const projectId = options.projectId
  const schema = options.schema
  const runtime = options.runtime
  const categoriesTable = options.categoriesTable ?? 'categories'
  const productsTable = options.productsTable ?? 'products'
  const categoryKind = options.categoryKind ?? DEFAULT_CATEGORY_KIND

  const tableOptions = { projectId, schema, runtime }

  async function getCategoriesRaw(): Promise<CategoryRow[]> {
    const response = await client.data.listRows<CategoryRow>({
      ...tableOptions,
      table: categoriesTable,
      filters: [
        { column: 'kind', operator: 'eq', value: categoryKind },
        { column: 'is_active', operator: 'eq', value: true },
      ],
      sortColumn: 'sort_order',
      sortDirection: 'asc',
      limit: 500,
    })
    return response.rows
  }

  async function getItemsRaw(): Promise<ProductRow[]> {
    const response = await client.data.listRows<ProductRow>({
      ...tableOptions,
      table: productsTable,
      filters: [{ column: 'is_active', operator: 'eq', value: true }],
      sortColumn: 'name',
      sortDirection: 'asc',
      limit: 1000,
    })
    return response.rows.filter((row) => {
      const metadata = menuMetadata(row)
      return metadata.kind === 'menu_item' || metadata.status != null || row.category_id != null
    })
  }

  async function getCategoryMap() {
    const categories = await getCategoriesRaw()
    return new Map(categories.map((category) => [category.id, category]))
  }

  async function getItems(): Promise<MenuItem[]> {
    const [rows, categoryMap] = await Promise.all([getItemsRaw(), getCategoryMap()])
    return rows.map((row) => rowToItem(row, row.category_id ? categoryMap.get(row.category_id)?.name : undefined))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }

  return {
    async getCategories() {
      const [categories, items] = await Promise.all([getCategoriesRaw(), getItemsRaw()])
      const counts = new Map<string, number>()
      for (const item of items) {
        if (item.category_id) counts.set(item.category_id, (counts.get(item.category_id) ?? 0) + 1)
      }
      return categories.map((category) => rowToCategory(category, counts.get(category.id) ?? 0))
    },

    async getCategoryById(id: string) {
      const response = await client.data.listRows<CategoryRow>({
        ...tableOptions,
        table: categoriesTable,
        filters: [{ column: 'id', operator: 'eq', value: id }],
        limit: 1,
      })
      return response.rows[0] ? rowToCategory(response.rows[0]) : null
    },

    async createCategory(input: CreateMenuCategoryInput) {
      const row = await client.data.createRow<CategoryRow>({
        ...tableOptions,
        table: categoriesTable,
        row: categoryPayload(input, categoryKind),
      })
      return rowToCategory(row)
    },

    async updateCategory(id: string, data: Partial<MenuCategory>) {
      const row = await client.data.updateRow<CategoryRow>({
        ...tableOptions,
        table: categoriesTable,
        primaryKeys: { id },
        row: {
          name: data.name,
          parent_id: data.parentId,
          icon: data.icon,
          color: data.color,
          sort_order: data.sortOrder,
          is_active: data.isActive,
        },
      })
      return rowToCategory(row)
    },

    async deleteCategory(id: string) {
      await client.data.updateRow<CategoryRow>({
        ...tableOptions,
        table: categoriesTable,
        primaryKeys: { id },
        row: { is_active: false },
      })
    },

    async reorderCategories(ids: string[]) {
      await Promise.all(ids.map((id, sortOrder) => this.updateCategory(id, { sortOrder })))
    },

    async getMenuItems(query: MenuItemQuery) {
      const items = (await getItems()).filter((item) => matchesClientQuery(item, query))
      return paginate(items, query.page, query.pageSize)
    },

    async getMenuItemById(id: string) {
      const response = await client.data.listRows<ProductRow>({
        ...tableOptions,
        table: productsTable,
        filters: [{ column: 'id', operator: 'eq', value: id }],
        limit: 1,
      })
      if (!response.rows[0]) return null
      const categoryMap = await getCategoryMap()
      const row = response.rows[0]
      return rowToItem(row, row.category_id ? categoryMap.get(row.category_id)?.name : undefined)
    },

    async createMenuItem(input: CreateMenuItemInput) {
      const row = await client.data.createRow<ProductRow>({
        ...tableOptions,
        table: productsTable,
        row: itemCreatePayload(input),
      })
      const categoryMap = await getCategoryMap()
      return rowToItem(row, row.category_id ? categoryMap.get(row.category_id)?.name : undefined)
    },

    async updateMenuItem(id: string, data: UpdateMenuItemInput) {
      const existing = await this.getMenuItemById(id)
      const row = await client.data.updateRow<ProductRow>({
        ...tableOptions,
        table: productsTable,
        primaryKeys: { id },
        row: itemUpdatePayload(data, existing ?? undefined),
      })
      const categoryMap = await getCategoryMap()
      return rowToItem(row, row.category_id ? categoryMap.get(row.category_id)?.name : undefined)
    },

    async deleteMenuItem(id: string) {
      await client.data.updateRow<ProductRow>({
        ...tableOptions,
        table: productsTable,
        primaryKeys: { id },
        row: { is_active: false },
      })
    },

    async toggleAvailability(id: string, field: 'status' | 'availableForPos' | 'availableForDelivery', value: unknown) {
      return this.updateMenuItem(id, { [field]: value } as UpdateMenuItemInput)
    },

    async reorderItems(categoryId: string, ids: string[]) {
      await Promise.all(ids.map(async (id, sortOrder) => {
        const existing = await this.getMenuItemById(id)
        await client.data.updateRow<ProductRow>({
          ...tableOptions,
          table: productsTable,
          primaryKeys: { id },
          row: { metadata: itemMetadata({ categoryId }, { ...existing?.metadata, [MENU_METADATA_KEY]: { ...existing?.metadata?.[MENU_METADATA_KEY] as Record<string, unknown>, sortOrder } }) },
        })
      }))
    },

    async getModifierGroups(): Promise<ModifierGroup[]> {
      return []
    },

    async createModifierGroup(): Promise<ModifierGroup> {
      throw new Error('Menu modifier groups require a dedicated Fayz table/broker contract.')
    },

    async updateModifierGroup(): Promise<ModifierGroup> {
      throw new Error('Menu modifier groups require a dedicated Fayz table/broker contract.')
    },

    async deleteModifierGroup(): Promise<void> {
      throw new Error('Menu modifier groups require a dedicated Fayz table/broker contract.')
    },

    async getSummary(): Promise<MenuSummary> {
      const [items, categories] = await Promise.all([getItems(), this.getCategories()])
      const prices = items.filter((item) => item.price > 0).map((item) => item.price)
      return {
        totalItems: items.length,
        availableItems: items.filter((item) => item.status === 'available').length,
        soldOutItems: items.filter((item) => item.status === 'sold_out').length,
        hiddenItems: items.filter((item) => item.status === 'hidden').length,
        categoryCount: categories.length,
        averagePrice: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0,
        featuredCount: items.filter((item) => item.isFeatured).length,
      }
    },
  }
}
