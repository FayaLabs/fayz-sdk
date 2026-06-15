import type {
  RestaurantOrder, RestaurantOrderItem,
  CreateOrderInput, CreateOrderItemInput, UpdateOrderStatusInput,
  OrderQuery, PaginatedResult, OrdersSummary,
} from '../types'

export interface OrdersDataProvider {
  // Orders
  getOrders(query: OrderQuery): Promise<PaginatedResult<RestaurantOrder>>
  getOrderById(id: string): Promise<RestaurantOrder | null>
  createOrder(input: CreateOrderInput): Promise<RestaurantOrder>
  updateOrderStatus(input: UpdateOrderStatusInput): Promise<RestaurantOrder>
  updateOrder(id: string, data: Partial<RestaurantOrder>): Promise<RestaurantOrder>
  cancelOrder(id: string, reason?: string): Promise<void>

  // Order Items
  addOrderItem(orderId: string, item: CreateOrderItemInput): Promise<RestaurantOrderItem>
  removeOrderItem(itemId: string): Promise<void>
  updateOrderItem(itemId: string, data: Partial<RestaurantOrderItem>): Promise<RestaurantOrderItem>

  // Summary
  getSummary(dateRange?: { from: string; to: string }): Promise<OrdersSummary>
}
