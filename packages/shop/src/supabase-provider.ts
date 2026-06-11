import { getSupabaseClientOptional } from '@fayz/core'
import type { ShopProvider } from './provider'
import { getShopTenantId } from './tenant'
import type {
  Product, ProductImage, Category,
  Order, ShopCustomer, Discount,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions,
  CreateDiscountInput, UpdateDiscountInput, ListDiscountsOptions,
} from './types'

function getDb(): any {
  const supabase = getSupabaseClientOptional()
  if (!supabase) throw new Error('@fayz/shop: Supabase client not initialized. Call setGlobalSupabaseClient() first.')
  return supabase
}

const getTenantId = getShopTenantId

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
    items: Array.isArray(row.items) ? row.items : [],
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
    let q = db.from('shop_products').select('*, images:shop_product_images(*)')
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
      .from('shop_products')
      .select('*, images:shop_product_images(*)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? rowToProduct(data) : null
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const db = getDb()
    const tenantId = getTenantId()
    const { data, error } = await db
      .from('shop_products')
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
      .select('*, images:shop_product_images(*)')
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
      .from('shop_products').update(updates).eq('id', id)
      .select('*, images:shop_product_images(*)')
      .single()
    if (error) throw error
    return rowToProduct(data)
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await getDb().from('shop_products').delete().eq('id', id)
    if (error) throw error
  }

  async uploadProductImage(productId: string, file: File): Promise<ProductImage> {
    const db = getDb()
    const tenantId = getTenantId()
    const path = `${tenantId}/products/${productId}/${Date.now()}-${file.name}`
    const { error: uploadErr } = await db.storage.from('shop-images').upload(path, file)
    if (uploadErr) throw uploadErr
    const { data: { publicUrl } } = db.storage.from('shop-images').getPublicUrl(path)
    const { data, error } = await db
      .from('shop_product_images')
      .insert({ product_id: productId, tenant_id: tenantId, url: publicUrl, sort_order: 0, is_primary: false })
      .select().single()
    if (error) throw error
    return rowToImage(data)
  }

  async deleteProductImage(imageId: string): Promise<void> {
    const { error } = await getDb().from('shop_product_images').delete().eq('id', imageId)
    if (error) throw error
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async listCategories(): Promise<Category[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from('shop_categories').select('*').order('sort_order', { ascending: true })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToCategory)
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const db = getDb()
    const { data, error } = await db
      .from('shop_categories')
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
    const { data, error } = await db.from('shop_categories').update(updates).eq('id', id).select().single()
    if (error) throw error
    return rowToCategory(data)
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await getDb().from('shop_categories').delete().eq('id', id)
    if (error) throw error
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  async listOrders(options?: ListOrdersOptions): Promise<Order[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from('shop_orders').select('*, items:shop_order_items(*)')
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
      .from('shop_orders').select('*, items:shop_order_items(*)')
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
      .from('shop_orders')
      .insert({ tenant_id: tenantId, customer_id: input.customerId ?? null, customer_name: input.customerName ?? null, customer_email: input.customerEmail ?? null, currency: input.currency ?? 'BRL', notes: input.notes ?? null, subtotal, discount_total: discountTotal, shipping_total: shippingTotal, discount_code: input.discountCode ?? null, total, status: 'open', financial_status: 'pending', fulfillment_status: 'unfulfilled' })
      .select().single()
    if (orderErr) throw orderErr
    const items = input.items.map(i => ({ order_id: order.id, product_id: i.productId ?? null, name: i.name, sku: i.sku ?? null, quantity: i.quantity, unit_price: i.unitPrice, total: i.quantity * i.unitPrice, image_url: i.imageUrl ?? null }))
    await db.from('shop_order_items').insert(items)
    return this.getOrder(order.id) as Promise<Order>
  }

  async updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
    const updates: Record<string, unknown> = {}
    if (input.status !== undefined) updates.status = input.status
    if (input.financialStatus !== undefined) updates.financial_status = input.financialStatus
    if (input.fulfillmentStatus !== undefined) updates.fulfillment_status = input.fulfillmentStatus
    if (input.notes !== undefined) updates.notes = input.notes
    const { error } = await getDb().from('shop_orders').update(updates).eq('id', id)
    if (error) throw error
    return this.getOrder(id) as Promise<Order>
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async listCustomers(options?: ListCustomersOptions): Promise<ShopCustomer[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from('shop_customers').select('*').order('first_name', { ascending: true })
    if (tenantId) q = q.eq('tenant_id', tenantId)
    if (options?.search) q = q.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
    if (options?.limit) q = q.limit(options.limit)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToCustomer)
  }

  async getCustomer(id: string): Promise<ShopCustomer | null> {
    const { data, error } = await getDb().from('shop_customers').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToCustomer(data) : null
  }

  async createCustomer(input: CreateCustomerInput): Promise<ShopCustomer> {
    const { data, error } = await getDb()
      .from('shop_customers')
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
    const { data, error } = await getDb().from('shop_customers').update(updates).eq('id', id).select().single()
    if (error) throw error
    return rowToCustomer(data)
  }

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await getDb().from('shop_customers').delete().eq('id', id)
    if (error) throw error
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  async listDiscounts(options?: ListDiscountsOptions): Promise<Discount[]> {
    const db = getDb()
    const tenantId = getTenantId()
    let q = db.from('shop_discounts').select('*').order('created_at', { ascending: false })
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
    const { data, error } = await getDb().from('shop_discounts').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToDiscount(data) : null
  }

  async createDiscount(input: CreateDiscountInput): Promise<Discount> {
    const { data, error } = await getDb()
      .from('shop_discounts')
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
    const { data, error } = await getDb().from('shop_discounts').update(updates).eq('id', id).select().single()
    if (error) throw error
    return rowToDiscount(data)
  }

  async deleteDiscount(id: string): Promise<void> {
    const { error } = await getDb().from('shop_discounts').delete().eq('id', id)
    if (error) throw error
  }
}

export function createSupabaseShopProvider(): ShopProvider {
  return new SupabaseShopProvider()
}
