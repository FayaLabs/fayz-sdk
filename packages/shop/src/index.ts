export type {
  Product, ProductImage, Category,
  Order, OrderItem, OrderStatus, FinancialStatus, FulfillmentStatus,
  ShopCustomer, Discount, DiscountType, DiscountMethod, DiscountStatus,
  ProductStatus,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions,
  CreateDiscountInput, UpdateDiscountInput, ListDiscountsOptions,
} from './types'

export type { ShopProvider } from './provider'
export { SupabaseShopProvider, createSupabaseShopProvider } from './supabase-provider'
export { MockShopProvider, createMockShopProvider } from './mock-provider'
export type { MockShopSeed } from './mock-provider'
export { setShopTenantResolver, getShopTenantId } from './tenant'
export type { TenantResolver } from './tenant'
export { getShopProvider, setShopProvider, resetShopProvider } from './runtime'

// Deterministic mock catalog (also useful for seeding real databases and tests)
export {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_DISCOUNTS,
  svgPlaceholder,
  buildMockCatalog,
} from './catalog'
export type { CatalogInput, CatalogProductInput, CatalogCategoryInput } from './catalog'
