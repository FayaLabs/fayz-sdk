// ---------------------------------------------------------------------------
// Menu Plugin — Pure TypeScript types
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

export type MenuItemStatus = 'available' | 'sold_out' | 'hidden'

// ============================================================
// CORE ENTITIES
// ============================================================

/** Menu category — maps to saas_core.categories (kind='menu_category') */
export interface MenuCategory {
  id: string
  name: string
  parentId?: string
  icon?: string
  color?: string
  sortOrder: number
  isActive: boolean
  itemCount?: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

/** Menu item — saas_core.products + public.menu_items extension */
export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  cost?: number
  currency: string
  sku?: string
  imageUrl?: string
  categoryId?: string
  categoryName?: string
  status: MenuItemStatus
  isActive: boolean
  // Extension fields
  prepTimeMinutes?: number
  allergens?: string[]
  dietaryTags?: string[]
  availableForPos: boolean
  availableForDelivery: boolean
  deliveryPrice?: number
  sortOrder: number
  isFeatured: boolean
  modifierGroupIds?: string[]
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface ModifierGroup {
  id: string
  name: string
  minSelections: number
  maxSelections: number
  isRequired: boolean
  sortOrder: number
  items: ModifierItem[]
  tenantId: string
  createdAt: string
}

export interface ModifierItem {
  id: string
  groupId: string
  name: string
  priceAdjustment: number
  isActive: boolean
  sortOrder: number
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateMenuItemInput {
  name: string
  description?: string
  price: number
  cost?: number
  imageUrl?: string
  categoryId?: string
  status?: MenuItemStatus
  prepTimeMinutes?: number
  allergens?: string[]
  dietaryTags?: string[]
  availableForPos?: boolean
  availableForDelivery?: boolean
  deliveryPrice?: number
  isFeatured?: boolean
  modifierGroupIds?: string[]
}

export interface UpdateMenuItemInput extends Partial<CreateMenuItemInput> {}

export interface CreateMenuCategoryInput {
  name: string
  parentId?: string
  icon?: string
  color?: string
  sortOrder?: number
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface MenuItemQuery {
  categoryId?: string
  status?: MenuItemStatus | MenuItemStatus[]
  search?: string
  availableForPos?: boolean
  availableForDelivery?: boolean
  isFeatured?: boolean
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ============================================================
// DATA PROVIDER
// ============================================================

export interface MenuDataProvider {
  // Categories
  getCategories(): Promise<MenuCategory[]>
  getCategoryById(id: string): Promise<MenuCategory | null>
  createCategory(input: CreateMenuCategoryInput): Promise<MenuCategory>
  updateCategory(id: string, data: Partial<MenuCategory>): Promise<MenuCategory>
  deleteCategory(id: string): Promise<void>
  reorderCategories(ids: string[]): Promise<void>

  // Menu Items
  getMenuItems(query: MenuItemQuery): Promise<PaginatedResult<MenuItem>>
  getMenuItemById(id: string): Promise<MenuItem | null>
  createMenuItem(input: CreateMenuItemInput): Promise<MenuItem>
  updateMenuItem(id: string, data: UpdateMenuItemInput): Promise<MenuItem>
  deleteMenuItem(id: string): Promise<void>
  toggleAvailability(id: string, field: 'status' | 'availableForPos' | 'availableForDelivery', value: any): Promise<MenuItem>
  reorderItems(categoryId: string, ids: string[]): Promise<void>

  // Modifier Groups
  getModifierGroups(): Promise<ModifierGroup[]>
  createModifierGroup(input: Partial<ModifierGroup>): Promise<ModifierGroup>
  updateModifierGroup(id: string, data: Partial<ModifierGroup>): Promise<ModifierGroup>
  deleteModifierGroup(id: string): Promise<void>

  // Summary
  getSummary(): Promise<MenuSummary>
}

// ============================================================
// AGGREGATION
// ============================================================

export interface MenuSummary {
  totalItems: number
  availableItems: number
  soldOutItems: number
  hiddenItems: number
  categoryCount: number
  averagePrice: number
  featuredCount: number
}
