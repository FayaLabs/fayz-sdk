export interface FayzShopProviderOptions {
  supabaseUrl?: string
  publishableKey?: string
  storeId?: string
  apiBaseUrl?: string
  projectId?: string
  mode?: 'broker' | 'supabase'
  productMetadata?: FayzShopProductMetadataOverlay[]
  fetcher?: typeof fetch
}

/**
 * The signed-in shopper's access token, when there is one.
 *
 * PostgREST decides who you are from the Authorization bearer, and this client
 * used to send the publishable key unconditionally — so every request arrived
 * as `anon` even with a customer logged in. auth.uid() was therefore always
 * null, which is why shop_resolve_customer never linked auth_user_id (0 of 519
 * customers in the pool) and why the self-read policy on public.addresses could
 * never match a row.
 *
 * A module-level resolver rather than a per-app option on purpose: the wiring
 * is done once by initStorefrontRuntime, so a storefront cannot forget it and
 * silently fall back to anonymous. Mirrors setShopTenantResolver in plugin-shop.
 */
type AccessTokenResolver = () => string | null | undefined

let _accessTokenResolver: AccessTokenResolver | null = null

export function setShopAccessTokenResolver(resolver: AccessTokenResolver | null): void {
  _accessTokenResolver = resolver
}

export interface FayzShopProductMetadataOverlay {
  sku?: string | null
  slug?: string | null
  metadata: Record<string, unknown>
}

export type FayzShopProductStatus = 'draft' | 'active' | 'archived'
export type FayzShopOrderStatus = 'open' | 'archived' | 'cancelled'
export type FayzShopFinancialStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded' | 'voided'
export type FayzShopFulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'

export interface FayzShopListProductsOptions {
  status?: FayzShopProductStatus
  categoryId?: string
  search?: string
  slug?: string
  limit?: number
  offset?: number
  orderBy?: 'name' | 'price' | 'created_at' | 'sort_order'
  order?: 'asc' | 'desc'
}

export interface FayzShopListOrdersOptions {
  status?: FayzShopOrderStatus
  financialStatus?: FayzShopFinancialStatus
  fulfillmentStatus?: FayzShopFulfillmentStatus
  customerId?: string
  customerEmail?: string
  search?: string
  limit?: number
  offset?: number
}

export interface FayzShopListCustomersOptions {
  search?: string
  limit?: number
  offset?: number
}

export interface FayzShopListDiscountsOptions {
  status?: string
  type?: string
  search?: string
  limit?: number
  offset?: number
}

interface ProductImageRow {
  id: string
  product_id: string
  url: string
  alt_text?: string | null
  sort_order?: number | null
  is_primary?: boolean | null
  created_at?: string | null
}

interface ProductRow {
  id: string
  tenant_id: string
  name: string
  slug?: string | null
  description?: string | null
  price?: number | null
  compare_at_price?: number | null
  currency?: string | null
  status?: FayzShopProductStatus | null
  inventory_count?: number | null
  sku?: string | null
  sort_order?: number | null
  metadata?: Record<string, unknown> | null
  images?: ProductImageRow[] | null
  category_id?: string | null
  category?: { name?: string | null } | null
  is_physical?: boolean | null
  weight?: number | null
  weight_unit?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface StoreCategoryMetadata {
  id?: string | null
  name?: string | null
  slug?: string | null
  description?: string | null
  imageUrl?: string | null
  sortOrder?: number | null
}

interface CategoryRow {
  id: string
  tenant_id?: string | null
  name: string
  slug?: string | null
  description?: string | null
  parent_id?: string | null
  sort_order?: number | null
  image_url?: string | null
  created_at?: string | null
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id?: string | null
  name: string
  sku?: string | null
  quantity?: number | null
  unit_price?: number | null
  total?: number | null
  image_url?: string | null
}

interface OrderRow {
  id: string
  tenant_id: string
  order_number?: number | null
  status?: FayzShopOrderStatus | null
  financial_status?: FayzShopFinancialStatus | null
  fulfillment_status?: FayzShopFulfillmentStatus | null
  currency?: string | null
  subtotal?: number | null
  tax_total?: number | null
  discount_total?: number | null
  shipping_total?: number | null
  total?: number | null
  customer_id?: string | null
  customer_name?: string | null
  customer_email?: string | null
  discount_code?: string | null
  notes?: string | null
  shipping_address?: Record<string, string | undefined> | null
  payment_method_kind?: string | null
  paid_at?: string | null
  items?: OrderItemRow[] | null
  created_at?: string | null
  updated_at?: string | null
}

/** One row of shop_quote_shipping's result set. */
interface ShippingQuoteRow {
  zone_id: string
  name: string
  carrier: string | null
  rate: number | string | null
  base_rate: number | string | null
  free_above: number | string | null
  eta_min_days: number | null
  eta_max_days: number | null
  free: boolean | null
}

/** public.addresses, as PostgREST returns it. */
interface AddressRow {
  id: string
  label: string | null
  recipient: string | null
  phone: string | null
  postal_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  country: string | null
  is_default: boolean | null
}

interface CustomerRow {
  id: string
  tenant_id: string
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
  orders_count?: number | null
  total_spent?: number | null
  created_at?: string | null
  updated_at?: string | null
}

interface DiscountRow {
  id: string
  tenant_id: string
  title: string
  code?: string | null
  type: string
  method?: string | null
  value?: number | null
  usage_limit?: number | null
  once_per_customer?: boolean | null
  starts_at?: string | null
  ends_at?: string | null
  status?: string | null
  times_used?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export class FayzShopError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: unknown,
  ) {
    super(message)
    this.name = 'FayzShopError'
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function nowIso(): string {
  return new Date().toISOString()
}

function present<T>(value: T | null | undefined, fallback: T): T {
  return value == null ? fallback : value
}

function productMetadataKey(kind: 'sku' | 'slug', value: string): string {
  return `${kind}:${value.toLowerCase()}`
}

function buildProductMetadataOverlay(overlays: FayzShopProductMetadataOverlay[] | undefined) {
  const map = new Map<string, Record<string, unknown>>()
  for (const overlay of overlays ?? []) {
    if (overlay.sku) map.set(productMetadataKey('sku', overlay.sku), overlay.metadata)
    if (overlay.slug) map.set(productMetadataKey('slug', overlay.slug), overlay.metadata)
  }
  return map
}

function asUuid(value: string | null | undefined): string | null {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

function rowToImage(row: ProductImageRow) {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    altText: row.alt_text ?? null,
    sortOrder: row.sort_order ?? 0,
    isPrimary: row.is_primary ?? false,
    createdAt: row.created_at ?? nowIso(),
  }
}

function getProductMetadata(row: ProductRow, overlay?: Map<string, Record<string, unknown>>): Record<string, unknown> {
  const metadata = row.metadata ?? {}
  const bySlug = overlay?.get(productMetadataKey('slug', row.slug ?? slugify(row.name)))
  const bySku = row.sku ? overlay?.get(productMetadataKey('sku', row.sku)) : undefined
  return { ...(bySlug ?? {}), ...(bySku ?? {}), ...metadata }
}

function getStoreCategory(row: ProductRow, overlay?: Map<string, Record<string, unknown>>): StoreCategoryMetadata | null {
  const raw = getProductMetadata(row, overlay).fayzStoreCategory
  return raw && typeof raw === 'object' ? raw as StoreCategoryMetadata : null
}

function rowToProduct(row: ProductRow, overlay?: Map<string, Record<string, unknown>>) {
  const metadata = getProductMetadata(row, overlay)
  const storeCategory = getStoreCategory(row, overlay)
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    description: row.description ?? null,
    price: row.price ?? 0,
    compareAtPrice: row.compare_at_price ?? null,
    currency: row.currency ?? 'BRL',
    status: row.status ?? 'active',
    inventoryCount: row.inventory_count ?? 0,
    sku: row.sku ?? null,
    sortOrder: row.sort_order ?? 0,
    metadata,
    images: Array.isArray(row.images) ? row.images.map(rowToImage) : [],
    categoryId: storeCategory?.id ?? row.category_id ?? null,
    categoryName: storeCategory?.name ?? row.category?.name ?? null,
    isPhysical: row.is_physical ?? true,
    weight: row.weight ?? null,
    weightUnit: row.weight_unit ?? 'kg',
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function rowToCategory(row: CategoryRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? 'global',
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    description: row.description ?? null,
    parentId: row.parent_id ?? null,
    sortOrder: row.sort_order ?? 0,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at ?? nowIso(),
  }
}

function storeCategoryToCategory(category: StoreCategoryMetadata, tenantId: string) {
  const name = category.name ?? 'Category'
  return {
    id: category.id ?? slugify(name),
    tenantId,
    name,
    slug: category.slug ?? slugify(name),
    description: category.description ?? null,
    parentId: null,
    sortOrder: category.sortOrder ?? 0,
    imageUrl: category.imageUrl ?? null,
    createdAt: nowIso(),
  }
}

function deriveStoreCategories(products: ProductRow[], tenantId: string) {
  const categories = new Map<string, ReturnType<typeof storeCategoryToCategory>>()
  for (const product of products) {
    const category = getStoreCategory(product)
    if (!category?.name && !category?.id) continue
    const mapped = storeCategoryToCategory(category, tenantId)
    categories.set(mapped.id, mapped)
  }
  return [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

function rowToOrder(row: OrderRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderNumber: row.order_number ?? 0,
    status: row.status ?? 'open',
    financialStatus: row.financial_status ?? 'pending',
    fulfillmentStatus: row.fulfillment_status ?? 'unfulfilled',
    currency: row.currency ?? 'BRL',
    subtotal: row.subtotal ?? 0,
    taxTotal: row.tax_total ?? 0,
    discountTotal: row.discount_total ?? 0,
    shippingTotal: row.shipping_total ?? 0,
    total: row.total ?? 0,
    customerId: row.customer_id ?? null,
    customerName: row.customer_name ?? null,
    customerEmail: row.customer_email ?? null,
    discountCode: row.discount_code ?? null,
    notes: row.notes ?? null,
    shippingAddress: row.shipping_address ?? null,
    paymentMethodKind: row.payment_method_kind ?? null,
    paidAt: row.paid_at ?? null,
    items: Array.isArray(row.items) ? row.items.map(rowToOrderItem) : [],
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function rowToOrderItem(row: OrderItemRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id ?? null,
    name: row.name,
    sku: row.sku ?? null,
    quantity: row.quantity ?? 0,
    unitPrice: row.unit_price ?? 0,
    total: row.total ?? 0,
    imageUrl: row.image_url ?? null,
  }
}

function rowToCustomer(row: CustomerRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: row.first_name,
    lastName: row.last_name ?? '',
    email: row.email ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    ordersCount: row.orders_count ?? 0,
    totalSpent: row.total_spent ?? 0,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function rowToDiscount(row: DiscountRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    code: row.code ?? null,
    type: row.type,
    method: row.method ?? 'code',
    value: row.value ?? 0,
    usageLimit: row.usage_limit ?? null,
    oncePerCustomer: row.once_per_customer ?? false,
    startsAt: row.starts_at ?? nowIso(),
    endsAt: row.ends_at ?? null,
    status: row.status ?? 'active',
    timesUsed: row.times_used ?? 0,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function updateOrderPayload(input: {
  status?: FayzShopOrderStatus
  financialStatus?: FayzShopFinancialStatus
  fulfillmentStatus?: FayzShopFulfillmentStatus
  notes?: string
}) {
  const updates: Record<string, unknown> = {}
  if (input.status !== undefined) updates.status = input.status
  if (input.financialStatus !== undefined) updates.financial_status = input.financialStatus
  if (input.fulfillmentStatus !== undefined) updates.fulfillment_status = input.fulfillmentStatus
  if (input.notes !== undefined) updates.notes = input.notes
  return updates
}

export function createFayzShopProvider(options: FayzShopProviderOptions) {
  if (options.mode === 'broker' || options.apiBaseUrl || options.projectId) {
    return createBrokerShopProvider(options)
  }

  if (!options.supabaseUrl || !options.publishableKey || !options.storeId) {
    throw new FayzShopError('Fayz Shop provider requires either broker apiBaseUrl/projectId or legacy supabaseUrl/publishableKey/storeId.', 400)
  }

  const baseUrl = `${normalizeBaseUrl(options.supabaseUrl)}/rest/v1`
  const fetcher = options.fetcher ?? fetch
  const key = options.publishableKey
  const storeId = options.storeId
  const productMetadataOverlay = buildProductMetadataOverlay(options.productMetadata)

  async function request<T>(table: string, init: RequestInit & { query?: URLSearchParams } = {}): Promise<T> {
    const query = init.query?.toString()
    const response = await fetcher(`${baseUrl}/${table}${query ? `?${query}` : ''}`, {
      ...init,
      headers: {
        apikey: key,
        // Declares which store this read is for. Until 0020 tenant isolation was
        // a client-side convention (a tenant_id filter the caller could simply
        // omit, returning every merchant's catalogue); the RLS policy now reads
        // this header, so the scope is enforced server-side.
        'x-fayz-store': storeId,
        // The shopper's JWT when signed in, the publishable key otherwise. The
        // apikey header stays the publishable key either way — Supabase uses it
        // to route the project, not to authenticate.
        Authorization: `Bearer ${_accessTokenResolver?.() || key}`,
        ...(init.body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
        ...init.headers,
      },
    })
    const text = await response.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      body = text
    }
    if (!response.ok) {
      const message = typeof body === 'object' && body
        ? String((body as { message?: unknown; error?: unknown }).message ?? (body as { error?: unknown }).error ?? `Fayz Shop request failed with status ${response.status}`)
        : `Fayz Shop request failed with status ${response.status}`
      throw new FayzShopError(message, response.status, body)
    }
    return body as T
  }

  const tenantQuery = () => {
    const query = new URLSearchParams()
    query.set('tenant_id', `eq.${storeId}`)
    return query
  }

  const singleById = (id: string) => {
    const query = tenantQuery()
    query.set('id', `eq.${id}`)
    query.set('limit', '1')
    return query
  }

  return {
    async listProducts(options?: FayzShopListProductsOptions) {
      const query = tenantQuery()
      query.set('select', '*,images:plg_shop_product_images(*),category:plg_shop_categories(name)')
      if (options?.status) query.set('status', `eq.${options.status}`)
      if (options?.slug) query.set('slug', `eq.${options.slug}`)
      if (options?.search) query.set('name', `ilike.*${options.search}*`)
      query.set('order', `${options?.orderBy ?? 'sort_order'}.${options?.order ?? 'asc'}`)
      if (options?.limit) query.set('limit', String(options.limit))
      if (options?.offset) query.set('offset', String(options.offset))
      const products = (await request<ProductRow[]>('plg_shop_products', { query })).map((row) => rowToProduct(row, productMetadataOverlay))
      return options?.categoryId ? products.filter((product) => product.categoryId === options.categoryId) : products
    },
    async getProduct(id: string) {
      // Cart lines can carry non-uuid ids (mock catalog, or a cart persisted in
      // an earlier mock-mode session). PostgREST would 400 on `id=eq.p-05`
      // (invalid uuid), so treat any non-uuid id as "not found" instead.
      if (!asUuid(id)) return null
      const query = singleById(id)
      query.set('select', '*,images:plg_shop_product_images(*),category:plg_shop_categories(name)')
      const rows = await request<ProductRow[]>('plg_shop_products', { query })
      return rows[0] ? rowToProduct(rows[0], productMetadataOverlay) : null
    },
    async createProduct() {
      throw new FayzShopError('Product writes require the Fayz admin/broker API.', 501)
    },
    async updateProduct() {
      throw new FayzShopError('Product writes require the Fayz admin/broker API.', 501)
    },
    async deleteProduct() {
      throw new FayzShopError('Product writes require the Fayz admin/broker API.', 501)
    },
    async uploadProductImage() {
      throw new FayzShopError('Product image uploads require the Fayz admin/broker API.', 501)
    },
    async deleteProductImage() {
      throw new FayzShopError('Product image deletes require the Fayz admin/broker API.', 501)
    },
    async listCategories() {
      const productQuery = tenantQuery()
      productQuery.set('select', 'metadata')
      productQuery.set('order', 'sort_order.asc')
      const products = await request<ProductRow[]>('plg_shop_products', { query: productQuery })
      const storeCategories = deriveStoreCategories(products, storeId)
      if (storeCategories.length > 0) return storeCategories

      const query = new URLSearchParams()
      query.set('select', '*')
      query.set('order', 'sort_order.asc')
      return (await request<CategoryRow[]>('plg_shop_categories', { query })).map(rowToCategory)
    },
    async createCategory() {
      throw new FayzShopError('Category writes require the Fayz admin/broker API.', 501)
    },
    async updateCategory() {
      throw new FayzShopError('Category writes require the Fayz admin/broker API.', 501)
    },
    async deleteCategory() {
      throw new FayzShopError('Category deletes require the Fayz admin/broker API.', 501)
    },
    async listOrders(options?: FayzShopListOrdersOptions) {
      const query = tenantQuery()
      query.set('select', '*,items:plg_shop_order_items(*)')
      if (options?.status) query.set('status', `eq.${options.status}`)
      if (options?.financialStatus) query.set('financial_status', `eq.${options.financialStatus}`)
      if (options?.fulfillmentStatus) query.set('fulfillment_status', `eq.${options.fulfillmentStatus}`)
      if (options?.customerId) query.set('customer_id', `eq.${options.customerId}`)
      if (options?.customerEmail) query.set('customer_email', `eq.${options.customerEmail}`)
      if (options?.search) query.set('or', `(customer_name.ilike.*${options.search}*,customer_email.ilike.*${options.search}*)`)
      query.set('order', 'created_at.desc')
      if (options?.limit) query.set('limit', String(options.limit))
      if (options?.offset) query.set('offset', String(options.offset))
      // Anon storefronts have no table grant (RLS restricts plg_shop_orders reads to
      // `authenticated` users linked via auth.uid) — direct read 401s. RLS can also
      // just filter every row out silently (200 OK + []) instead of 401ing, so an
      // empty result here doesn't mean "no orders" either — both cases must fall
      // back to the customer-uuid-capability RPC, same pattern as getOrder's
      // shop_get_order. This is what made "Minhas compras" empty after a guest
      // checkout — the order was there, the read just wasn't allowed (or silently
      // filtered), and only the throw case used to be handled.
      let rows: OrderRow[] = []
      try {
        rows = await request<OrderRow[]>('plg_shop_orders', { query })
      } catch (error) {
        if (!options?.customerId) throw error
      }
      if (rows.length || !options?.customerId) return rows.map(rowToOrder)
      // Only the customer-scoped query has an RPC counterpart: shop_list_orders
      // treats the customer uuid as the read capability, exactly like
      // shop_get_order treats the order uuid. Any other filter combination has
      // no anon-safe equivalent, so the original error (if any) stands.
      const rpcRows = await request<OrderRow[]>('rpc/shop_list_orders', {
        method: 'POST',
        body: JSON.stringify({ p_customer_id: options.customerId, p_limit: options.limit ?? 50 }),
      })
      return (rpcRows ?? []).map(rowToOrder)
    },
    async getOrder(id: string) {
      const query = singleById(id)
      query.set('select', '*,items:plg_shop_order_items(*)')
      // Anon storefronts have no table grant at all — the direct read throws
      // (401) rather than returning empty, so it must not short-circuit the
      // RPC fallback below.
      let rows: OrderRow[] = []
      try {
        rows = await request<OrderRow[]>('plg_shop_orders', { query })
      } catch {
        /* fall through to shop_get_order */
      }
      if (rows[0]) return rowToOrder(rows[0])
      // Anon storefronts can't SELECT plg_shop_orders (RLS); the order uuid acts
      // as the read capability through the whitelisted RPC.
      try {
        const row = await request<OrderRow | null>('rpc/shop_get_order', {
          method: 'POST',
          body: JSON.stringify({ p_order_id: id }),
        })
        return row ? rowToOrder(row) : null
      } catch {
        return null
      }
    },
    async confirmPayment(id: string, reference?: string) {
      // Mock/dev payment seam: anon has no UPDATE grant on plg_shop_orders,
      // so the pending->paid transition goes through the whitelisted RPC
      // (order uuid = capability, same contract as shop_get_order).
      const row = await request<OrderRow | null>('rpc/shop_confirm_payment', {
        method: 'POST',
        body: JSON.stringify({ p_order_id: id, p_reference: reference ?? null }),
      })
      return row ? rowToOrder(row) : null
    },
    async createOrder(input: {
      customerId?: string
      customerName?: string
      customerEmail?: string
      currency?: string
      notes?: string
      discountCode?: string
      discountTotal?: number
      shippingTotal?: number
      items: Array<{ productId?: string; name: string; sku?: string; quantity: number; unitPrice: number; imageUrl?: string }>
    }) {
      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const discountTotal = input.discountTotal ?? 0
      const shippingTotal = input.shippingTotal ?? 0
      const total = Math.round((subtotal - discountTotal + shippingTotal) * 100) / 100
      const [order] = await request<OrderRow[]>('plg_shop_orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: storeId,
          customer_id: input.customerId ?? null,
          customer_name: input.customerName ?? null,
          customer_email: input.customerEmail ?? null,
          currency: input.currency ?? 'BRL',
          notes: input.notes ?? null,
          subtotal,
          discount_total: discountTotal,
          shipping_total: shippingTotal,
          discount_code: input.discountCode ?? null,
          total,
          status: 'open',
          financial_status: 'pending',
          fulfillment_status: 'unfulfilled',
        }),
      })
      if (!order) throw new FayzShopError('Order insert did not return a row.', 500)
      if (input.items.length) {
        await request<OrderItemRow[]>('plg_shop_order_items', {
          method: 'POST',
          body: JSON.stringify(input.items.map((item) => ({
            order_id: order.id,
            product_id: asUuid(item.productId),
            name: item.name,
            sku: item.sku ?? null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.quantity * item.unitPrice,
            image_url: item.imageUrl ?? null,
          }))),
        })
      }
      return this.getOrder(order.id)
    },
    async updateOrder(id: string, input: Parameters<typeof updateOrderPayload>[0]) {
      await request<OrderRow[]>('plg_shop_orders', {
        method: 'PATCH',
        query: singleById(id),
        body: JSON.stringify(updateOrderPayload(input)),
      })
      return this.getOrder(id)
    },
    async placeOrder(input: {
      tenantId?: string
      customerId?: string
      customer?: { name?: string; email?: string }
      currency?: string
      notes?: string
      discountCode?: string
      shippingTotal?: number
      /** Structured delivery address; frozen on the order and saved to the
       *  customer's address book by the RPC. */
      shippingAddress?: {
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
      paymentMethod?: 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'cash' | 'other'
      items: Array<{ productId: string; quantity: number; optionsLabel?: string }>
    }) {
      // Trusted placement: the shop_place_order SECURITY DEFINER RPC re-reads
      // prices, validates discount/stock and writes order+items atomically.
      // Direct INSERTs are blocked for anon by RLS on the shared FayzApi.
      const orderId = await request<string>('rpc/shop_place_order', {
        method: 'POST',
        body: JSON.stringify({
          p_tenant_id: input.tenantId ?? storeId,
          p_items: input.items.map((line) => ({
            product_id: line.productId,
            quantity: line.quantity,
            options_label: line.optionsLabel ?? null,
          })),
          p_customer_id: asUuid(input.customerId ?? undefined),
          p_customer_name: input.customer?.name ?? null,
          p_customer_email: input.customer?.email ?? null,
          p_currency: input.currency ?? 'BRL',
          p_discount_code: input.discountCode ?? null,
          p_shipping_total: input.shippingTotal ?? 0,
          // snake_case keys on purpose: the RPC freezes this jsonb onto the
          // order and public.addresses uses these exact column names.
          p_shipping_address: input.shippingAddress
            ? {
                postal_code: input.shippingAddress.postalCode,
                street: input.shippingAddress.street,
                number: input.shippingAddress.number ?? null,
                complement: input.shippingAddress.complement ?? null,
                district: input.shippingAddress.district ?? null,
                city: input.shippingAddress.city,
                state: input.shippingAddress.state,
                country: input.shippingAddress.country ?? 'BR',
                recipient: input.shippingAddress.recipient ?? null,
                phone: input.shippingAddress.phone ?? null,
                label: input.shippingAddress.label ?? null,
              }
            : null,
          p_payment_method: input.paymentMethod ?? null,
          p_notes: input.notes ?? null,
        }),
      })
      const order = await this.getOrder(orderId)
      if (!order) throw new FayzShopError('Order was placed but could not be read back.', 500)
      return order
    },
    async listCustomers(options?: FayzShopListCustomersOptions) {
      const query = tenantQuery()
      query.set('select', '*')
      query.set('order', 'first_name.asc')
      if (options?.search) query.set('or', `(first_name.ilike.*${options.search}*,last_name.ilike.*${options.search}*,email.ilike.*${options.search}*)`)
      if (options?.limit) query.set('limit', String(options.limit))
      if (options?.offset) query.set('offset', String(options.offset))
      return (await request<CustomerRow[]>('plg_shop_customers', { query })).map(rowToCustomer)
    },
    async getCustomer(id: string) {
      const rows = await request<CustomerRow[]>('plg_shop_customers', { query: singleById(id) })
      return rows[0] ? rowToCustomer(rows[0]) : null
    },
    async resolveCustomer(input: { email: string; name?: string }) {
      const row = await request<CustomerRow | CustomerRow[]>('rpc/shop_resolve_customer', {
        method: 'POST',
        body: JSON.stringify({
          p_tenant_id: storeId,
          p_email: input.email,
          p_name: input.name ?? null,
        }),
      })
      const customer = Array.isArray(row) ? row[0] : row
      if (!customer) throw new FayzShopError('shop_resolve_customer returned no row.', 500)
      return rowToCustomer(customer)
    },
    async quoteShipping(postalCode: string, subtotal: number) {
      const digits = (postalCode || '').replace(/\D/g, '')
      if (digits.length !== 8) return []
      const rows = await request<ShippingQuoteRow[]>('rpc/shop_quote_shipping', {
        method: 'POST',
        body: JSON.stringify({
          p_tenant_id: storeId,
          p_postal_code: digits,
          p_subtotal: subtotal,
        }),
      })
      return (rows ?? []).map((row) => ({
        zoneId: row.zone_id,
        name: row.name,
        carrier: row.carrier ?? undefined,
        rate: Number(row.rate ?? 0),
        baseRate: Number(row.base_rate ?? row.rate ?? 0),
        freeAbove: row.free_above == null ? null : Number(row.free_above),
        etaMinDays: row.eta_min_days ?? undefined,
        etaMaxDays: row.eta_max_days ?? undefined,
        free: Boolean(row.free),
      }))
    },
    async listCustomerAddresses(customerId: string) {
      if (!asUuid(customerId)) return []
      const query = new URLSearchParams()
      query.set('select', 'id,label,recipient,phone,postal_code,street,number,complement,district,city,state,country,is_default')
      query.set('owner_type', 'eq.shop_customer')
      query.set('owner_id', `eq.${customerId}`)
      query.set('order', 'is_default.desc,created_at.desc')
      // RLS (addresses_self_read) is the real filter — it matches only rows
      // whose customer is linked to auth.uid(). An anonymous or mismatched
      // caller gets [] rather than an error, so guest checkout just sees an
      // empty address book instead of a failure it cannot act on.
      const rows = await request<AddressRow[]>('addresses', { query }).catch(() => [] as AddressRow[])
      return rows.map((row) => ({
        id: row.id,
        label: row.label ?? undefined,
        recipient: row.recipient ?? undefined,
        phone: row.phone ?? undefined,
        postalCode: row.postal_code ?? '',
        street: row.street ?? '',
        number: row.number ?? undefined,
        complement: row.complement ?? undefined,
        district: row.district ?? undefined,
        city: row.city ?? '',
        state: row.state ?? '',
        country: row.country ?? undefined,
        isDefault: row.is_default ?? false,
      }))
    },
    async createCustomer(input: { firstName: string; lastName?: string; email?: string; phone?: string; notes?: string }) {
      const [customer] = await request<CustomerRow[]>('plg_shop_customers', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: storeId,
          first_name: input.firstName,
          last_name: input.lastName ?? '',
          email: input.email ?? null,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
        }),
      })
      if (!customer) throw new FayzShopError('Customer insert did not return a row.', 500)
      return rowToCustomer(customer)
    },
    async updateCustomer(id: string, input: { firstName?: string; lastName?: string; email?: string | null; phone?: string | null; notes?: string | null }) {
      const updates: Record<string, unknown> = {}
      if (input.firstName !== undefined) updates.first_name = input.firstName
      if (input.lastName !== undefined) updates.last_name = input.lastName
      if (input.email !== undefined) updates.email = input.email
      if (input.phone !== undefined) updates.phone = input.phone
      if (input.notes !== undefined) updates.notes = input.notes
      const [customer] = await request<CustomerRow[]>('plg_shop_customers', {
        method: 'PATCH',
        query: singleById(id),
        body: JSON.stringify(updates),
      })
      if (!customer) throw new FayzShopError('Customer update did not return a row.', 500)
      return rowToCustomer(customer)
    },
    async deleteCustomer(id: string) {
      await request<unknown>('plg_shop_customers', { method: 'DELETE', query: singleById(id) })
    },
    async listDiscounts(options?: FayzShopListDiscountsOptions) {
      const query = tenantQuery()
      query.set('select', '*')
      query.set('order', 'created_at.desc')
      if (options?.status) query.set('status', `eq.${options.status}`)
      if (options?.type) query.set('type', `eq.${options.type}`)
      if (options?.search) query.set('title', `ilike.*${options.search}*`)
      if (options?.limit) query.set('limit', String(options.limit))
      if (options?.offset) query.set('offset', String(options.offset))
      return (await request<DiscountRow[]>('plg_shop_discounts', { query })).map(rowToDiscount)
    },
    async getDiscount(id: string) {
      const rows = await request<DiscountRow[]>('plg_shop_discounts', { query: singleById(id) })
      return rows[0] ? rowToDiscount(rows[0]) : null
    },
    async createDiscount() {
      throw new FayzShopError('Discount writes require the Fayz admin/broker API.', 501)
    },
    async updateDiscount() {
      throw new FayzShopError('Discount writes require the Fayz admin/broker API.', 501)
    },
    async deleteDiscount() {
      throw new FayzShopError('Discount deletes require the Fayz admin/broker API.', 501)
    },
  }
}

function appendQuery(url: string, values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value))
  }
  const serialized = query.toString()
  return serialized ? `${url}?${serialized}` : url
}

function normalizeBrokerProduct(product: Record<string, unknown>, overlay?: Map<string, Record<string, unknown>>) {
  const category = product.category && typeof product.category === 'object'
    ? product.category as Record<string, unknown>
    : null
  const row = {
    id: product.id as string,
    tenant_id: product.tenantId as string,
    name: product.name as string,
    slug: product.slug as string | undefined,
    description: product.description as string | null | undefined,
    price: product.price as number | null | undefined,
    compare_at_price: product.compareAtPrice as number | null | undefined,
    currency: product.currency as string | null | undefined,
    status: product.status as FayzShopProductStatus | null | undefined,
    inventory_count: product.inventoryCount as number | null | undefined,
    sku: product.sku as string | null | undefined,
    sort_order: product.sortOrder as number | null | undefined,
    metadata: product.metadata as Record<string, unknown> | null | undefined,
    images: Array.isArray(product.images)
      ? product.images.map((image): ProductImageRow => {
        const row = image as Record<string, unknown>
        return {
          id: String(row.id ?? ''),
          product_id: String(row.productId ?? product.id ?? ''),
          url: String(row.url ?? ''),
          alt_text: (row.altText as string | null | undefined) ?? null,
          sort_order: (row.sortOrder as number | null | undefined) ?? 0,
          is_primary: (row.isPrimary as boolean | null | undefined) ?? false,
          created_at: (row.createdAt as string | null | undefined) ?? null,
        }
      })
      : [],
    category_id: (product.categoryId ?? category?.id) as string | null | undefined,
    category: category ? { name: category.name as string | null | undefined } : null,
    is_physical: product.isPhysical as boolean | null | undefined,
    weight: product.weight as number | null | undefined,
    weight_unit: product.weightUnit as string | null | undefined,
    created_at: product.createdAt as string | null | undefined,
    updated_at: product.updatedAt as string | null | undefined,
  } satisfies ProductRow
  return rowToProduct(row, overlay)
}

function normalizeBrokerCategory(category: Record<string, unknown>) {
  return {
    id: category.id as string,
    tenantId: (category.tenantId as string | undefined) ?? 'global',
    name: category.name as string,
    slug: (category.slug as string | undefined) ?? slugify(category.name as string),
    description: (category.description as string | null | undefined) ?? null,
    parentId: (category.parentId as string | null | undefined) ?? null,
    sortOrder: (category.sortOrder as number | null | undefined) ?? 0,
    imageUrl: (category.imageUrl as string | null | undefined) ?? null,
    createdAt: (category.createdAt as string | null | undefined) ?? nowIso(),
  }
}

function createBrokerShopProvider(options: FayzShopProviderOptions) {
  if (!options.apiBaseUrl || !options.projectId) {
    throw new FayzShopError('Fayz Shop broker mode requires apiBaseUrl and projectId.', 400)
  }

  const fetcher = options.fetcher ?? fetch
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl)
  const projectId = encodeURIComponent(options.projectId)
  const productMetadataOverlay = buildProductMetadataOverlay(options.productMetadata)

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetcher(`${apiBaseUrl}/public/projects/${projectId}/shop${path}`, init)
    const text = await response.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : undefined
    } catch {
      body = text
    }
    if (!response.ok) {
      const message = typeof body === 'object' && body
        ? String((body as { message?: unknown; error?: unknown }).message ?? (body as { error?: unknown }).error ?? `Fayz Shop broker request failed with status ${response.status}`)
        : `Fayz Shop broker request failed with status ${response.status}`
      throw new FayzShopError(message, response.status, body)
    }
    return body as T
  }

  return {
    async listProducts(options?: FayzShopListProductsOptions) {
      if (options?.slug) {
        const product = await this.getProduct(options.slug)
        return product ? [product] : []
      }

      const response = await request<{ products?: Array<Record<string, unknown>> }>(appendQuery('/products', {
        status: options?.status,
        categoryId: options?.categoryId,
        search: options?.search,
        limit: options?.limit,
        offset: options?.offset,
        orderBy: options?.orderBy,
        order: options?.order,
      }))
      return (response.products ?? []).map((product) => normalizeBrokerProduct(product, productMetadataOverlay))
    },
    async getProduct(id: string) {
      const response = await request<{ product?: Record<string, unknown> | null }>(`/products/${encodeURIComponent(id)}`)
      return response.product ? normalizeBrokerProduct(response.product, productMetadataOverlay) : null
    },
    async createProduct() {
      throw new FayzShopError('Product writes require the Fayz admin/broker API.', 501)
    },
    async updateProduct() {
      throw new FayzShopError('Product writes require the Fayz admin/broker API.', 501)
    },
    async deleteProduct() {
      throw new FayzShopError('Product writes require the Fayz admin/broker API.', 501)
    },
    async uploadProductImage() {
      throw new FayzShopError('Product image uploads require the Fayz admin/broker API.', 501)
    },
    async deleteProductImage() {
      throw new FayzShopError('Product image deletes require the Fayz admin/broker API.', 501)
    },
    async listCategories() {
      const response = await request<{ categories?: Array<Record<string, unknown>> }>('/categories')
      return (response.categories ?? []).map(normalizeBrokerCategory)
    },
    async createCategory() {
      throw new FayzShopError('Category writes require the Fayz admin/broker API.', 501)
    },
    async updateCategory() {
      throw new FayzShopError('Category writes require the Fayz admin/broker API.', 501)
    },
    async deleteCategory() {
      throw new FayzShopError('Category deletes require the Fayz admin/broker API.', 501)
    },
    async listOrders() {
      throw new FayzShopError('Order reads require the Fayz admin/broker API.', 501)
    },
    async getOrder() {
      throw new FayzShopError('Order reads require the Fayz admin/broker API.', 501)
    },
    async createOrder() {
      throw new FayzShopError('Order writes require the Fayz admin/broker API.', 501)
    },
    async updateOrder() {
      throw new FayzShopError('Order writes require the Fayz admin/broker API.', 501)
    },
    async placeOrder() {
      throw new FayzShopError('Order placement requires the Fayz admin/broker API.', 501)
    },
    async listCustomers() {
      throw new FayzShopError('Customer reads require the Fayz admin/broker API.', 501)
    },
    async getCustomer() {
      throw new FayzShopError('Customer reads require the Fayz admin/broker API.', 501)
    },
    async createCustomer() {
      throw new FayzShopError('Customer writes require the Fayz admin/broker API.', 501)
    },
    async updateCustomer() {
      throw new FayzShopError('Customer writes require the Fayz admin/broker API.', 501)
    },
    async deleteCustomer() {
      throw new FayzShopError('Customer writes require the Fayz admin/broker API.', 501)
    },
    async listDiscounts() {
      throw new FayzShopError('Discount reads require the Fayz admin/broker API.', 501)
    },
    async getDiscount() {
      throw new FayzShopError('Discount reads require the Fayz admin/broker API.', 501)
    },
    async createDiscount() {
      throw new FayzShopError('Discount writes require the Fayz admin/broker API.', 501)
    },
    async updateDiscount() {
      throw new FayzShopError('Discount writes require the Fayz admin/broker API.', 501)
    },
    async deleteDiscount() {
      throw new FayzShopError('Discount deletes require the Fayz admin/broker API.', 501)
    },
  }
}
