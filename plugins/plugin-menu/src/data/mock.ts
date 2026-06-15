import type { MenuDataProvider } from './types'
import type {
  MenuCategory, MenuItem, ModifierGroup,
  CreateMenuItemInput, UpdateMenuItemInput, CreateMenuCategoryInput,
  MenuItemQuery, PaginatedResult, MenuSummary,
} from '../types'

let uid = 0
function nextId(prefix: string) { return prefix + '-' + (++uid) }
function now(): string { return new Date().toISOString() }

function paginate<T>(items: T[], page?: number, pageSize?: number): PaginatedResult<T> {
  const p = page ?? 1
  const ps = pageSize ?? 50
  const start = (p - 1) * ps
  return { data: items.slice(start, start + ps), total: items.length }
}

function seedCategories(): MenuCategory[] {
  const t = 'mock-tenant'
  const ts = now()
  return [
    { id: nextId('cat'), name: 'Burgers', icon: '🍔', color: '#f59e0b', sortOrder: 0, isActive: true, itemCount: 3, tenantId: t, createdAt: ts, updatedAt: ts },
    { id: nextId('cat'), name: 'Sides', icon: '🍟', color: '#22c55e', sortOrder: 1, isActive: true, itemCount: 3, tenantId: t, createdAt: ts, updatedAt: ts },
    { id: nextId('cat'), name: 'Drinks', icon: '🥤', color: '#3b82f6', sortOrder: 2, isActive: true, itemCount: 4, tenantId: t, createdAt: ts, updatedAt: ts },
    { id: nextId('cat'), name: 'Desserts', icon: '🍰', color: '#ec4899', sortOrder: 3, isActive: true, itemCount: 2, tenantId: t, createdAt: ts, updatedAt: ts },
    { id: nextId('cat'), name: 'Combos', icon: '⭐', color: '#8b5cf6', sortOrder: 4, isActive: true, itemCount: 0, tenantId: t, createdAt: ts, updatedAt: ts },
  ]
}

function seedItems(categories: MenuCategory[]): MenuItem[] {
  const t = 'mock-tenant'
  const ts = now()
  const [burgers, sides, drinks, desserts] = categories.map((c) => c.id)

  const item = (
    name: string, price: number, categoryId: string, categoryName: string,
    opts: Partial<MenuItem> = {},
  ): MenuItem => ({
    id: nextId('mi'),
    name,
    price,
    currency: 'BRL',
    categoryId,
    categoryName,
    status: 'available',
    isActive: true,
    availableForPos: true,
    availableForDelivery: true,
    sortOrder: 0,
    isFeatured: false,
    tenantId: t,
    createdAt: ts,
    updatedAt: ts,
    ...opts,
  })

  let order = 0
  return [
    item('Classic Burger', 32, burgers, 'Burgers', { prepTimeMinutes: 12, sortOrder: order++, isFeatured: true }),
    item('Cheese Burger', 36, burgers, 'Burgers', { prepTimeMinutes: 12, sortOrder: order++ }),
    item('BBQ Bacon', 42, burgers, 'Burgers', { prepTimeMinutes: 15, sortOrder: order++, isFeatured: true }),
    item('Fries', 15, sides, 'Sides', { prepTimeMinutes: 8, sortOrder: order++ }),
    item('Onion Rings', 18, sides, 'Sides', { prepTimeMinutes: 8, sortOrder: order++ }),
    item('Coleslaw', 12, sides, 'Sides', { prepTimeMinutes: 2, sortOrder: order++, availableForDelivery: false }),
    item('Soda', 8, drinks, 'Drinks', { prepTimeMinutes: 1, sortOrder: order++ }),
    item('Juice', 12, drinks, 'Drinks', { prepTimeMinutes: 3, sortOrder: order++ }),
    item('Water', 5, drinks, 'Drinks', { prepTimeMinutes: 0, sortOrder: order++ }),
    item('Milkshake', 16, drinks, 'Drinks', { prepTimeMinutes: 5, sortOrder: order++, isFeatured: true }),
    item('Brownie', 14, desserts, 'Desserts', { prepTimeMinutes: 1, sortOrder: order++ }),
    item('Ice Cream', 12, desserts, 'Desserts', { prepTimeMinutes: 2, sortOrder: order++, availableForDelivery: false }),
  ]
}

function seedModifierGroups(): ModifierGroup[] {
  const t = 'mock-tenant'
  const ts = now()

  const g1Id = nextId('mg')
  const g2Id = nextId('mg')

  return [
    {
      id: g1Id, name: 'Extra Toppings', minSelections: 0, maxSelections: 3, isRequired: false, sortOrder: 0, tenantId: t, createdAt: ts,
      items: [
        { id: nextId('mod'), groupId: g1Id, name: 'Extra Cheese', priceAdjustment: 5, isActive: true, sortOrder: 0 },
        { id: nextId('mod'), groupId: g1Id, name: 'Bacon', priceAdjustment: 7, isActive: true, sortOrder: 1 },
        { id: nextId('mod'), groupId: g1Id, name: 'Jalapeños', priceAdjustment: 4, isActive: true, sortOrder: 2 },
      ],
    },
    {
      id: g2Id, name: 'Drink Size', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 1, tenantId: t, createdAt: ts,
      items: [
        { id: nextId('mod'), groupId: g2Id, name: 'Small', priceAdjustment: 0, isActive: true, sortOrder: 0 },
        { id: nextId('mod'), groupId: g2Id, name: 'Medium', priceAdjustment: 3, isActive: true, sortOrder: 1 },
        { id: nextId('mod'), groupId: g2Id, name: 'Large', priceAdjustment: 5, isActive: true, sortOrder: 2 },
      ],
    },
  ]
}

export function createMockMenuProvider(): MenuDataProvider {
  const tenantId = 'mock-tenant'
  const categories = seedCategories()
  const items = seedItems(categories)
  const modifierGroups = seedModifierGroups()

  return {
    async getCategories(): Promise<MenuCategory[]> {
      return [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async getCategoryById(id: string): Promise<MenuCategory | null> {
      return categories.find((c) => c.id === id) ?? null
    },

    async createCategory(input: CreateMenuCategoryInput): Promise<MenuCategory> {
      const cat: MenuCategory = {
        id: nextId('cat'),
        name: input.name,
        parentId: input.parentId,
        icon: input.icon,
        color: input.color,
        sortOrder: input.sortOrder ?? categories.length,
        isActive: true,
        itemCount: 0,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      categories.push(cat)
      return cat
    },

    async updateCategory(id: string, data: Partial<MenuCategory>): Promise<MenuCategory> {
      const cat = categories.find((c) => c.id === id)
      if (!cat) throw new Error(`Category ${id} not found`)
      Object.assign(cat, data, { updatedAt: now() })
      return cat
    },

    async deleteCategory(id: string): Promise<void> {
      const idx = categories.findIndex((c) => c.id === id)
      if (idx >= 0) categories.splice(idx, 1)
    },

    async reorderCategories(ids: string[]): Promise<void> {
      ids.forEach((id, i) => {
        const cat = categories.find((c) => c.id === id)
        if (cat) cat.sortOrder = i
      })
    },

    async getMenuItems(query: MenuItemQuery): Promise<PaginatedResult<MenuItem>> {
      let results = [...items]
      if (query.categoryId) results = results.filter((i) => i.categoryId === query.categoryId)
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        results = results.filter((i) => statuses.includes(i.status))
      }
      if (query.availableForPos !== undefined) results = results.filter((i) => i.availableForPos === query.availableForPos)
      if (query.availableForDelivery !== undefined) results = results.filter((i) => i.availableForDelivery === query.availableForDelivery)
      if (query.isFeatured !== undefined) results = results.filter((i) => i.isFeatured === query.isFeatured)
      if (query.search) {
        const s = query.search.toLowerCase()
        results = results.filter((i) => i.name.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s))
      }
      results.sort((a, b) => a.sortOrder - b.sortOrder)
      return paginate(results, query.page, query.pageSize)
    },

    async getMenuItemById(id: string): Promise<MenuItem | null> {
      return items.find((i) => i.id === id) ?? null
    },

    async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
      const cat = input.categoryId ? categories.find((c) => c.id === input.categoryId) : undefined
      const item: MenuItem = {
        id: nextId('mi'),
        name: input.name,
        description: input.description,
        price: input.price,
        cost: input.cost,
        currency: 'BRL',
        imageUrl: input.imageUrl,
        categoryId: input.categoryId,
        categoryName: cat?.name,
        status: input.status ?? 'available',
        isActive: true,
        prepTimeMinutes: input.prepTimeMinutes,
        allergens: input.allergens,
        dietaryTags: input.dietaryTags,
        availableForPos: input.availableForPos ?? true,
        availableForDelivery: input.availableForDelivery ?? true,
        deliveryPrice: input.deliveryPrice,
        sortOrder: items.length,
        isFeatured: input.isFeatured ?? false,
        modifierGroupIds: input.modifierGroupIds,
        tenantId,
        createdAt: now(),
        updatedAt: now(),
      }
      items.push(item)
      if (cat) cat.itemCount = (cat.itemCount ?? 0) + 1
      return item
    },

    async updateMenuItem(id: string, data: UpdateMenuItemInput): Promise<MenuItem> {
      const item = items.find((i) => i.id === id)
      if (!item) throw new Error(`MenuItem ${id} not found`)
      Object.assign(item, data, { updatedAt: now() })
      return item
    },

    async deleteMenuItem(id: string): Promise<void> {
      const idx = items.findIndex((i) => i.id === id)
      if (idx >= 0) {
        const [removed] = items.splice(idx, 1)
        if (removed.categoryId) {
          const cat = categories.find((c) => c.id === removed.categoryId)
          if (cat && cat.itemCount) cat.itemCount--
        }
      }
    },

    async toggleAvailability(id: string, field: 'status' | 'availableForPos' | 'availableForDelivery', value: any): Promise<MenuItem> {
      const item = items.find((i) => i.id === id)
      if (!item) throw new Error(`MenuItem ${id} not found`)
      ;(item as any)[field] = value
      item.updatedAt = now()
      return item
    },

    async reorderItems(categoryId: string, ids: string[]): Promise<void> {
      ids.forEach((id, i) => {
        const item = items.find((it) => it.id === id && it.categoryId === categoryId)
        if (item) item.sortOrder = i
      })
    },

    async getModifierGroups(): Promise<ModifierGroup[]> {
      return [...modifierGroups].sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async createModifierGroup(input: Partial<ModifierGroup>): Promise<ModifierGroup> {
      const group: ModifierGroup = {
        id: nextId('mg'),
        name: input.name ?? '',
        minSelections: input.minSelections ?? 0,
        maxSelections: input.maxSelections ?? 1,
        isRequired: input.isRequired ?? false,
        sortOrder: input.sortOrder ?? modifierGroups.length,
        items: input.items ?? [],
        tenantId,
        createdAt: now(),
      }
      modifierGroups.push(group)
      return group
    },

    async updateModifierGroup(id: string, data: Partial<ModifierGroup>): Promise<ModifierGroup> {
      const group = modifierGroups.find((g) => g.id === id)
      if (!group) throw new Error(`ModifierGroup ${id} not found`)
      Object.assign(group, data)
      return group
    },

    async deleteModifierGroup(id: string): Promise<void> {
      const idx = modifierGroups.findIndex((g) => g.id === id)
      if (idx >= 0) modifierGroups.splice(idx, 1)
    },

    async getSummary(): Promise<MenuSummary> {
      const available = items.filter((i) => i.status === 'available')
      const soldOut = items.filter((i) => i.status === 'sold_out')
      const hidden = items.filter((i) => i.status === 'hidden')
      const prices = items.filter((i) => i.price > 0).map((i) => i.price)
      return {
        totalItems: items.length,
        availableItems: available.length,
        soldOutItems: soldOut.length,
        hiddenItems: hidden.length,
        categoryCount: categories.length,
        averagePrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        featuredCount: items.filter((i) => i.isFeatured).length,
      }
    },
  }
}
