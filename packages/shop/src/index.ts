export type {
  Product, ProductImage, Category, ProductEnquiry, ProductEnquiryStatus,
  Order, OrderItem, OrderStatus, FinancialStatus, FulfillmentStatus,
  ShopCustomer, Discount, DiscountType, DiscountMethod, DiscountStatus,
  ProductStatus,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateProductEnquiryInput, ListProductEnquiriesOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions, ResolveCustomerInput,
  CreateDiscountInput, UpdateDiscountInput, ListDiscountsOptions,
  PlaceOrderInput, PlaceOrderLine,
  DiscountValidation, InventoryLine, InventoryIssue, InventoryCheck, CartTotalLine, CartTotals,
} from './types'

export type { ShopProvider } from './provider'
export {
  validateDiscount, applyDiscount, checkInventory, computeCartTotals, getCustomerOrders,
} from './commerce'
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
