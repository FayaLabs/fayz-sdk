import type {
  MenuCategory, MenuItem, ModifierGroup,
  CreateMenuItemInput, UpdateMenuItemInput, CreateMenuCategoryInput,
  MenuItemQuery, PaginatedResult, MenuSummary,
} from '../types'

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
