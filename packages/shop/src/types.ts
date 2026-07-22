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
// Product enquiry
// ---------------------------------------------------------------------------

export type ProductEnquiryStatus = 'new' | 'contacted' | 'closed'

export interface ProductEnquiry {
  id: string
  tenantId: string
  productId: string | null
  productName: string
  productSlug: string | null
  customerName: string
  customerEmail: string
  customerPhone: string | null
  subject: string | null
  message: string
  sourceUrl: string | null
  status: ProductEnquiryStatus
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateProductEnquiryInput {
  productId?: string
  productName: string
  productSlug?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  subject?: string
  message: string
  sourceUrl?: string
  metadata?: Record<string, unknown>
}

export interface ListProductEnquiriesOptions {
  productId?: string
  customerEmail?: string
  status?: ProductEnquiryStatus
  limit?: number
  offset?: number
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
  /** Frozen delivery address captured at purchase time (0010/0012). */
  shippingAddress: ShippingAddressSnapshot | null
  /** How the buyer paid — opens the ledger row in public.transactions. */
  paymentMethodKind: PaymentMethodKind | null
  paidAt: string | null
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
// Order placement (server-trust primitive)
// ---------------------------------------------------------------------------

/**
 * A single line in a trusted order-placement request. Carries NO price — the
 * server re-reads the product price from the catalog so the browser can never
 * set what it pays.
 */
export interface PlaceOrderLine {
  productId: string
  quantity: number
  /** Variant/options label appended to the stored item name (display only). */
  optionsLabel?: string
}

/**
 * Input for {@link ShopProvider.placeOrder} — the only trusted path to create a
 * storefront order. Prices, discount math, and inventory are resolved
 * server-side; the client supplies product ids, quantities, and intent only.
 */
/** Structured delivery address. Mirrors public.addresses so the RPC can both
 *  freeze it on the order and save it to the customer's address book. */
export interface ShippingAddressInput {
  postalCode: string
  street: string
  number?: string
  complement?: string
  district?: string
  city: string
  state: string
  country?: string
  recipient?: string
  phone?: string
  label?: string
}

export type PaymentMethodKind = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'cash' | 'other'

/**
 * A range of postal codes the store delivers to, with its own price and ETA.
 *
 * `postalFrom`/`postalTo` are 8 digits, no punctuation. Ranges may overlap: the
 * cheapest match wins, which is how a merchant layers a promotional zone over a
 * broader one without deleting anything.
 */
export interface ShippingZone {
  id: string
  tenantId: string
  name: string
  carrier?: string | null
  postalFrom: string
  postalTo: string
  rate: number
  /** Overrides the store-wide free-delivery threshold inside this zone. */
  freeAbove?: number | null
  etaMinDays?: number | null
  etaMaxDays?: number | null
  active: boolean
  sortOrder: number
}

export type CreateShippingZoneInput = Omit<ShippingZone, 'id' | 'tenantId'>
export type UpdateShippingZoneInput = Partial<CreateShippingZoneInput>

/**
 * One delivery option for a postal code, as quoted by shop_quote_shipping.
 *
 * `rate` already has the zone's free-above threshold applied, so the caller
 * never re-derives a price — the number shown is the number charged. An EMPTY
 * list of options is the meaningful answer "we do not deliver there", not an
 * error condition.
 */
export interface ShippingQuoteOption {
  zoneId: string
  name: string
  carrier?: string
  /** Resolved against the subtotal the quote was requested for. */
  rate: number
  /** The zone's price before any free-above rule — lets a caller re-resolve
   *  `rate` for a changed cart without another round trip, using the same rule
   *  the server applies. Without it a stale quote had to fall back to the
   *  store-wide flat rate, which is a different zone's price. */
  baseRate: number
  freeAbove?: number | null
  etaMinDays?: number
  etaMaxDays?: number
  /** True when the rate is 0 because the order cleared the zone's threshold. */
  free: boolean
}

/**
 * A row from the customer's address book (public.addresses).
 *
 * Only reachable with a signed-in shopper: the addresses_self_read policy joins
 * plg_shop_customers.auth_user_id to auth.uid(), so an anonymous request sees
 * nothing. Guests get an empty book and type their address, which is correct —
 * the alternative is showing them somebody else's.
 */
export interface CustomerAddress extends ShippingAddressInput {
  id: string
  isDefault?: boolean
}

/** Address as stored on the order: snake_case, mirroring public.addresses. */
export interface ShippingAddressSnapshot {
  postal_code?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  city?: string
  state?: string
  country?: string
  recipient?: string
  phone?: string
  label?: string
  raw?: string
  source?: string
}

export interface PlaceOrderInput {
  /** Tenant/store id. The Supabase provider falls back to the resolved shop tenant. */
  tenantId?: string
  /** Existing customer id (preferred when the session already resolved one). */
  customerId?: string
  /** Customer identity for find-or-create when {@link PlaceOrderInput.customerId} is absent. */
  customer?: { name?: string; email?: string }
  currency?: string
  notes?: string
  /** Discount code to validate + apply server-side (never trust a client total). */
  discountCode?: string
  /** Shipping cost from the store's shipping policy. Clamped to >= 0 server-side. */
  shippingTotal?: number
  /** Structured delivery address. Without it the address survives only as free
   *  text in `notes`, which logistics cannot read. */
  shippingAddress?: ShippingAddressInput
  /** How the buyer is paying. Opens the ledger row in public.transactions. */
  paymentMethod?: PaymentMethodKind
  items: PlaceOrderLine[]
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

/**
 * Input for {@link ShopProvider.resolveCustomer} — find-or-create a customer by
 * email and (on Supabase) link it to the authenticated user (auth.uid) so
 * "my orders" can be enforced by RLS. Runs server-side; the browser never
 * supplies the auth id.
 */
export interface ResolveCustomerInput {
  email: string
  name?: string
  /** Tenant/store id. The Supabase provider falls back to the resolved shop tenant. */
  tenantId?: string
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

// ---------------------------------------------------------------------------
// Commerce primitives (FAY-1193) — provider-agnostic helpers for custom workflows
// ---------------------------------------------------------------------------

export interface DiscountValidation {
  valid: boolean
  code: string | null
  type: DiscountType | null
  /** Percentage points for 'percentage'; absolute amount for 'fixed_amount'. */
  value: number
  /** Machine-readable reason when invalid: not_found | expired | not_started | usage_limit | unsupported | empty */
  reason?: string
}

export interface InventoryLine {
  productId: string
  quantity: number
}

export interface InventoryIssue {
  productId: string
  name: string
  requested: number
  available: number
}

export interface InventoryCheck {
  ok: boolean
  issues: InventoryIssue[]
}

export interface CartTotalLine {
  productId: string
  name: string
  sku: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface CartTotals {
  lines: CartTotalLine[]
  subtotal: number
  discountTotal: number
  discountCode: string | null
  taxTotal: number
  shippingTotal: number
  total: number
}
