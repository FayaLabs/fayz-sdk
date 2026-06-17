import { createFayzClient, type FayzClientOptions, type FayzTableFilter } from '@fayz-ai/sdk'
import type {
  CreateOrderInput,
  CreateOrderItemInput,
  OrderKind,
  OrderQuery,
  OrdersSummary,
  OrderStatus,
  PaginatedResult,
  RestaurantOrder,
  RestaurantOrderItem,
  UpdateOrderStatusInput,
} from '../types'
import type { OrdersDataProvider } from './types'

export interface FayzOrdersProviderOptions extends FayzClientOptions {
  projectId?: string
  schema?: string
  runtime?: boolean
  ordersTable?: string
  orderItemsTable?: string
  /**
   * Active tenant id (or a getter) used to scope reads and stamp writes on the
   * orders table. When omitted, scoping is left to the runtime/RLS context.
   * Only the orders table carries `tenant_id`; order_items scope via their
   * parent order, so this never touches the order-items table.
   */
  tenantId?: string | (() => string | undefined | null)
}

interface OrderRow {
  id: string
  tenant_id?: string | null
  reference_number?: string | null
  kind?: OrderKind | null
  status?: OrderStatus | null
  party_id?: string | null
  party_name?: string | null
  assignee_id?: string | null
  assignee_name?: string | null
  location_id?: string | null
  subtotal?: number | string | null
  discount?: number | string | null
  tax?: number | string | null
  total?: number | string | null
  currency?: string | null
  notes?: string | null
  tags?: string[] | null
  source?: string | null
  table_id?: string | null
  table_name?: string | null
  estimated_minutes?: number | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
}

interface OrderItemRow {
  id: string
  order_id?: string | null
  product_id?: string | null
  name?: string | null
  description?: string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  discount?: number | string | null
  total?: number | string | null
  sort_order?: number | null
  modifiers?: string | null
  kitchen_notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

const DEFAULT_ORDERS_TABLE = 'orders'
const DEFAULT_ORDER_ITEMS_TABLE = 'order_items'
const ACTIVE_STATUSES = new Set<OrderStatus>(['new', 'confirmed', 'preparing', 'ready', 'served', 'dispatched'])

function nowIso(): string {
  return new Date().toISOString()
}

function numberValue(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function dateKey(value: string): string {
  return value.slice(0, 10)
}

function referenceNumber(): string {
  return `ORD-${Date.now().toString().slice(-6)}`
}

function itemToRow(item: CreateOrderItemInput, orderId: string, sortOrder: number): Record<string, unknown> {
  const discount = item.discount ?? 0
  return {
    order_id: orderId,
    product_id: item.productId ?? null,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount,
    total: item.quantity * item.unitPrice - discount,
    sort_order: sortOrder,
    modifiers: item.modifiers ?? null,
    kitchen_notes: item.kitchenNotes ?? null,
  }
}

function rowToItem(row: OrderItemRow): RestaurantOrderItem {
  const quantity = numberValue(row.quantity)
  const unitPrice = numberValue(row.unit_price)
  const discount = numberValue(row.discount)
  return {
    id: row.id,
    orderId: row.order_id ?? '',
    productId: row.product_id ?? undefined,
    name: row.name ?? 'Item',
    description: row.description ?? undefined,
    quantity,
    unitPrice,
    discount,
    total: numberValue(row.total) || quantity * unitPrice - discount,
    sortOrder: row.sort_order ?? 0,
    modifiers: row.modifiers ?? undefined,
    kitchenNotes: row.kitchen_notes ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at ?? nowIso(),
  }
}

function rowToOrder(row: OrderRow, items: RestaurantOrderItem[] = []): RestaurantOrder {
  const subtotal = numberValue(row.subtotal) || items.reduce((sum, item) => sum + item.total, 0)
  const discount = numberValue(row.discount)
  const tax = numberValue(row.tax)
  return {
    id: row.id,
    referenceNumber: row.reference_number ?? row.id,
    kind: row.kind ?? 'dine_in',
    status: row.status ?? 'new',
    partyId: row.party_id ?? undefined,
    partyName: row.party_name ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    assigneeName: row.assignee_name ?? undefined,
    locationId: row.location_id ?? undefined,
    subtotal,
    discount,
    tax,
    total: numberValue(row.total) || subtotal - discount + tax,
    currency: row.currency ?? 'BRL',
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    source: row.source ?? 'pos',
    tableId: row.table_id ?? undefined,
    tableName: row.table_name ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    items,
    metadata: row.metadata ?? {},
    tenantId: row.tenant_id ?? 'runtime-tenant',
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
    completedAt: row.completed_at ?? undefined,
  }
}

function orderPayload(input: CreateOrderInput): Record<string, unknown> {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice - (item.discount ?? 0), 0)
  return {
    reference_number: referenceNumber(),
    kind: input.kind,
    status: 'new',
    source: input.source ?? 'pos',
    table_id: input.tableId ?? null,
    party_id: input.partyId ?? null,
    assignee_id: input.assigneeId ?? null,
    notes: input.notes ?? null,
    estimated_minutes: input.estimatedMinutes ?? null,
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    currency: 'BRL',
    tags: [],
  }
}

function updatePayload(data: Partial<RestaurantOrder>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (data.referenceNumber !== undefined) payload.reference_number = data.referenceNumber
  if (data.kind !== undefined) payload.kind = data.kind
  if (data.status !== undefined) payload.status = data.status
  if (data.partyId !== undefined) payload.party_id = data.partyId
  if (data.partyName !== undefined) payload.party_name = data.partyName
  if (data.assigneeId !== undefined) payload.assignee_id = data.assigneeId
  if (data.assigneeName !== undefined) payload.assignee_name = data.assigneeName
  if (data.locationId !== undefined) payload.location_id = data.locationId
  if (data.subtotal !== undefined) payload.subtotal = data.subtotal
  if (data.discount !== undefined) payload.discount = data.discount
  if (data.tax !== undefined) payload.tax = data.tax
  if (data.total !== undefined) payload.total = data.total
  if (data.currency !== undefined) payload.currency = data.currency
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.tags !== undefined) payload.tags = data.tags
  if (data.source !== undefined) payload.source = data.source
  if (data.tableId !== undefined) payload.table_id = data.tableId
  if (data.tableName !== undefined) payload.table_name = data.tableName
  if (data.estimatedMinutes !== undefined) payload.estimated_minutes = data.estimatedMinutes
  if (data.metadata !== undefined) payload.metadata = data.metadata
  if (data.completedAt !== undefined) payload.completed_at = data.completedAt
  return payload
}

function filtersFromQuery(query: OrderQuery): FayzTableFilter[] {
  const filters: FayzTableFilter[] = []
  if (query.kind && !Array.isArray(query.kind)) filters.push({ column: 'kind', operator: 'eq', value: query.kind })
  if (query.status && !Array.isArray(query.status)) filters.push({ column: 'status', operator: 'eq', value: query.status })
  if (query.source) filters.push({ column: 'source', operator: 'eq', value: query.source })
  if (query.tableId) filters.push({ column: 'table_id', operator: 'eq', value: query.tableId })
  if (query.assigneeId) filters.push({ column: 'assignee_id', operator: 'eq', value: query.assigneeId })
  return filters
}

function matchesClientQuery(order: RestaurantOrder, query: OrderQuery): boolean {
  if (Array.isArray(query.kind) && !query.kind.includes(order.kind)) return false
  if (Array.isArray(query.status) && !query.status.includes(order.status)) return false
  if (query.dateRange) {
    const created = dateKey(order.createdAt)
    if (created < query.dateRange.from || created > query.dateRange.to) return false
  }
  if (query.search) {
    const search = query.search.toLowerCase()
    return order.referenceNumber.toLowerCase().includes(search)
      || (order.partyName?.toLowerCase().includes(search) ?? false)
      || (order.tableName?.toLowerCase().includes(search) ?? false)
      || order.items.some((item) => item.name.toLowerCase().includes(search))
  }
  return true
}

function paginate<T>(items: T[], page?: number, pageSize?: number): PaginatedResult<T> {
  const currentPage = page ?? 1
  const limit = pageSize ?? 20
  const start = (currentPage - 1) * limit
  return { data: items.slice(start, start + limit), total: items.length }
}

function summarize(orders: RestaurantOrder[], dateRange?: { from: string; to: string }): OrdersSummary {
  const today = dateKey(nowIso())
  const from = dateRange?.from ?? today
  const to = dateRange?.to ?? today
  const inRange = orders.filter((order) => {
    const created = dateKey(order.createdAt)
    return created >= from && created <= to
  })
  const billable = inRange.filter((order) => order.status !== 'cancelled')
  const revenue = billable.reduce((sum, order) => sum + order.total, 0)
  const ordersByKind: Record<OrderKind, number> = { dine_in: 0, takeout: 0, delivery: 0 }
  const ordersByStatus: Record<string, number> = {}
  const top = new Map<string, { name: string; quantity: number; revenue: number }>()

  for (const order of inRange) {
    ordersByKind[order.kind] = (ordersByKind[order.kind] ?? 0) + 1
    ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1
    if (order.status === 'cancelled') continue
    for (const item of order.items) {
      const current = top.get(item.name) ?? { name: item.name, quantity: 0, revenue: 0 }
      current.quantity += item.quantity
      current.revenue += item.total
      top.set(item.name, current)
    }
  }

  return {
    todayOrderCount: inRange.length,
    todayRevenue: revenue,
    averageTicket: billable.length > 0 ? revenue / billable.length : 0,
    activeOrderCount: orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length,
    ordersByKind,
    ordersByStatus,
    topItems: [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  }
}

export function createFayzOrdersProvider(options: FayzOrdersProviderOptions = {}): OrdersDataProvider {
  const client = createFayzClient(options)
  const ordersTable = options.ordersTable ?? DEFAULT_ORDERS_TABLE
  const orderItemsTable = options.orderItemsTable ?? DEFAULT_ORDER_ITEMS_TABLE
  const tableOptions = { projectId: options.projectId, schema: options.schema, runtime: options.runtime }

  function resolveTenant(): string | undefined {
    const value = typeof options.tenantId === 'function' ? options.tenantId() : options.tenantId
    return value ?? undefined
  }

  function withTenant(filters: FayzTableFilter[]): FayzTableFilter[] {
    const tenantId = resolveTenant()
    return tenantId ? [{ column: 'tenant_id', operator: 'eq', value: tenantId }, ...filters] : filters
  }

  async function listItemRows(orderIds: string[]): Promise<OrderItemRow[]> {
    if (orderIds.length === 0) return []
    const rows: OrderItemRow[] = []
    await Promise.all(orderIds.map(async (orderId) => {
      const response = await client.data.listRows<OrderItemRow>({
        ...tableOptions,
        table: orderItemsTable,
        filters: [{ column: 'order_id', operator: 'eq', value: orderId }],
        sortColumn: 'sort_order',
        sortDirection: 'asc',
        limit: 200,
      })
      rows.push(...response.rows)
    }))
    return rows
  }

  async function hydrate(rows: OrderRow[]): Promise<RestaurantOrder[]> {
    const itemRows = await listItemRows(rows.map((row) => row.id))
    const byOrder = new Map<string, RestaurantOrderItem[]>()
    for (const itemRow of itemRows) {
      const item = rowToItem(itemRow)
      const list = byOrder.get(item.orderId) ?? []
      list.push(item)
      byOrder.set(item.orderId, list)
    }
    return rows.map((row) => rowToOrder(row, byOrder.get(row.id) ?? []))
  }

  async function listOrders(query: OrderQuery = {}): Promise<RestaurantOrder[]> {
    const response = await client.data.listRows<OrderRow>({
      ...tableOptions,
      table: ordersTable,
      filters: withTenant(filtersFromQuery(query)),
      sortColumn: 'created_at',
      sortDirection: 'desc',
      limit: 500,
    })
    return (await hydrate(response.rows)).filter((order) => matchesClientQuery(order, query))
  }

  async function getById(id: string): Promise<RestaurantOrder | null> {
    const response = await client.data.listRows<OrderRow>({
      ...tableOptions,
      table: ordersTable,
      filters: withTenant([{ column: 'id', operator: 'eq', value: id }]),
      limit: 1,
    })
    return (await hydrate(response.rows))[0] ?? null
  }

  return {
    async getOrders(query) {
      const orders = await listOrders(query)
      return paginate(orders, query.page, query.pageSize)
    },

    async getOrderById(id) {
      return getById(id)
    },

    async createOrder(input) {
      const tenantId = resolveTenant()
      const orderRow = await client.data.createRow<OrderRow>({
        ...tableOptions,
        table: ordersTable,
        row: tenantId ? { ...orderPayload(input), tenant_id: tenantId } : orderPayload(input),
      })
      await Promise.all(input.items.map((item, index) => client.data.createRow<OrderItemRow>({
        ...tableOptions,
        table: orderItemsTable,
        row: itemToRow(item, orderRow.id, index),
      })))
      return (await getById(orderRow.id)) ?? rowToOrder(orderRow)
    },

    async updateOrderStatus(input: UpdateOrderStatusInput) {
      const completedAt = input.status === 'completed' ? nowIso() : undefined
      return this.updateOrder(input.orderId, { status: input.status, completedAt })
    },

    async updateOrder(id, data) {
      const row = await client.data.updateRow<OrderRow>({
        ...tableOptions,
        table: ordersTable,
        primaryKeys: { id },
        row: updatePayload(data),
      })
      return (await getById(row.id)) ?? rowToOrder(row)
    },

    async cancelOrder(id, reason) {
      const order = await getById(id)
      await this.updateOrder(id, {
        status: 'cancelled',
        notes: reason ? `${order?.notes ? `${order.notes}\n` : ''}Cancelled: ${reason}` : order?.notes,
      })
    },

    async addOrderItem(orderId, item) {
      const order = await getById(orderId)
      const row = await client.data.createRow<OrderItemRow>({
        ...tableOptions,
        table: orderItemsTable,
        row: itemToRow(item, orderId, order?.items.length ?? 0),
      })
      const created = rowToItem(row)
      const items = [...(order?.items ?? []), created]
      await this.updateOrder(orderId, {
        subtotal: items.reduce((sum, orderItem) => sum + orderItem.total, 0),
        total: items.reduce((sum, orderItem) => sum + orderItem.total, 0) - (order?.discount ?? 0) + (order?.tax ?? 0),
      })
      return created
    },

    async removeOrderItem(itemId) {
      const orders = await listOrders()
      const order = orders.find((item) => item.items.some((orderItem) => orderItem.id === itemId))
      await client.data.deleteRows({ ...tableOptions, table: orderItemsTable, rows: [{ id: itemId }] })
      if (order) {
        const items = order.items.filter((item) => item.id !== itemId)
        const subtotal = items.reduce((sum, item) => sum + item.total, 0)
        await this.updateOrder(order.id, { subtotal, total: subtotal - order.discount + order.tax })
      }
    },

    async updateOrderItem(itemId, data) {
      const row = await client.data.updateRow<OrderItemRow>({
        ...tableOptions,
        table: orderItemsTable,
        primaryKeys: { id: itemId },
        row: {
          product_id: data.productId,
          name: data.name,
          description: data.description,
          quantity: data.quantity,
          unit_price: data.unitPrice,
          discount: data.discount,
          total: data.total,
          sort_order: data.sortOrder,
          modifiers: data.modifiers,
          kitchen_notes: data.kitchenNotes,
          metadata: data.metadata,
        },
      })
      return rowToItem(row)
    },

    async getSummary(dateRange) {
      return summarize(await listOrders({ dateRange }), dateRange)
    },
  }
}
