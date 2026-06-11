// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export type ProductStatus = 'draft' | 'active' | 'archived'

export interface Product {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  price: number
  compareAtPrice: number | null
  currency: string
  status: ProductStatus
  inventoryCount: number
  sku: string | null
  sortOrder: number
  metadata: Record<string, unknown>
  images: ProductImage[]
  categoryId: string | null
  categoryName: string | null
  isPhysical: boolean
  weight: number | null
  weightUnit: string
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  altText: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
}

export interface CreateProductInput {
  name: string
  slug?: string
  description?: string
  price: number
  compareAtPrice?: number
  currency?: string
  status?: ProductStatus
  inventoryCount?: number
  sku?: string
  sortOrder?: number
  metadata?: Record<string, unknown>
  categoryId?: string
  isPhysical?: boolean
  weight?: number
  weightUnit?: string
}

export interface UpdateProductInput {
  name?: string
  slug?: string
  description?: string
  price?: number
  compareAtPrice?: number | null
  currency?: string
  status?: ProductStatus
  inventoryCount?: number
  sku?: string | null
  sortOrder?: number
  metadata?: Record<string, unknown>
  categoryId?: string | null
  isPhysical?: boolean
  weight?: number | null
  weightUnit?: string
}

export interface ListProductsOptions {
  status?: ProductStatus
  categoryId?: string
  search?: string
  /** Exact-match slug lookup (storefront product-detail routing) */
  slug?: string
  limit?: number
  offset?: number
  orderBy?: 'name' | 'price' | 'created_at' | 'sort_order'
  order?: 'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface Category {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  sortOrder: number
  /** Showcase image (storefront category tiles). Not yet a shop_categories column. */
  imageUrl?: string | null
  children?: Category[]
  createdAt: string
}

export interface CreateCategoryInput {
  name: string
  slug?: string
  description?: string
  parentId?: string
  sortOrder?: number
}

export interface UpdateCategoryInput {
  name?: string
  slug?: string
  description?: string | null
  parentId?: string | null
  sortOrder?: number
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export type OrderStatus = 'open' | 'archived' | 'cancelled'
export type FinancialStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded' | 'voided'
export type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'

export interface Order {
  id: string
  tenantId: string
  orderNumber: number
  status: OrderStatus
  financialStatus: FinancialStatus
  fulfillmentStatus: FulfillmentStatus
  currency: string
  subtotal: number
  taxTotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  discountCode: string | null
  notes: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  total: number
  imageUrl: string | null
}

export interface CreateOrderInput {
  customerId?: string
  customerName?: string
  customerEmail?: string
  currency?: string
  notes?: string
  discountCode?: string
  discountTotal?: number
  shippingTotal?: number
  items: Array<{
    productId?: string
    name: string
    sku?: string
    quantity: number
    unitPrice: number
    imageUrl?: string
  }>
}

export interface UpdateOrderInput {
  status?: OrderStatus
  financialStatus?: FinancialStatus
  fulfillmentStatus?: FulfillmentStatus
  notes?: string
}

export interface ListOrdersOptions {
  status?: OrderStatus
  financialStatus?: FinancialStatus
  fulfillmentStatus?: FulfillmentStatus
  customerId?: string
  customerEmail?: string
  search?: string
  limit?: number
  offset?: number
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface ShopCustomer {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  notes: string | null
  ordersCount: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerInput {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  notes?: string
}

export interface UpdateCustomerInput {
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}

export interface ListCustomersOptions {
  search?: string
  limit?: number
  offset?: number
}

// ---------------------------------------------------------------------------
// Discount
// ---------------------------------------------------------------------------

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
export type DiscountMethod = 'code' | 'automatic'
export type DiscountStatus = 'active' | 'expired' | 'scheduled' | 'draft'

export interface Discount {
  id: string
  tenantId: string
  title: string
  code: string | null
  type: DiscountType
  method: DiscountMethod
  value: number
  usageLimit: number | null
  oncePerCustomer: boolean
  startsAt: string
  endsAt: string | null
  status: DiscountStatus
  timesUsed: number
  createdAt: string
  updatedAt: string
}

export interface CreateDiscountInput {
  title: string
  code?: string
  type: DiscountType
  method?: DiscountMethod
  value: number
  usageLimit?: number
  oncePerCustomer?: boolean
  startsAt?: string
  endsAt?: string
  status?: DiscountStatus
}

export interface UpdateDiscountInput {
  title?: string
  code?: string | null
  type?: DiscountType
  method?: DiscountMethod
  value?: number
  usageLimit?: number | null
  oncePerCustomer?: boolean
  startsAt?: string
  endsAt?: string | null
  status?: DiscountStatus
}

export interface ListDiscountsOptions {
  status?: DiscountStatus
  type?: DiscountType
  search?: string
  limit?: number
  offset?: number
}
