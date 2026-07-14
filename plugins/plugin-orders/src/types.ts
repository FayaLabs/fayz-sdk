// ---------------------------------------------------------------------------
// Orders Plugin — Pure TypeScript types
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

export type OrderKind = 'dine_in' | 'takeout' | 'delivery'

export type DineInStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
export type TakeoutStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'completed' | 'cancelled'
export type DeliveryStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'completed' | 'cancelled'
export type OrderStatus = DineInStatus | TakeoutStatus | DeliveryStatus

/** Unified columns for the kanban board */
export type KanbanColumn = 'new' | 'confirmed' | 'preparing' | 'ready' | 'out' | 'completed' | 'cancelled'

// ============================================================
// STATUS FLOW
// ============================================================

export const STATUS_FLOW: Record<OrderKind, OrderStatus[]> = {
  dine_in: ['new', 'confirmed', 'preparing', 'ready', 'served', 'completed'],
  takeout: ['new', 'confirmed', 'preparing', 'ready', 'picked_up', 'completed'],
  delivery: ['new', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'completed'],
}

export function getNextStatus(kind: OrderKind, current: OrderStatus): OrderStatus | null {
  const flow = STATUS_FLOW[kind]
  const idx = flow.indexOf(current)
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null
}

export function getPreviousStatus(kind: OrderKind, current: OrderStatus): OrderStatus | null {
  const flow = STATUS_FLOW[kind]
  const idx = flow.indexOf(current)
  return idx > 0 ? flow[idx - 1] : null
}

export function mapToKanbanColumn(status: OrderStatus): KanbanColumn {
  if (['served', 'picked_up', 'dispatched', 'delivered'].includes(status)) return 'out'
  if (['new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
    return status as KanbanColumn
  }
  return 'new'
}

export const KANBAN_COLUMNS: KanbanColumn[] = ['new', 'confirmed', 'preparing', 'ready', 'out', 'completed']

// ============================================================
// CORE ENTITIES
// ============================================================

/** Restaurant order — public.orders + public.orders extension */
export interface RestaurantOrder {
  id: string
  referenceNumber: string
  kind: OrderKind
  status: OrderStatus
  partyId?: string
  partyName?: string
  assigneeId?: string
  assigneeName?: string
  locationId?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  currency: string
  notes?: string
  tags: string[]
  // Extension fields
  source: string
  tableId?: string
  tableName?: string
  estimatedMinutes?: number
  items: RestaurantOrderItem[]
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface RestaurantOrderItem {
  id: string
  orderId: string
  productId?: string
  name: string
  description?: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  sortOrder: number
  modifiers?: string
  kitchenNotes?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateOrderInput {
  kind: OrderKind
  source?: string
  tableId?: string
  partyId?: string
  assigneeId?: string
  notes?: string
  estimatedMinutes?: number
  items: CreateOrderItemInput[]
}

export interface CreateOrderItemInput {
  productId?: string
  name: string
  quantity: number
  unitPrice: number
  discount?: number
  modifiers?: string
  kitchenNotes?: string
}

export interface UpdateOrderStatusInput {
  orderId: string
  status: OrderStatus
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface OrderQuery {
  kind?: OrderKind | OrderKind[]
  status?: OrderStatus | OrderStatus[]
  source?: string
  tableId?: string
  assigneeId?: string
  dateRange?: { from: string; to: string }
  search?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
}

// ============================================================
// AGGREGATION
// ============================================================

export interface OrdersSummary {
  todayOrderCount: number
  todayRevenue: number
  averageTicket: number
  activeOrderCount: number
  ordersByKind: Record<OrderKind, number>
  ordersByStatus: Record<string, number>
  topItems: Array<{ name: string; quantity: number; revenue: number }>
}

// ============================================================
// STATUS CONFIG
// ============================================================

export interface OrderStatusConfig {
  value: string
  label: string
  color: string
  icon?: string
}

export const DEFAULT_STATUS_CONFIGS: OrderStatusConfig[] = [
  { value: 'new', label: 'New', color: '#6366f1', icon: 'PlusCircle' },
  { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', icon: 'CheckCircle' },
  { value: 'preparing', label: 'Preparing', color: '#f59e0b', icon: 'ChefHat' },
  { value: 'ready', label: 'Ready', color: '#10b981', icon: 'Bell' },
  { value: 'served', label: 'Served', color: '#06b6d4', icon: 'Utensils' },
  { value: 'picked_up', label: 'Picked Up', color: '#06b6d4', icon: 'ShoppingBag' },
  { value: 'dispatched', label: 'Dispatched', color: '#8b5cf6', icon: 'Truck' },
  { value: 'delivered', label: 'Delivered', color: '#06b6d4', icon: 'PackageCheck' },
  { value: 'completed', label: 'Completed', color: '#22c55e', icon: 'CircleCheck' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444', icon: 'XCircle' },
]
