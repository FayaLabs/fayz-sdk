import type {
  Product, ProductImage, Category,
  Order, ShopCustomer, Discount,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateCategoryInput, UpdateCategoryInput,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions,
  CreateCustomerInput, UpdateCustomerInput, ListCustomersOptions,
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

  // Customers
  listCustomers(options?: ListCustomersOptions): Promise<ShopCustomer[]>
  getCustomer(id: string): Promise<ShopCustomer | null>
  createCustomer(input: CreateCustomerInput): Promise<ShopCustomer>
  updateCustomer(id: string, input: UpdateCustomerInput): Promise<ShopCustomer>
  deleteCustomer(id: string): Promise<void>

  // Discounts
  listDiscounts(options?: ListDiscountsOptions): Promise<Discount[]>
  getDiscount(id: string): Promise<Discount | null>
  createDiscount(input: CreateDiscountInput): Promise<Discount>
  updateDiscount(id: string, input: UpdateDiscountInput): Promise<Discount>
  deleteDiscount(id: string): Promise<void>
}
