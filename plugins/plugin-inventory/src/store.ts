import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from '@fayz-ai/ui'
import type { InventoryDataProvider } from './data/types'
import type {
  Product, StockMovement, StockLocation, Recipe,
  InventorySummary, ProductQuery, MovementQuery,
  CreateProductInput, CreateStockMovementInput, CreateRecipeInput,
} from './types'

export interface InventoryUIState {
  products: Product[]
  productsTotal: number
  productsLoading: boolean
  productQuery: ProductQuery

  movements: StockMovement[]
  movementsTotal: number
  movementsLoading: boolean

  locations: StockLocation[]
  locationsLoading: boolean

  recipes: Recipe[]
  recipesLoading: boolean

  summary: InventorySummary | null
  summaryLoading: boolean

  fetchSummary(): Promise<void>
  fetchProducts(query: ProductQuery): Promise<void>
  fetchMovements(query: MovementQuery): Promise<void>
  fetchLocations(): Promise<void>
  fetchRecipes(): Promise<void>
  createProduct(input: CreateProductInput): Promise<Product>
  createMovement(input: CreateStockMovementInput): Promise<StockMovement>
  createRecipe(input: CreateRecipeInput): Promise<Recipe>
}

export function createInventoryStore(provider: InventoryDataProvider): StoreApi<InventoryUIState> {
  return createStore<InventoryUIState>((set, get) => ({
    products: [], productsTotal: 0, productsLoading: false, productQuery: {},
    movements: [], movementsTotal: 0, movementsLoading: false,
    locations: [], locationsLoading: false,
    recipes: [], recipesLoading: false,
    summary: null, summaryLoading: false,

    async fetchSummary() {
      return dedup('inv:summary', async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary()
        set({ summary, summaryLoading: false })
      })
    },

    async fetchProducts(query) {
      const key = 'inv:products:' + JSON.stringify(query)
      return dedup(key, async () => {
        set({ productsLoading: true, productQuery: query })
        const result = await provider.getProducts(query)
        set({ products: result.data, productsTotal: result.total, productsLoading: false })
      })
    },

    async fetchMovements(query) {
      return dedup('inv:movements:' + JSON.stringify(query), async () => {
        set({ movementsLoading: true })
        const result = await provider.getMovements(query)
        set({ movements: result.data, movementsTotal: result.total, movementsLoading: false })
      })
    },

    async fetchLocations() {
      return dedup('inv:locations', async () => {
        set({ locationsLoading: true })
        const locations = await provider.getLocations()
        set({ locations, locationsLoading: false })
      })
    },

    async fetchRecipes() {
      set({ recipesLoading: true })
      const recipes = await provider.getRecipes()
      set({ recipes, recipesLoading: false })
    },

    async createProduct(input) {
      try {
        const product = await provider.createProduct(input)
        const query = get().productQuery
        const [result, summary] = await Promise.all([provider.getProducts(query), provider.getSummary()])
        set({ products: result.data, productsTotal: result.total, summary })
        toast.success('Product created')
        return product
      } catch (err: any) {
        toast.error('Failed to create product', { description: err?.message })
        throw err
      }
    },

    async createMovement(input) {
      try {
        const movement = await provider.createMovement(input)
        const [summary] = await Promise.all([provider.getSummary()])
        set({ summary })
        toast.success('Stock movement recorded')
        return movement
      } catch (err: any) {
        toast.error('Failed to record movement', { description: err?.message })
        throw err
      }
    },

    async createRecipe(input) {
      try {
        const recipe = await provider.createRecipe(input)
        const recipes = await provider.getRecipes()
        set({ recipes })
        toast.success('Recipe created')
        return recipe
      } catch (err: any) {
        toast.error('Failed to create recipe', { description: err?.message })
        throw err
      }
    },
  }))
}
