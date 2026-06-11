// ---------------------------------------------------------------------------
// Tables Plugin — Pure TypeScript types
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'
export type TableShape = 'square' | 'round' | 'rectangle' | 'bar'

// ============================================================
// CORE ENTITIES
// ============================================================

export interface RestaurantTable {
  id: string
  name: string
  number: number
  seats: number
  status: TableStatus
  zone: string
  zoneName?: string
  shape: TableShape
  gridCol: number
  gridRow: number
  isActive: boolean
  // Current session (denormalized for floor plan)
  currentSessionId?: string
  currentOrderId?: string
  currentGuests?: number
  currentWaiterName?: string
  currentElapsedMinutes?: number
  currentTotal?: number
  metadata?: Record<string, unknown>
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface TableSession {
  id: string
  tableId: string
  tableName?: string
  orderId?: string
  guests: number
  waiterId?: string
  waiterName?: string
  seatedAt: string
  closedAt?: string
  status: 'active' | 'closed'
  notes?: string
  tenantId: string
  createdAt: string
}

export interface Zone {
  id: string
  name: string
  color?: string
  sortOrder: number
  isActive: boolean
  tenantId: string
  createdAt: string
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateTableInput {
  name: string
  number: number
  seats: number
  zone: string
  shape?: TableShape
  gridCol?: number
  gridRow?: number
}

export interface SeatGuestsInput {
  tableId: string
  guests: number
  waiterId?: string
  notes?: string
}

export interface UpdateTableStatusInput {
  tableId: string
  status: TableStatus
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface TableQuery {
  zone?: string
  status?: TableStatus | TableStatus[]
  search?: string
}

// ============================================================
// DATA PROVIDER
// ============================================================

export interface TablesDataProvider {
  // Tables
  getTables(query?: TableQuery): Promise<RestaurantTable[]>
  getTableById(id: string): Promise<RestaurantTable | null>
  createTable(input: CreateTableInput): Promise<RestaurantTable>
  updateTable(id: string, data: Partial<RestaurantTable>): Promise<RestaurantTable>
  deleteTable(id: string): Promise<void>
  updateTableStatus(input: UpdateTableStatusInput): Promise<RestaurantTable>
  updateTablePositions(positions: Array<{ id: string; gridCol: number; gridRow: number }>): Promise<void>

  // Sessions
  seatGuests(input: SeatGuestsInput): Promise<TableSession>
  closeSession(sessionId: string): Promise<TableSession>
  getActiveSessions(): Promise<TableSession[]>
  getSessionHistory(tableId?: string): Promise<TableSession[]>

  // Zones
  getZones(): Promise<Zone[]>
  createZone(data: Partial<Zone>): Promise<Zone>
  updateZone(id: string, data: Partial<Zone>): Promise<Zone>
  deleteZone(id: string): Promise<void>

  // Summary
  getSummary(): Promise<TablesSummary>
}

// ============================================================
// AGGREGATION
// ============================================================

export interface TablesSummary {
  totalTables: number
  availableCount: number
  occupiedCount: number
  reservedCount: number
  cleaningCount: number
  totalSeats: number
  occupiedSeats: number
  averageSessionMinutes: number
}
