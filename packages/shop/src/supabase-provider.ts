import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { ShopProvider } from './provider'
import { getShopTenantId } from './tenant'
import { T } from './tables'
import type {
  Product, ProductImage, Category,
  Order, ShopCustomer, Discount,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions, PlaceOrderInput,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions, ResolveCustomerInput,
  CreateDiscountInput, UpdateDiscountInput, ListDiscountsOptions, OrderItem,
  ShippingZone, CreateShippingZoneInput, UpdateShippingZoneInput } from './types'

function getDb(): any {
  const supabase = getSupabaseClientOptional()
  if (!supabase) throw new Error('@fayz-ai/shop: Supabase client not initialized. Call setGlobalSupabaseClient() first.')
  return supabase
}

const getTenantId = getShopTenantId

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function asUuid(value: string | null | undefined): string | null {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

/** 8 bare digits, zero-padded — the shape shipping_zones stores and compares. */
function toPostalDigits(value: string | undefined | null): string | undefined {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? digits.padStart(8, '0').slice(0, 8) : undefined
}

function rowToShippingZone(row: any): ShippingZone {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    carrier: row.carrier ?? null,
    postalFrom: String(row.postal_from ?? '').trim(),
    postalTo: String(row.postal_to ?? '').trim(),
    rate: Number(row.rate ?? 0),
    freeAbove: row.free_above == null ? null : Number(row.free_above),
    etaMinDays: row.eta_min_days ?? null,
    etaMaxDays: row.eta_max_days ?? null,
    active: row.active ?? true,
    sortOrder: row.sort_order ?? 0,
  }
}

function shippingZonePayload(input: Partial<CreateShippingZoneInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.carrier !== undefined) payload.carrier = input.carrier || null
  if (input.postalFrom !== undefined) payload.postal_from = toPostalDigits(input.postalFrom)
  if (input.postalTo !== undefined) payload.postal_to = toPostalDigits(input.postalTo)
  if (input.rate !== undefined) payload.rate = input.rate
  if (input.freeAbove !== undefined) payload.free_above = input.freeAbove ?? null
  if (input.etaMinDays !== undefined) payload.eta_min_days = input.etaMinDays ?? null
  if (input.etaMaxDays !== undefined) payload.eta_max_days = input.etaMaxDays ?? null
  if (input.active !== undefined) payload.active = input.active
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder
  return payload
}

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    description: row.description,
    price: row.price ?? 0,
    compareAtPrice: row.compare_at_price,
    currency: row.currency ?? 'BRL',
    status: row.status ?? 'active',
    inventoryCount: row.inventory_count ?? 0,
    sku: row.sku,
    sortOrder: row.sort_order ?? 0,
    metadata: row.metadata ?? {},
    images: Array.isArray(row.images) ? row.images.map(rowToImage) : [],
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    isPhysical: row.is_physical ?? true,
    weight: row.weight,
    weightUnit: row.weight_unit ?? 'kg',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToImage(row: any): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    altText: row.alt_text,
    sortOrder: row.sort_order ?? 0,
    isPrimary: row.is_primary ?? false,
    createdAt: row.created_at,
  }
}

function rowToCategory(row: any): Category {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    slug: row.slug ?? slugify(row.name),
    description: row.description,
    parentId: row.parent_id,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  }
}

/**
 * Order items were being passed through raw, so every snake_case column arrived
 * undefined on the camelCase type: unit_price, image_url and product_id were all
 * lost. `total` survived only because the name matches in both, which is exactly
 * why the bug looked like "price is zero" instead of "nothing is mapped".
 */
function rowToOrderItem(row: any): OrderItem {
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

function rowToOrder(row: any): Order {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    orderNumber: row.order_number,
    status: row.status ?? 'open',
    financialStatus: row.financial_status ?? 'pending',
    fulfillmentStatus: row.fulfillment_status ?? 'unfulfilled',
    currency: row.currency ?? 'BRL',
    subtotal: row.subtotal ?? 0,
    taxTotal: row.tax_total ?? 0,
    discountTotal: row.discount_total ?? 0,
    shippingTotal: row.shipping_total ?? 0,
    total: row.total ?? 0,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    discountCode: row.discount_code,
    notes: row.notes,
    shippingAddress: row.shipping_address ?? null,
    paymentMethodKind: row.payment_method_kind ?? null,
    paidAt: row.paid_at ?? null,
    items: Array.isArray(row.items) ? row.items.map(rowToOrderItem) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToCustomer(row: any): ShopCustomer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: row.first_name,
    lastName: row.last_name ?? '',
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    ordersCount: row.orders_count ?? 0,
    totalSpent: row.total_spent ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToDiscount(row: any): Discount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    code: row.code,
    type: row.type,
    method: row.method ?? 'code',
    value: row.value ?? 0,
    usageLimit: row.usage_limit,
    oncePerCustomer: row.once_per_customer ?? false,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status ?? 'active',
    timesUsed: row.times_used ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseShopProvider implements ShopProvider {
  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  async listProducts(options?: ListProductsOptions): Promise<Product[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from(T.products).select(`*, images:${T.productImages}(*)`)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (options?.status) q = q.eq('status', options.status)
    if (options?.categoryId) q = q.eq('category_id', options.categoryId)
    if (options?.slug) q = q.eq('slug', options.slug)
    if (options?.search) q = q.ilike('name', `%${options.search}%`)
    q = q.order(options?.orderBy ?? 'sort_order', { ascending: options?.order !== 'desc' })
    if (options?.limit) q = q.limit(options.limit)
    if (options?.offset) q = q.range(options.offset, (options.offset ?? 0) + (options.limit ?? 50) - 1)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToProduct)
  }

  async getProduct(id: string): Promise<Product | null> {
    const db = getDb()
    const { data, error } = await db
      .from(T.products)
      .select(`*, images:${T.productImages}(*)`)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? rowToProduct(data) : null
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const db = getDb()
    const tenantId = getTenantId()
    const { data, error } = await db
      .from(T.products)
      .insert({
        tenant_id: tenantId,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description ?? null,
        price: input.price,
        compare_at_price: input.compareAtPrice ?? null,
        currency: input.currency ?? 'BRL',
        status: input.status ?? 'active',
        inventory_count: input.inventoryCount ?? 0,
        sku: input.sku ?? null,
        sort_order: input.sortOrder ?? 0,
        metadata: input.metadata ?? {},
        category_id: input.categoryId ?? null,
        is_physical: input.isPhysical ?? true,
        weight: input.weight ?? null,
        weight_unit: input.weightUnit ?? 'kg',
      })
      .select(`*, images:${T.productImages}(*)`)
      .single()
    if (error) throw error
    return rowToProduct(data)
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const db = getDb()
    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) { updates.name = input.name; updates.slug = input.slug ?? slugify(input.name) }
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.description !== undefined) updates.description = input.description
    if (input.price !== undefined) updates.price = input.price
    if (input.compareAtPrice !== undefined) updates.compare_at_price = input.compareAtPrice
    if (input.currency !== undefined) updates.currency = input.currency
    if (input.status !== undefined) updates.status = input.status
    if (input.inventoryCount !== undefined) updates.inventory_count = input.inventoryCount
    if (input.sku !== undefined) updates.sku = input.sku
    if (input.categoryId !== undefined) updates.category_id = input.categoryId
    if (input.isPhysical !== undefined) updates.is_physical = input.isPhysical
    if (input.weight !== undefined) updates.weight = input.weight
    const { data, error } = await db
      .from(T.products).update(updates).eq('id', id)
      .select(`*, images:${T.productImages}(*)`)
      .single()
    if (error) throw error
    return rowToProduct(data)
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await getDb().from(T.products).delete().eq('id', id)
    if (error) throw error
  }

  async uploadProductImage(productId: string, file: File): Promise<ProductImage> {
    const db = getDb()
    const tenantId = getTenantId()
    const path = `${tenantId}/products/${productId}/${Date.now()}-${file.name}`
    const { error: uploadErr } = await db.storage.from('shop-images').upload(path, file)
    if (uploadErr) throw uploadErr
    const { data: { publicUrl } } = db.storage.from('shop-images').getPublicUrl(path)

    // Every upload used to land as sort_order 0 / is_primary false, so a product
    // whose only photo was uploaded here had NO primary at all, and a second one
    // tied with the first for position. New photos now go to the end, and the
    // first photo a product ever gets becomes its primary.
    const { data: existing } = await db
      .from(T.productImages)
      .select('id,sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false })
      .limit(1)
    const first = !existing || existing.length === 0
    const nextOrder = first ? 0 : (existing[0].sort_order ?? 0) + 1

    const { data, error } = await db
      .from(T.productImages)
      .insert({
        product_id: productId, tenant_id: tenantId, url: publicUrl,
        sort_order: nextOrder, is_primary: first,
      })
      .select().single()
    if (error) throw error
    return rowToImage(data)
  }

  async updateProductImage(
    imageId: string,
    input: { isPrimary?: boolean; sortOrder?: number; altText?: string | null },
  ): Promise<ProductImage> {
    const db = getDb()
    const updates: Record<string, unknown> = {}
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder
    if (input.altText !== undefined) updates.alt_text = input.altText
    if (input.isPrimary !== undefined) updates.is_primary = input.isPrimary

    // Demote the incumbent first. Doing it after would leave a window with two
    // primaries, and if the second statement failed the product would keep two
    // for good.
    if (input.isPrimary) {
      const { data: target } = await db
        .from(T.productImages).select('product_id').eq('id', imageId).single()
      if (target?.product_id) {
        await db.from(T.productImages)
          .update({ is_primary: false })
          .eq('product_id', target.product_id)
          .neq('id', imageId)
      }
    }

    const { data, error } = await db
      .from(T.productImages).update(updates).eq('id', imageId).select().single()
    if (error) throw error
    return rowToImage(data)
  }

  async deleteProductImage(imageId: string): Promise<void> {
    const { error } = await getDb().from(T.productImages).delete().eq('id', imageId)
    if (error) throw error
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async listCategories(): Promise<Category[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from(T.categories).select('*').order('sort_order', { ascending: true })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToCategory)
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const db = getDb()
    const { data, error } = await db
      .from(T.categories)
      .insert({ tenant_id: getTenantId(), name: input.name, slug: input.slug ?? slugify(input.name), description: input.description ?? null, parent_id: input.parentId ?? null, sort_order: input.sortOrder ?? 0 })
      .select().single()
    if (error) throw error
    return rowToCategory(data)
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const db = getDb()
    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) updates.name = input.name
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.description !== undefined) updates.description = input.description
    if (input.parentId !== undefined) updates.parent_id = input.parentId
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder
    const { data, error } = await db.from(T.categories).update(updates).eq('id', id).select().single()
    if (error) throw error
    return rowToCategory(data)
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await getDb().from(T.categories).delete().eq('id', id)
    if (error) throw error
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  async listOrders(options?: ListOrdersOptions): Promise<Order[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from(T.orders).select(`*, items:${T.orderItems}(*)`)
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (options?.status) q = q.eq('status', options.status)
    if (options?.financialStatus) q = q.eq('financial_status', options.financialStatus)
    if (options?.fulfillmentStatus) q = q.eq('fulfillment_status', options.fulfillmentStatus)
    if (options?.customerId) q = q.eq('customer_id', options.customerId)
    if (options?.customerEmail) q = q.eq('customer_email', options.customerEmail)
    if (options?.search) q = q.or(`customer_name.ilike.%${options.search}%,customer_email.ilike.%${options.search}%`)
    q = q.order('created_at', { ascending: false })
    if (options?.limit) q = q.limit(options.limit)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToOrder)
  }

  async getOrder(id: string): Promise<Order | null> {
    const { data, error } = await getDb()
      .from(T.orders).select(`*, items:${T.orderItems}(*)`)
      .eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToOrder(data) : null
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const db = getDb()
    const tenantId = getTenantId()
    const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const discountTotal = input.discountTotal ?? 0
    const shippingTotal = input.shippingTotal ?? 0
    const total = Math.round((subtotal - discountTotal + shippingTotal) * 100) / 100
    const { data: order, error: orderErr } = await db
      .from(T.orders)
      .insert({ tenant_id: tenantId, customer_id: input.customerId ?? null, customer_name: input.customerName ?? null, customer_email: input.customerEmail ?? null, currency: input.currency ?? 'BRL', notes: input.notes ?? null, subtotal, discount_total: discountTotal, shipping_total: shippingTotal, discount_code: input.discountCode ?? null, total, status: 'open', financial_status: 'pending', fulfillment_status: 'unfulfilled' })
      .select().single()
    if (orderErr) throw orderErr
    const items = input.items.map(i => ({ order_id: order.id, product_id: asUuid(i.productId), name: i.name, sku: i.sku ?? null, quantity: i.quantity, unit_price: i.unitPrice, total: i.quantity * i.unitPrice, image_url: i.imageUrl ?? null }))
    await db.from(T.orderItems).insert(items)
    return this.getOrder(order.id) as Promise<Order>
  }

  async updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
    const updates: Record<string, unknown> = {}
    if (input.status !== undefined) updates.status = input.status
    if (input.financialStatus !== undefined) updates.financial_status = input.financialStatus
    if (input.fulfillmentStatus !== undefined) updates.fulfillment_status = input.fulfillmentStatus
    if (input.notes !== undefined) updates.notes = input.notes
    const { error } = await getDb().from(T.orders).update(updates).eq('id', id)
    if (error) throw error
    return this.getOrder(id) as Promise<Order>
  }

  // -------------------------------------------------------------------------
  // Delivery zones
  //
  // Postal codes are stored as 8 bare digits so the range test in
  // shop_quote_shipping is a plain BETWEEN. Accepting '22.041-001' from the
  // form and normalising here means the merchant never has to think about it.
  // -------------------------------------------------------------------------
  async listShippingZones(): Promise<ShippingZone[]> {
    const tenantId = getTenantId()
    const { data, error } = await getDb()
      .from(T.shippingZones)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('postal_from', { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToShippingZone)
  }

  async createShippingZone(input: CreateShippingZoneInput): Promise<ShippingZone> {
    const tenantId = getTenantId()
    if (!tenantId) throw new Error('@fayz-ai/shop: createShippingZone requires a tenant id.')
    const { data, error } = await getDb()
      .from(T.shippingZones)
      .insert({ tenant_id: tenantId, ...shippingZonePayload(input) })
      .select()
      .single()
    if (error) throw error
    return rowToShippingZone(data)
  }

  async updateShippingZone(id: string, input: UpdateShippingZoneInput): Promise<ShippingZone> {
    const { data, error } = await getDb()
      .from(T.shippingZones)
      .update(shippingZonePayload(input))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return rowToShippingZone(data)
  }

  async deleteShippingZone(id: string): Promise<void> {
    const { error } = await getDb().from(T.shippingZones).delete().eq('id', id)
    if (error) throw error
  }

  /**
   * Settle a pending order: the merchant confirming that the money arrived.
   *
   * Goes through the RPC rather than an UPDATE so the payment ledger row in
   * public.transactions closes in the same transaction as the order — set
   * financial_status by hand and the order says paid while the ledger still
   * says pending. Since 0019 the RPC also enforces who may call it: a member of
   * the owning tenant, or a PSP webhook with the service role.
   */
  async confirmPayment(id: string, reference?: string): Promise<Order | null> {
    const { error } = await getDb().rpc('shop_confirm_payment', {
      p_order_id: id,
      p_reference: reference ?? null,
    })
    if (error) throw error
    return this.getOrder(id)
  }

  // Trusted placement — delegates all price/discount/inventory authority to the
  // shop_place_order RPC (SECURITY DEFINER). The browser never sets a price.
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const db = getDb()
    const tenantId = input.tenantId ?? getTenantId()
    if (!tenantId) throw new Error('@fayz-ai/shop: placeOrder requires a tenant id (configure the shop tenant resolver).')
    const { data, error } = await db.rpc('shop_place_order', {
      p_tenant_id: tenantId,
      p_items: input.items.map(i => ({ product_id: i.productId, quantity: i.quantity, options_label: i.optionsLabel ?? null })),
      p_customer_id: asUuid(input.customerId),
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
    })
    if (error) throw error
    const orderId = typeof data === 'string' ? data : (data?.id ?? data?.order_id ?? data)
    const order = await this.getOrder(orderId)
    if (!order) throw new Error('@fayz-ai/shop: placeOrder did not return a persisted order.')
    return order
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async listCustomers(options?: ListCustomersOptions): Promise<ShopCustomer[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from(T.customers).select('*').order('first_name', { ascending: true })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (options?.search) q = q.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
    if (options?.limit) q = q.limit(options.limit)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToCustomer)
  }

  async getCustomer(id: string): Promise<ShopCustomer | null> {
    const { data, error } = await getDb().from(T.customers).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToCustomer(data) : null
  }

  async createCustomer(input: CreateCustomerInput): Promise<ShopCustomer> {
    const { data, error } = await getDb()
      .from(T.customers)
      .insert({ tenant_id: getTenantId(), first_name: input.firstName, last_name: input.lastName ?? '', email: input.email ?? null, phone: input.phone ?? null, notes: input.notes ?? null })
      .select().single()
    if (error) throw error
    return rowToCustomer(data)
  }

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<ShopCustomer> {
    const updates: Record<string, unknown> = {}
    if (input.firstName !== undefined) updates.first_name = input.firstName
    if (input.lastName !== undefined) updates.last_name = input.lastName
    if (input.email !== undefined) updates.email = input.email
    if (input.phone !== undefined) updates.phone = input.phone
    if (input.notes !== undefined) updates.notes = input.notes
    const { data, error } = await getDb().from(T.customers).update(updates).eq('id', id).select().single()
    if (error) throw error
    return rowToCustomer(data)
  }

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await getDb().from(T.customers).delete().eq('id', id)
    if (error) throw error
  }

  // Find-or-create + link to auth.uid server-side (SECURITY DEFINER RPC), so the
  // browser never supplies the auth id and "my orders" is RLS-scoped to the owner.
  async resolveCustomer(input: ResolveCustomerInput): Promise<ShopCustomer> {
    const db = getDb()
    const tenantId = input.tenantId ?? getTenantId()
    if (!tenantId) throw new Error('@fayz-ai/shop: resolveCustomer requires a tenant id.')
    const { data, error } = await db.rpc('shop_resolve_customer', {
      p_tenant_id: tenantId,
      p_email: input.email,
      p_name: input.name ?? null,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('@fayz-ai/shop: resolveCustomer returned no row.')
    return rowToCustomer(row)
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  async listDiscounts(options?: ListDiscountsOptions): Promise<Discount[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from(T.discounts).select('*').order('created_at', { ascending: false })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (options?.status) q = q.eq('status', options.status)
    if (options?.type) q = q.eq('type', options.type)
    if (options?.search) q = q.ilike('title', `%${options.search}%`)
    if (options?.limit) q = q.limit(options.limit)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToDiscount)
  }

  async getDiscount(id: string): Promise<Discount | null> {
    const { data, error } = await getDb().from(T.discounts).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToDiscount(data) : null
  }

  async createDiscount(input: CreateDiscountInput): Promise<Discount> {
    const { data, error } = await getDb()
      .from(T.discounts)
      .insert({ tenant_id: getTenantId(), title: input.title, code: input.code ?? null, type: input.type, method: input.method ?? 'code', value: input.value, usage_limit: input.usageLimit ?? null, once_per_customer: input.oncePerCustomer ?? false, starts_at: input.startsAt ?? new Date().toISOString(), ends_at: input.endsAt ?? null, status: input.status ?? 'active', times_used: 0 })
      .select().single()
    if (error) throw error
    return rowToDiscount(data)
  }

  async updateDiscount(id: string, input: UpdateDiscountInput): Promise<Discount> {
    const updates: Record<string, unknown> = {}
    if (input.title !== undefined) updates.title = input.title
    if (input.code !== undefined) updates.code = input.code
    if (input.type !== undefined) updates.type = input.type
    if (input.value !== undefined) updates.value = input.value
    if (input.usageLimit !== undefined) updates.usage_limit = input.usageLimit
    if (input.status !== undefined) updates.status = input.status
    if (input.endsAt !== undefined) updates.ends_at = input.endsAt
    const { data, error } = await getDb().from(T.discounts).update(updates).eq('id', id).select().single()
    if (error) throw error
    return rowToDiscount(data)
  }

  async deleteDiscount(id: string): Promise<void> {
    const { error } = await getDb().from(T.discounts).delete().eq('id', id)
    if (error) throw error
  }
}

export function createSupabaseShopProvider(): ShopProvider {
  return new SupabaseShopProvider()
}
