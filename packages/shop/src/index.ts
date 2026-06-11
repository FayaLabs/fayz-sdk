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

// ---------------------------------------------------------------------------
// Auto-selecting factory — Supabase when initialized, mock otherwise
// ---------------------------------------------------------------------------

import { getSupabaseClientOptional } from '@fayz/core'
import type { ShopProvider } from './provider'
import { createSupabaseShopProvider } from './supabase-provider'
import { createMockShopProvider } from './mock-provider'

let _provider: ShopProvider | null = null
let _mockFallback: ShopProvider | null = null

export function getShopProvider(): ShopProvider {
  if (_provider) return _provider
  // Only cache once Supabase is available — apps may call this before
  // setGlobalSupabaseClient() runs, and the choice should upgrade afterwards.
  if (getSupabaseClientOptional()) {
    _provider = createSupabaseShopProvider()
    return _provider
  }
  if (!_mockFallback) _mockFallback = createMockShopProvider()
  return _mockFallback
}

export function setShopProvider(provider: ShopProvider): void {
  _provider = provider
}

// Deterministic mock catalog (also useful for seeding real databases and tests)
export { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_DISCOUNTS, svgPlaceholder } from './mock-catalog'
export { buildMockCatalog } from './mock-catalog'
export type { CatalogInput, CatalogProductInput, CatalogCategoryInput } from './mock-catalog'
