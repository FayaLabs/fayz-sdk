import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from 'sonner'
import type { OrdersDataProvider } from './data/types'
import type {
  RestaurantOrder, OrdersSummary,
  OrderQuery, CreateOrderInput, CreateOrderItemInput,
  UpdateOrderStatusInput,
} from './types'
import { getNextStatus } from './types'

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface OrdersUIState {
  // Data cache
  orders: RestaurantOrder[]
  ordersTotal: number
  ordersLoading: boolean
  orderQuery: OrderQuery

  activeOrders: RestaurantOrder[]
  activeOrdersLoading: boolean

  summary: OrdersSummary | null
  summaryLoading: boolean

  selectedOrderId: string | null

  // Actions
  fetchOrders(query: OrderQuery): Promise<void>
  fetchActiveOrders(): Promise<void>
  fetchSummary(dateRange?: { from: string; to: string }): Promise<void>
  selectOrder(id: string | null): void
  createOrder(input: CreateOrderInput): Promise<RestaurantOrder>
  advanceOrderStatus(orderId: string): Promise<void>
  updateOrderStatus(input: UpdateOrderStatusInput): Promise<void>
  cancelOrder(id: string, reason?: string): Promise<void>
  addOrderItem(orderId: string, item: CreateOrderItemInput): Promise<void>
  removeOrderItem(itemId: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export function createOrdersStore(provider: OrdersDataProvider): StoreApi<OrdersUIState> {
  return createStore<OrdersUIState>((set, get) => ({
    orders: [],
    ordersTotal: 0,
    ordersLoading: false,
    orderQuery: {},

    activeOrders: [],
    activeOrdersLoading: false,

    summary: null,
    summaryLoading: false,

    selectedOrderId: null,

    async fetchOrders(query) {
      return dedup('orders:list:' + JSON.stringify(query), async () => {
        set({ ordersLoading: true, orderQuery: query })
        const result = await provider.getOrders(query)
        set({ orders: result.data, ordersTotal: result.total, ordersLoading: false })
      })
    },

    async fetchActiveOrders() {
      return dedup('orders:active', async () => {
        set({ activeOrdersLoading: true })
        const result = await provider.getOrders({
          status: ['new', 'confirmed', 'preparing', 'ready'],
        })
        set({ activeOrders: result.data, activeOrdersLoading: false })
      })
    },

    async fetchSummary(dateRange) {
      return dedup('orders:summary', async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary(dateRange)
        set({ summary, summaryLoading: false })
      })
    },

    selectOrder(id) {
      set({ selectedOrderId: id })
    },

    async createOrder(input) {
      try {
        const order = await provider.createOrder(input)
        const query = get().orderQuery
        const [result, summary] = await Promise.all([
          provider.getOrders(query),
          provider.getSummary(),
        ])
        set({ orders: result.data, ordersTotal: result.total, summary })
        toast.success('Order created')
        return order
      } catch (err: any) {
        toast.error('Failed to create order', { description: err?.message })
        throw err
      }
    },

    async advanceOrderStatus(orderId) {
      try {
        const { orders, activeOrders } = get()
        const order = orders.find(o => o.id === orderId) ?? activeOrders.find(o => o.id === orderId)
        if (!order) throw new Error('Order not found')

        const nextStatus = getNextStatus(order.kind, order.status)
        if (!nextStatus) throw new Error('No next status available')

        await provider.updateOrderStatus({ orderId, status: nextStatus })

        // Refresh active orders
        const activeResult = await provider.getOrders({
          status: ['new', 'confirmed', 'preparing', 'ready'],
        })
        set({ activeOrders: activeResult.data })
        toast.success(`Order advanced to ${nextStatus.replace('_', ' ')}`)
      } catch (err: any) {
        toast.error('Failed to advance order', { description: err?.message })
        throw err
      }
    },

    async updateOrderStatus(input) {
      try {
        await provider.updateOrderStatus(input)
        const query = get().orderQuery
        const [result, summary] = await Promise.all([
          provider.getOrders(query),
          provider.getSummary(),
        ])
        set({ orders: result.data, ordersTotal: result.total, summary })
        toast.success('Order status updated')
      } catch (err: any) {
        toast.error('Failed to update status', { description: err?.message })
        throw err
      }
    },

    async cancelOrder(id, reason) {
      try {
        await provider.cancelOrder(id, reason)
        const query = get().orderQuery
        const [result, summary] = await Promise.all([
          provider.getOrders(query),
          provider.getSummary(),
        ])
        set({ orders: result.data, ordersTotal: result.total, summary })
        toast.success('Order cancelled')
      } catch (err: any) {
        toast.error('Failed to cancel order', { description: err?.message })
        throw err
      }
    },

    async addOrderItem(orderId, item) {
      try {
        await provider.addOrderItem(orderId, item)
        const query = get().orderQuery
        const result = await provider.getOrders(query)
        set({ orders: result.data, ordersTotal: result.total })
        toast.success('Item added')
      } catch (err: any) {
        toast.error('Failed to add item', { description: err?.message })
        throw err
      }
    },

    async removeOrderItem(itemId) {
      try {
        await provider.removeOrderItem(itemId)
        const query = get().orderQuery
        const result = await provider.getOrders(query)
        set({ orders: result.data, ordersTotal: result.total })
        toast.success('Item removed')
      } catch (err: any) {
        toast.error('Failed to remove item', { description: err?.message })
        throw err
      }
    },
  }))
}
