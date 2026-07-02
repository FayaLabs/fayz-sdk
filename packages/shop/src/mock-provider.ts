import type { ShopProvider } from './provider'
import type {
  Product, ProductImage, Category, Order, ShopCustomer, Discount, ProductEnquiry,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateProductEnquiryInput, ListProductEnquiriesOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions, PlaceOrderInput,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions, ResolveCustomerInput,
  CreateDiscountInput, UpdateDiscountInput, ListDiscountsOptions,
} from './types'
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_DISCOUNTS } from './mock-catalog'

function uid() { return Math.random().toString(36).slice(2) }
function now() { return new Date().toISOString() }

// Orders/customers persist to localStorage so "my purchases" survives a page
// reload. Products/categories/discounts always reseed from the catalog —
// the storefront sees a deterministic catalog on every load.
const ORDERS_KEY = 'fayz.shop.mock.orders.v1'
const CUSTOMERS_KEY = 'fayz.shop.mock.customers.v1'
const ENQUIRIES_KEY = 'fayz.shop.mock.enquiries.v1'

function loadStored<T>(key: string): T[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function store<T>(key: string, value: T[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota/serialization failures are non-fatal in mock mode */
  }
}

export interface MockShopSeed {
  products?: Product[]
  categories?: Category[]
  discounts?: Discount[]
}

export class MockShopProvider implements ShopProvider {
  private products: Product[]
  private categories: Category[]
  private discounts: Discount[]
  private orders: Order[] = loadStored<Order>(ORDERS_KEY)
  private customers: ShopCustomer[] = loadStored<ShopCustomer>(CUSTOMERS_KEY)
  private enquiries: ProductEnquiry[] = loadStored<ProductEnquiry>(ENQUIRIES_KEY)

  constructor(seed?: MockShopSeed) {
    this.products = (seed?.products ?? MOCK_PRODUCTS).map(p => ({ ...p }))
    this.categories = (seed?.categories ?? MOCK_CATEGORIES).map(c => ({ ...c }))
    this.discounts = (seed?.discounts ?? MOCK_DISCOUNTS).map(d => ({ ...d }))
  }

  // Re-read before mutating: HMR can re-instantiate the provider mid-session
  // and a stale in-memory copy must not clobber persisted records.
  private syncOrders() { this.orders = loadStored<Order>(ORDERS_KEY) }
  private syncCustomers() { this.customers = loadStored<ShopCustomer>(CUSTOMERS_KEY) }
  private syncEnquiries() { this.enquiries = loadStored<ProductEnquiry>(ENQUIRIES_KEY) }
  private persistOrders() { store(ORDERS_KEY, this.orders) }
  private persistCustomers() { store(CUSTOMERS_KEY, this.customers) }
  private persistEnquiries() { store(ENQUIRIES_KEY, this.enquiries) }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  async listProducts(opts?: ListProductsOptions): Promise<Product[]> {
    let list = [...this.products]
    if (opts?.status) list = list.filter(p => p.status === opts.status)
    if (opts?.categoryId) list = list.filter(p => p.categoryId === opts.categoryId)
    if (opts?.slug) list = list.filter(p => p.slug === opts.slug)
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q),
      )
    }
    const orderBy = opts?.orderBy ?? 'sort_order'
    const dir = opts?.order === 'desc' ? -1 : 1
    list.sort((a, b) => {
      switch (orderBy) {
        case 'name': return a.name.localeCompare(b.name) * dir
        case 'price': return (a.price - b.price) * dir
        case 'created_at': return a.createdAt.localeCompare(b.createdAt) * dir
        default: return (a.sortOrder - b.sortOrder) * dir
      }
    })
    const offset = opts?.offset ?? 0
    if (offset || opts?.limit) list = list.slice(offset, opts?.limit ? offset + opts.limit : undefined)
    return list
  }

  async getProduct(id: string) { return this.products.find(p => p.id === id) ?? null }

  async createProduct(input: CreateProductInput): Promise<Product> {
    const p: Product = { id: uid(), tenantId: 'mock', name: input.name, slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, '-'), description: input.description ?? null, price: input.price, compareAtPrice: input.compareAtPrice ?? null, currency: input.currency ?? 'BRL', status: input.status ?? 'active', inventoryCount: input.inventoryCount ?? 0, sku: input.sku ?? null, sortOrder: input.sortOrder ?? 0, metadata: input.metadata ?? {}, images: [], categoryId: input.categoryId ?? null, categoryName: null, isPhysical: input.isPhysical ?? true, weight: input.weight ?? null, weightUnit: input.weightUnit ?? 'kg', createdAt: now(), updatedAt: now() }
    this.products.push(p); return p
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const i = this.products.findIndex(p => p.id === id)
    if (i < 0) throw new Error('Product not found')
    this.products[i] = { ...this.products[i], ...input, updatedAt: now() }
    return this.products[i]
  }

  async deleteProduct(id: string) { this.products = this.products.filter(p => p.id !== id) }
  async uploadProductImage(_productId: string, _file: File): Promise<ProductImage> { throw new Error('Image upload not available in mock mode') }
  async deleteProductImage(_imageId: string) {}

  async createProductEnquiry(input: CreateProductEnquiryInput): Promise<ProductEnquiry> {
    this.syncEnquiries()
    const ts = now()
    const enquiry: ProductEnquiry = {
      id: uid(),
      tenantId: 'mock',
      productId: input.productId ?? null,
      productName: input.productName,
      productSlug: input.productSlug ?? null,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone ?? null,
      subject: input.subject ?? null,
      message: input.message,
      sourceUrl: input.sourceUrl ?? null,
      status: 'new',
      metadata: input.metadata ?? {},
      createdAt: ts,
      updatedAt: ts,
    }
    this.enquiries.unshift(enquiry)
    this.persistEnquiries()
    return enquiry
  }

  async listProductEnquiries(opts?: ListProductEnquiriesOptions): Promise<ProductEnquiry[]> {
    this.syncEnquiries()
    let list = [...this.enquiries]
    if (opts?.productId) list = list.filter((e) => e.productId === opts.productId)
    if (opts?.customerEmail) {
      const email = opts.customerEmail.toLowerCase()
      list = list.filter((e) => e.customerEmail.toLowerCase() === email)
    }
    if (opts?.status) list = list.filter((e) => e.status === opts.status)
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const offset = opts?.offset ?? 0
    if (offset || opts?.limit) list = list.slice(offset, opts?.limit ? offset + opts.limit : undefined)
    return list
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async listCategories() { return [...this.categories].sort((a, b) => a.sortOrder - b.sortOrder) }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const c: Category = { id: uid(), tenantId: 'mock', name: input.name, slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, '-'), description: input.description ?? null, parentId: input.parentId ?? null, sortOrder: input.sortOrder ?? 0, createdAt: now() }
    this.categories.push(c); return c
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const i = this.categories.findIndex(c => c.id === id)
    if (i < 0) throw new Error('Category not found')
    this.categories[i] = { ...this.categories[i], ...input }
    return this.categories[i]
  }

  async deleteCategory(id: string) { this.categories = this.categories.filter(c => c.id !== id) }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  async listOrders(opts?: ListOrdersOptions): Promise<Order[]> {
    this.syncOrders()
    let list = [...this.orders]
    if (opts?.status) list = list.filter(o => o.status === opts.status)
    if (opts?.financialStatus) list = list.filter(o => o.financialStatus === opts.financialStatus)
    if (opts?.fulfillmentStatus) list = list.filter(o => o.fulfillmentStatus === opts.fulfillmentStatus)
    if (opts?.customerId) list = list.filter(o => o.customerId === opts.customerId)
    if (opts?.customerEmail) {
      const email = opts.customerEmail.toLowerCase()
      list = list.filter(o => (o.customerEmail ?? '').toLowerCase() === email)
    }
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      list = list.filter(o =>
        (o.customerName ?? '').toLowerCase().includes(q) ||
        (o.customerEmail ?? '').toLowerCase().includes(q) ||
        String(o.orderNumber).includes(q),
      )
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (opts?.limit) list = list.slice(0, opts.limit)
    return list
  }

  async getOrder(id: string) {
    this.syncOrders()
    return this.orders.find(o => o.id === id) ?? null
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    this.syncOrders()
    const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const discountTotal = input.discountTotal ?? 0
    const shippingTotal = input.shippingTotal ?? 0
    const total = Math.round((subtotal - discountTotal + shippingTotal) * 100) / 100
    const orderId = uid()
    const maxNumber = this.orders.reduce((m, o) => Math.max(m, o.orderNumber), 1000)
    const o: Order = {
      id: orderId,
      tenantId: 'mock',
      orderNumber: maxNumber + 1,
      status: 'open',
      financialStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      currency: input.currency ?? 'BRL',
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: 0,
      discountTotal,
      shippingTotal,
      total,
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? null,
      customerEmail: input.customerEmail ?? null,
      discountCode: input.discountCode ?? null,
      notes: input.notes ?? null,
      items: input.items.map(i => ({ id: uid(), orderId, productId: i.productId ?? null, name: i.name, sku: i.sku ?? null, quantity: i.quantity, unitPrice: i.unitPrice, total: Math.round(i.quantity * i.unitPrice * 100) / 100, imageUrl: i.imageUrl ?? null })),
      createdAt: now(),
      updatedAt: now(),
    }
    this.orders.push(o)
    this.persistOrders()
    return o
  }

  async updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
    this.syncOrders()
    const i = this.orders.findIndex(o => o.id === id)
    if (i < 0) throw new Error('Order not found')
    this.orders[i] = { ...this.orders[i], ...input, updatedAt: now() }
    this.persistOrders()
    return this.orders[i]
  }

  // Trusted placement (mock parity with the shop_place_order RPC): re-reads
  // prices + stock from the catalog, validates the discount, decrements
  // inventory. The browser-supplied prices are never used.
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    this.syncOrders()
    this.syncCustomers()

    // Resolve / create the customer (find-or-create by email).
    let customerId = input.customerId ?? null
    let customerName = input.customer?.name?.trim() || null
    const email = input.customer?.email?.trim().toLowerCase() || null
    if (!customerId && email) {
      const existing = this.customers.find(c => (c.email ?? '').toLowerCase() === email)
      if (existing) {
        customerId = existing.id
        customerName = customerName ?? `${existing.firstName} ${existing.lastName}`.trim()
      } else {
        const [first, ...rest] = (customerName ?? email).split(' ')
        const created = await this.createCustomer({ firstName: first || email, lastName: rest.join(' '), email })
        customerId = created.id
      }
    }

    // Re-read price + guard stock from the catalog (never trust the client).
    const items: CreateOrderInput['items'] = []
    let subtotal = 0
    for (const line of input.items) {
      const product = this.products.find(p => p.id === line.productId)
      if (!product || product.status !== 'active') throw new Error(`Product unavailable: ${line.productId}`)
      if (product.inventoryCount < line.quantity) throw new Error(`Insufficient stock for ${product.name}`)
      const name = line.optionsLabel ? `${product.name} (${line.optionsLabel})` : product.name
      subtotal += product.price * line.quantity
      items.push({ productId: product.id, name, sku: product.sku ?? undefined, quantity: line.quantity, unitPrice: product.price, imageUrl: product.images[0]?.url })
    }
    subtotal = Math.round(subtotal * 100) / 100

    // Validate + apply the discount server-side.
    let shippingTotal = Math.max(input.shippingTotal ?? 0, 0)
    let discountTotal = 0
    let appliedCode: string | null = null
    if (input.discountCode) {
      const code = input.discountCode.trim().toLowerCase()
      const d = this.discounts.find(x => (x.code ?? '').toLowerCase() === code)
      const ts = now()
      const valid = !!d && d.status === 'active' && d.startsAt <= ts && (!d.endsAt || d.endsAt >= ts) && (d.usageLimit == null || d.timesUsed < d.usageLimit)
      if (valid && d) {
        appliedCode = d.code
        if (d.type === 'percentage') discountTotal = Math.round(subtotal * d.value) / 100
        else if (d.type === 'fixed_amount') discountTotal = Math.min(d.value, subtotal)
        else if (d.type === 'free_shipping') shippingTotal = 0
        // buy_x_get_y unsupported in v1: code recorded, no monetary effect
        d.timesUsed += 1
      }
    }
    discountTotal = Math.round(Math.min(Math.max(discountTotal, 0), subtotal) * 100) / 100

    // Persist via createOrder (recomputes total from these trusted values).
    const order = await this.createOrder({
      customerId: customerId ?? undefined,
      customerName: customerName ?? undefined,
      customerEmail: input.customer?.email ?? undefined,
      currency: input.currency,
      notes: input.notes,
      discountCode: appliedCode ?? undefined,
      discountTotal,
      shippingTotal,
      items,
    })

    // Decrement inventory (in-memory; the mock catalog reseeds on reload).
    for (const line of input.items) {
      const product = this.products.find(p => p.id === line.productId)
      if (product) product.inventoryCount = Math.max(0, product.inventoryCount - line.quantity)
    }

    return order
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async listCustomers(opts?: ListCustomersOptions) {
    this.syncCustomers()
    let list = [...this.customers]
    if (opts?.search) list = list.filter(c => `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(opts.search!.toLowerCase()))
    if (opts?.limit) list = list.slice(0, opts.limit)
    return list
  }

  async getCustomer(id: string) {
    this.syncCustomers()
    return this.customers.find(c => c.id === id) ?? null
  }

  async createCustomer(input: CreateCustomerInput): Promise<ShopCustomer> {
    this.syncCustomers()
    const c: ShopCustomer = { id: uid(), tenantId: 'mock', firstName: input.firstName, lastName: input.lastName ?? '', email: input.email ?? null, phone: input.phone ?? null, notes: input.notes ?? null, ordersCount: 0, totalSpent: 0, createdAt: now(), updatedAt: now() }
    this.customers.push(c)
    this.persistCustomers()
    return c
  }

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<ShopCustomer> {
    this.syncCustomers()
    const i = this.customers.findIndex(c => c.id === id)
    if (i < 0) throw new Error('Customer not found')
    this.customers[i] = { ...this.customers[i], ...input, updatedAt: now() }
    this.persistCustomers()
    return this.customers[i]
  }

  async deleteCustomer(id: string) {
    this.syncCustomers()
    this.customers = this.customers.filter(c => c.id !== id)
    this.persistCustomers()
  }

  async resolveCustomer(input: ResolveCustomerInput): Promise<ShopCustomer> {
    this.syncCustomers()
    const email = input.email.trim().toLowerCase()
    const existing = this.customers.find(c => (c.email ?? '').toLowerCase() === email)
    if (existing) return existing
    const [first, ...rest] = (input.name?.trim() || email).split(/\s+/)
    return this.createCustomer({ firstName: first || email, lastName: rest.join(' '), email })
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  async listDiscounts(opts?: ListDiscountsOptions) {
    let list = [...this.discounts]
    if (opts?.status) list = list.filter(d => d.status === opts.status)
    if (opts?.type) list = list.filter(d => d.type === opts.type)
    if (opts?.search) list = list.filter(d => d.title.toLowerCase().includes(opts.search!.toLowerCase()))
    if (opts?.limit) list = list.slice(0, opts.limit)
    return list
  }

  async getDiscount(id: string) { return this.discounts.find(d => d.id === id) ?? null }

  async createDiscount(input: CreateDiscountInput): Promise<Discount> {
    const d: Discount = { id: uid(), tenantId: 'mock', title: input.title, code: input.code ?? null, type: input.type, method: input.method ?? 'code', value: input.value, usageLimit: input.usageLimit ?? null, oncePerCustomer: input.oncePerCustomer ?? false, startsAt: input.startsAt ?? now(), endsAt: input.endsAt ?? null, status: input.status ?? 'active', timesUsed: 0, createdAt: now(), updatedAt: now() }
    this.discounts.push(d); return d
  }

  async updateDiscount(id: string, input: UpdateDiscountInput): Promise<Discount> {
    const i = this.discounts.findIndex(d => d.id === id)
    if (i < 0) throw new Error('Discount not found')
    this.discounts[i] = { ...this.discounts[i], ...input, updatedAt: now() }
    return this.discounts[i]
  }

  async deleteDiscount(id: string) { this.discounts = this.discounts.filter(d => d.id !== id) }
}

export function createMockShopProvider(seed?: MockShopSeed): ShopProvider {
  return new MockShopProvider(seed)
}
