import type {
  RestaurantOrder, RestaurantOrderItem,
  CreateOrderInput, CreateOrderItemInput, UpdateOrderStatusInput,
  OrderQuery, PaginatedResult, OrdersSummary,
  OrderKind, OrderStatus,
} from '../types'
import { getNextStatus, STATUS_FLOW } from '../types'
import type { OrdersDataProvider } from './types'

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

let uid = 100
function nextId(prefix: string) { return prefix + '-' + (++uid) }

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const now = new Date().toISOString()

function makeItem(
  orderId: string,
  name: string,
  quantity: number,
  unitPrice: number,
  sortOrder: number,
  productId?: string,
): RestaurantOrderItem {
  const id = nextId('item')
  return {
    id,
    orderId,
    productId,
    name,
    quantity,
    unitPrice,
    discount: 0,
    total: quantity * unitPrice,
    sortOrder,
    createdAt: now,
  }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function createSeedOrders(): RestaurantOrder[] {
  const order1Id = nextId('order')
  const order1Items = [
    makeItem(order1Id, 'Classic Burger', 1, 32, 0, 'prod-burger-classic'),
    makeItem(order1Id, 'Fries', 1, 15, 1, 'prod-fries'),
  ]
  const order1: RestaurantOrder = {
    id: order1Id,
    referenceNumber: 'ORD-0001',
    kind: 'dine_in',
    status: 'preparing',
    source: 'pos',
    tableId: 'table-3',
    tableName: 'Table 3',
    subtotal: 47,
    discount: 0,
    tax: 0,
    total: 47,
    currency: 'BRL',
    tags: [],
    items: order1Items,
    tenantId: 'tenant-mock',
    createdAt: now,
    updatedAt: now,
  }

  const order2Id = nextId('order')
  const order2Items = [
    makeItem(order2Id, 'Cheese Burger', 1, 36, 0, 'prod-burger-cheese'),
  ]
  const order2: RestaurantOrder = {
    id: order2Id,
    referenceNumber: 'ORD-0002',
    kind: 'takeout',
    status: 'ready',
    source: 'pos',
    subtotal: 36,
    discount: 0,
    tax: 0,
    total: 36,
    currency: 'BRL',
    tags: [],
    items: order2Items,
    tenantId: 'tenant-mock',
    createdAt: now,
    updatedAt: now,
  }

  const order3Id = nextId('order')
  const order3Items = [
    makeItem(order3Id, 'Margherita Pizza', 1, 38, 0, 'prod-pizza-margherita'),
    makeItem(order3Id, 'Caesar Salad', 1, 22, 1, 'prod-salad-caesar'),
    makeItem(order3Id, 'Soda 350ml', 1, 12, 2, 'prod-soda'),
  ]
  const order3: RestaurantOrder = {
    id: order3Id,
    referenceNumber: 'ORD-0003',
    kind: 'delivery',
    status: 'confirmed',
    source: 'ifood',
    subtotal: 72,
    discount: 0,
    tax: 0,
    total: 72,
    currency: 'BRL',
    tags: [],
    items: order3Items,
    tenantId: 'tenant-mock',
    createdAt: now,
    updatedAt: now,
  }

  const order4Id = nextId('order')
  const order4Items = [
    makeItem(order4Id, 'BBQ Bacon Burger', 1, 42, 0, 'prod-burger-bbq'),
  ]
  const order4: RestaurantOrder = {
    id: order4Id,
    referenceNumber: 'ORD-0004',
    kind: 'dine_in',
    status: 'new',
    source: 'pos',
    tableId: 'table-7',
    tableName: 'Table 7',
    subtotal: 42,
    discount: 0,
    tax: 0,
    total: 42,
    currency: 'BRL',
    tags: [],
    items: order4Items,
    tenantId: 'tenant-mock',
    createdAt: now,
    updatedAt: now,
  }

  const order5Id = nextId('order')
  const order5Items = [
    makeItem(order5Id, 'Classic Burger', 2, 32, 0, 'prod-burger-classic'),
    makeItem(order5Id, 'Fries', 1, 15, 1, 'prod-fries'),
    makeItem(order5Id, 'Onion Rings', 1, 18, 2, 'prod-onion-rings'),
    makeItem(order5Id, 'Milkshake', 1, 23, 3, 'prod-milkshake'),
  ]
  const order5: RestaurantOrder = {
    id: order5Id,
    referenceNumber: 'ORD-0005',
    kind: 'dine_in',
    status: 'completed',
    source: 'pos',
    tableId: 'table-1',
    tableName: 'Table 1',
    subtotal: 120,
    discount: 0,
    tax: 0,
    total: 120,
    currency: 'BRL',
    tags: [],
    items: order5Items,
    tenantId: 'tenant-mock',
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  }

  return [order1, order2, order3, order4, order5]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recomputeTotals(order: RestaurantOrder): void {
  order.subtotal = order.items.reduce((sum, i) => sum + i.total, 0)
  order.total = order.subtotal - order.discount + order.tax
}

let refCounter = 5
function generateReferenceNumber(): string {
  refCounter++
  return 'ORD-' + String(refCounter).padStart(4, '0')
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export function createMockOrdersProvider(): OrdersDataProvider {
  const orders: RestaurantOrder[] = createSeedOrders()

  function findOrder(id: string): RestaurantOrder | undefined {
    return orders.find(o => o.id === id)
  }

  function findItem(itemId: string): { order: RestaurantOrder; item: RestaurantOrderItem; index: number } | undefined {
    for (const order of orders) {
      const index = order.items.findIndex(i => i.id === itemId)
      if (index !== -1) return { order, item: order.items[index], index }
    }
    return undefined
  }

  const provider: OrdersDataProvider = {
    // ------------------------------------------------------------------
    // getOrders
    // ------------------------------------------------------------------
    async getOrders(query: OrderQuery): Promise<PaginatedResult<RestaurantOrder>> {
      let result = [...orders]

      // Filter by kind
      if (query.kind) {
        const kinds = Array.isArray(query.kind) ? query.kind : [query.kind]
        result = result.filter(o => kinds.includes(o.kind))
      }

      // Filter by status
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status]
        result = result.filter(o => (statuses as string[]).includes(o.status))
      }

      // Filter by source
      if (query.source) {
        result = result.filter(o => o.source === query.source)
      }

      // Filter by tableId
      if (query.tableId) {
        result = result.filter(o => o.tableId === query.tableId)
      }

      // Filter by assigneeId
      if (query.assigneeId) {
        result = result.filter(o => o.assigneeId === query.assigneeId)
      }

      // Filter by search (reference number, party name, table name)
      if (query.search) {
        const q = query.search.toLowerCase()
        result = result.filter(o =>
          o.referenceNumber.toLowerCase().includes(q) ||
          o.partyName?.toLowerCase().includes(q) ||
          o.tableName?.toLowerCase().includes(q) ||
          o.items.some(i => i.name.toLowerCase().includes(q))
        )
      }

      // Filter by date range
      if (query.dateRange) {
        const from = query.dateRange.from
        const to = query.dateRange.to
        result = result.filter(o => {
          const d = o.createdAt.slice(0, 10)
          return d >= from && d <= to
        })
      }

      // Sort by createdAt desc
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

      const total = result.length
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 20
      const start = (page - 1) * pageSize
      const data = result.slice(start, start + pageSize)

      return { data, total }
    },

    // ------------------------------------------------------------------
    // getOrderById
    // ------------------------------------------------------------------
    async getOrderById(id: string): Promise<RestaurantOrder | null> {
      return findOrder(id) ?? null
    },

    // ------------------------------------------------------------------
    // createOrder
    // ------------------------------------------------------------------
    async createOrder(input: CreateOrderInput): Promise<RestaurantOrder> {
      const orderId = nextId('order')
      const items: RestaurantOrderItem[] = input.items.map((item, idx) => ({
        id: nextId('item'),
        orderId,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        total: item.quantity * item.unitPrice - (item.discount ?? 0),
        sortOrder: idx,
        modifiers: item.modifiers,
        kitchenNotes: item.kitchenNotes,
        createdAt: new Date().toISOString(),
      }))

      const subtotal = items.reduce((sum, i) => sum + i.total, 0)

      const order: RestaurantOrder = {
        id: orderId,
        referenceNumber: generateReferenceNumber(),
        kind: input.kind,
        status: 'new',
        source: input.source ?? 'pos',
        tableId: input.tableId,
        partyId: input.partyId,
        assigneeId: input.assigneeId,
        notes: input.notes,
        estimatedMinutes: input.estimatedMinutes,
        subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        currency: 'BRL',
        tags: [],
        items,
        tenantId: 'tenant-mock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      orders.push(order)
      return order
    },

    // ------------------------------------------------------------------
    // updateOrderStatus
    // ------------------------------------------------------------------
    async updateOrderStatus(input: UpdateOrderStatusInput): Promise<RestaurantOrder> {
      const order = findOrder(input.orderId)
      if (!order) throw new Error(`Order not found: ${input.orderId}`)

      // Validate the transition: the target status must be reachable via getNextStatus
      // or it must be 'cancelled'
      if (input.status !== 'cancelled') {
        const flow = STATUS_FLOW[order.kind]
        const currentIdx = flow.indexOf(order.status)
        const targetIdx = flow.indexOf(input.status)
        if (targetIdx < 0 || targetIdx !== currentIdx + 1) {
          const next = getNextStatus(order.kind, order.status)
          throw new Error(
            `Invalid status transition: ${order.status} → ${input.status}. ` +
            (next ? `Expected next status: ${next}` : 'Order is already in a terminal state.')
          )
        }
      }

      order.status = input.status
      order.updatedAt = new Date().toISOString()

      if (input.status === 'completed') {
        order.completedAt = order.updatedAt
      }

      return order
    },

    // ------------------------------------------------------------------
    // updateOrder
    // ------------------------------------------------------------------
    async updateOrder(id: string, data: Partial<RestaurantOrder>): Promise<RestaurantOrder> {
      const order = findOrder(id)
      if (!order) throw new Error(`Order not found: ${id}`)

      const { id: _id, items: _items, tenantId: _t, createdAt: _c, ...safe } = data
      Object.assign(order, safe)
      order.updatedAt = new Date().toISOString()
      return order
    },

    // ------------------------------------------------------------------
    // cancelOrder
    // ------------------------------------------------------------------
    async cancelOrder(id: string, reason?: string): Promise<void> {
      const order = findOrder(id)
      if (!order) throw new Error(`Order not found: ${id}`)

      order.status = 'cancelled'
      order.updatedAt = new Date().toISOString()
      if (reason) {
        order.notes = order.notes ? `${order.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`
      }
    },

    // ------------------------------------------------------------------
    // addOrderItem
    // ------------------------------------------------------------------
    async addOrderItem(orderId: string, item: CreateOrderItemInput): Promise<RestaurantOrderItem> {
      const order = findOrder(orderId)
      if (!order) throw new Error(`Order not found: ${orderId}`)

      const newItem: RestaurantOrderItem = {
        id: nextId('item'),
        orderId,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        total: item.quantity * item.unitPrice - (item.discount ?? 0),
        sortOrder: order.items.length,
        modifiers: item.modifiers,
        kitchenNotes: item.kitchenNotes,
        createdAt: new Date().toISOString(),
      }

      order.items.push(newItem)
      recomputeTotals(order)
      order.updatedAt = new Date().toISOString()
      return newItem
    },

    // ------------------------------------------------------------------
    // removeOrderItem
    // ------------------------------------------------------------------
    async removeOrderItem(itemId: string): Promise<void> {
      const found = findItem(itemId)
      if (!found) throw new Error(`Order item not found: ${itemId}`)

      found.order.items.splice(found.index, 1)
      recomputeTotals(found.order)
      found.order.updatedAt = new Date().toISOString()
    },

    // ------------------------------------------------------------------
    // updateOrderItem
    // ------------------------------------------------------------------
    async updateOrderItem(itemId: string, data: Partial<RestaurantOrderItem>): Promise<RestaurantOrderItem> {
      const found = findItem(itemId)
      if (!found) throw new Error(`Order item not found: ${itemId}`)

      const { id: _id, orderId: _oid, createdAt: _c, ...safe } = data
      Object.assign(found.item, safe)

      // Recompute item total if quantity or price changed
      found.item.total = found.item.quantity * found.item.unitPrice - found.item.discount

      recomputeTotals(found.order)
      found.order.updatedAt = new Date().toISOString()
      return found.item
    },

    // ------------------------------------------------------------------
    // getSummary
    // ------------------------------------------------------------------
    async getSummary(dateRange?: { from: string; to: string }): Promise<OrdersSummary> {
      const today = toDateStr(new Date())
      const from = dateRange?.from ?? today
      const to = dateRange?.to ?? today

      const inRange = orders.filter(o => {
        const d = o.createdAt.slice(0, 10)
        return d >= from && d <= to
      })

      const completed = inRange.filter(o => o.status !== 'cancelled')
      const revenue = completed.reduce((sum, o) => sum + o.total, 0)

      const activeStatuses = new Set(['new', 'confirmed', 'preparing', 'ready', 'served', 'dispatched'])
      const active = orders.filter(o => activeStatuses.has(o.status))

      const ordersByKind: Record<OrderKind, number> = { dine_in: 0, takeout: 0, delivery: 0 }
      const ordersByStatus: Record<string, number> = {}

      for (const o of inRange) {
        ordersByKind[o.kind] = (ordersByKind[o.kind] || 0) + 1
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
      }

      // Top items
      const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
      for (const o of completed) {
        for (const item of o.items) {
          const existing = itemMap.get(item.name)
          if (existing) {
            existing.quantity += item.quantity
            existing.revenue += item.total
          } else {
            itemMap.set(item.name, { name: item.name, quantity: item.quantity, revenue: item.total })
          }
        }
      }
      const topItems = Array.from(itemMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      return {
        todayOrderCount: inRange.length,
        todayRevenue: revenue,
        averageTicket: completed.length > 0 ? revenue / completed.length : 0,
        activeOrderCount: active.length,
        ordersByKind,
        ordersByStatus,
        topItems,
      }
    },
  }

  return provider
}
