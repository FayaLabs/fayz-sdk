import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from 'sonner'
import type { MenuDataProvider } from './data/types'
import type {
  MenuCategory, MenuItem, ModifierGroup, MenuSummary,
  MenuItemQuery,
  CreateMenuItemInput, UpdateMenuItemInput, CreateMenuCategoryInput,
} from './types'

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface MenuUIState {
  // Data cache
  categories: MenuCategory[]
  categoriesLoading: boolean

  menuItems: MenuItem[]
  menuItemsTotal: number
  menuItemsLoading: boolean
  menuItemQuery: MenuItemQuery

  modifierGroups: ModifierGroup[]
  modifiersLoading: boolean

  summary: MenuSummary | null
  summaryLoading: boolean

  // Actions
  fetchCategories(): Promise<void>
  fetchMenuItems(query: MenuItemQuery): Promise<void>
  fetchModifierGroups(): Promise<void>
  fetchSummary(): Promise<void>
  createMenuItem(input: CreateMenuItemInput): Promise<MenuItem>
  updateMenuItem(id: string, data: UpdateMenuItemInput): Promise<MenuItem>
  deleteMenuItem(id: string): Promise<void>
  toggleAvailability(id: string, field: string, value: any): Promise<void>
  createCategory(input: CreateMenuCategoryInput): Promise<MenuCategory>
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export function createMenuStore(provider: MenuDataProvider): StoreApi<MenuUIState> {
  return createStore<MenuUIState>((set, get) => ({
    categories: [],
    categoriesLoading: false,

    menuItems: [],
    menuItemsTotal: 0,
    menuItemsLoading: false,
    menuItemQuery: {},

    modifierGroups: [],
    modifiersLoading: false,

    summary: null,
    summaryLoading: false,

    async fetchCategories() {
      return dedup('menu:categories', async () => {
        set({ categoriesLoading: true })
        const categories = await provider.getCategories()
        set({ categories, categoriesLoading: false })
      })
    },

    async fetchMenuItems(query) {
      return dedup('menu:items:' + JSON.stringify(query), async () => {
        set({ menuItemsLoading: true, menuItemQuery: query })
        const result = await provider.getMenuItems(query)
        set({ menuItems: result.data, menuItemsTotal: result.total, menuItemsLoading: false })
      })
    },

    async fetchModifierGroups() {
      return dedup('menu:modifiers', async () => {
        set({ modifiersLoading: true })
        const modifierGroups = await provider.getModifierGroups()
        set({ modifierGroups, modifiersLoading: false })
      })
    },

    async fetchSummary() {
      return dedup('menu:summary', async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary()
        set({ summary, summaryLoading: false })
      })
    },

    async createMenuItem(input) {
      try {
        const item = await provider.createMenuItem(input)
        const query = get().menuItemQuery
        const [result, summary] = await Promise.all([provider.getMenuItems(query), provider.getSummary()])
        set({ menuItems: result.data, menuItemsTotal: result.total, summary })
        toast.success('Menu item created')
        return item
      } catch (err: any) {
        toast.error('Failed to create menu item', { description: err?.message })
        throw err
      }
    },

    async updateMenuItem(id, data) {
      try {
        const item = await provider.updateMenuItem(id, data)
        const query = get().menuItemQuery
        const result = await provider.getMenuItems(query)
        set({ menuItems: result.data, menuItemsTotal: result.total })
        toast.success('Menu item updated')
        return item
      } catch (err: any) {
        toast.error('Failed to update menu item', { description: err?.message })
        throw err
      }
    },

    async deleteMenuItem(id) {
      try {
        await provider.deleteMenuItem(id)
        const query = get().menuItemQuery
        const [result, summary] = await Promise.all([provider.getMenuItems(query), provider.getSummary()])
        set({ menuItems: result.data, menuItemsTotal: result.total, summary })
        toast.success('Menu item deleted')
      } catch (err: any) {
        toast.error('Failed to delete menu item', { description: err?.message })
        throw err
      }
    },

    async toggleAvailability(id, field, value) {
      try {
        await provider.toggleAvailability(id, field as any, value)
        const query = get().menuItemQuery
        const result = await provider.getMenuItems(query)
        set({ menuItems: result.data, menuItemsTotal: result.total })
      } catch (err: any) {
        toast.error('Failed to update availability', { description: err?.message })
        throw err
      }
    },

    async createCategory(input) {
      try {
        const category = await provider.createCategory(input)
        const categories = await provider.getCategories()
        set({ categories })
        toast.success('Category created')
        return category
      } catch (err: any) {
        toast.error('Failed to create category', { description: err?.message })
        throw err
      }
    },
  }))
}
