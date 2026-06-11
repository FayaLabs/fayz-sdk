import type {
  Product, StockMovement, StockPosition, StockLocation,
  Recipe, RecipeIngredient,
  CreateProductInput, CreateStockMovementInput, CreateRecipeInput,
  ProductQuery, MovementQuery,
  PaginatedResult, InventorySummary,
} from '../types'

export interface InventoryDataProvider {
  // --- Products ---
  getProducts(query: ProductQuery): Promise<PaginatedResult<Product>>
  getProductById(id: string): Promise<Product | null>
  createProduct(input: CreateProductInput): Promise<Product>
  updateProduct(id: string, data: Partial<Product>): Promise<Product>

  // --- Stock Movements ---
  getMovements(query: MovementQuery): Promise<PaginatedResult<StockMovement>>
  createMovement(input: CreateStockMovementInput): Promise<StockMovement>

  // --- Stock Positions ---
  getPositions(productId: string): Promise<StockPosition[]>

  // --- Stock Locations ---
  getLocations(): Promise<StockLocation[]>
  createLocation(data: { name: string; description?: string; unitId?: string }): Promise<StockLocation>

  // --- Recipes ---
  getRecipes(): Promise<Recipe[]>
  getRecipeById(id: string): Promise<Recipe | null>
  getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]>
  createRecipe(input: CreateRecipeInput): Promise<Recipe>

  // --- Summary ---
  getSummary(): Promise<InventorySummary>
}
