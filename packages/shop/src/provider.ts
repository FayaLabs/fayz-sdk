import type {
  Product, ProductImage, Category,
  Order, ShopCustomer, Discount, ProductEnquiry,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateProductEnquiryInput, ListProductEnquiriesOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions, PlaceOrderInput,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions, ResolveCustomerInput,
  CustomerAddress, ShippingQuoteOption,
  ShippingZone, CreateShippingZoneInput, UpdateShippingZoneInput,
  CreateDiscountInput, UpdateDiscountInput, ListDiscountsOptions,
} from './types'

export interface ShopProvider {
  // Products
  listProducts(options?: ListProductsOptions): Promise<Product[]>
  getProduct(id: string): Promise<Product | null>
  createProduct(input: CreateProductInput): Promise<Product>
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>
  deleteProduct(id: string): Promise<void>
  uploadProductImage(productId: string, file: File): Promise<ProductImage>
  deleteProductImage(imageId: string): Promise<void>
  /**
   * Reorder a gallery or promote a photo to primary. Optional so a provider
   * that only ever holds one image per product need not implement it.
   *
   * Setting `isPrimary` is exclusive: the previous primary is demoted in the
   * same call, because two primaries make "the product photo" ambiguous
   * everywhere it is read (card, cart line, order item, admin table).
   */
  updateProductImage?(
    imageId: string,
    input: { isPrimary?: boolean; sortOrder?: number; altText?: string | null },
  ): Promise<ProductImage>

  // Product enquiries
  createProductEnquiry?(input: CreateProductEnquiryInput): Promise<ProductEnquiry>
  listProductEnquiries?(options?: ListProductEnquiriesOptions): Promise<ProductEnquiry[]>

  // Categories
  listCategories(): Promise<Category[]>
  createCategory(input: CreateCategoryInput): Promise<Category>
  updateCategory(id: string, input: UpdateCategoryInput): Promise<Category>
  deleteCategory(id: string): Promise<void>

  // Orders
  listOrders(options?: ListOrdersOptions): Promise<Order[]>
  getOrder(id: string): Promise<Order | null>
  createOrder(input: CreateOrderInput): Promise<Order>
  updateOrder(id: string, input: UpdateOrderInput): Promise<Order>
  /**
   * Mock/dev payment seam: pending->paid transition via a whitelisted RPC
   * (anon storefronts have no UPDATE grant on the orders table). Real PSPs
   * confirm via webhook with service_role instead.
   */
  confirmPayment?(id: string, reference?: string): Promise<Order | null>
  /**
   * Trusted order placement: the server re-reads product prices + stock,
   * validates the discount, computes totals, and decrements inventory
   * atomically. Storefront checkout MUST use this instead of createOrder so the
   * browser cannot tamper with prices. createOrder remains for trusted admin entry.
   */
  placeOrder(input: PlaceOrderInput): Promise<Order>

  // Customers
  listCustomers(options?: ListCustomersOptions): Promise<ShopCustomer[]>
  getCustomer(id: string): Promise<ShopCustomer | null>
  createCustomer(input: CreateCustomerInput): Promise<ShopCustomer>
  updateCustomer(id: string, input: UpdateCustomerInput): Promise<ShopCustomer>
  deleteCustomer(id: string): Promise<void>
  /**
   * Find-or-create the customer for a storefront shopper and (on Supabase) link
   * it to auth.uid server-side, so order reads can be scoped to the owner by RLS.
   * Optional: providers without it fall back to listCustomers+createCustomer.
   */
  resolveCustomer?(input: ResolveCustomerInput): Promise<ShopCustomer>
  /**
   * The signed-in shopper's saved delivery addresses, so checkout can offer
   * them instead of inventing a placeholder. Optional: a provider without it
   * (or an anonymous request) yields an empty book and a blank form.
   */
  listCustomerAddresses?(customerId: string): Promise<CustomerAddress[]>

  // Delivery
  /**
   * Delivery options for a postal code at a given subtotal. An empty array
   * means the store does not deliver there — shown before the buyer commits to
   * a cart, which is the whole point of quoting on the product page.
   *
   * This is for DISPLAY. shop_place_order recomputes the freight from the same
   * zones and ignores whatever the client sends, so a tampered quote changes
   * what the shopper sees and nothing about what they are charged.
   */
  quoteShipping?(postalCode: string, subtotal: number): Promise<ShippingQuoteOption[]>

  /** Delivery zones the merchant maintains. Admin-only: the storefront reads
   *  quotes, never the ranges themselves. */
  listShippingZones?(): Promise<ShippingZone[]>
  createShippingZone?(input: CreateShippingZoneInput): Promise<ShippingZone>
  updateShippingZone?(id: string, input: UpdateShippingZoneInput): Promise<ShippingZone>
  deleteShippingZone?(id: string): Promise<void>

  // Discounts
  listDiscounts(options?: ListDiscountsOptions): Promise<Discount[]>
  getDiscount(id: string): Promise<Discount | null>
  createDiscount(input: CreateDiscountInput): Promise<Discount>
  updateDiscount(id: string, input: UpdateDiscountInput): Promise<Discount>
  deleteDiscount(id: string): Promise<void>
}
