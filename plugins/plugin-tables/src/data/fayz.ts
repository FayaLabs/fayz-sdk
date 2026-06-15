import { createFayzClient, type FayzClientOptions, type FayzTableFilter } from '@fayz-ai/sdk'
import type {
  CreateTableInput,
  RestaurantTable,
  SeatGuestsInput,
  TableQuery,
  TableSession,
  TablesSummary,
  TableStatus,
  UpdateTableStatusInput,
  Zone,
} from '../types'
import type { TablesDataProvider } from './types'

export interface FayzTablesProviderOptions extends FayzClientOptions {
  projectId?: string
  tableName?: string
  schema?: string
  runtime?: boolean
}

interface RestaurantTableRow {
  id: string
  tenant_id?: string | null
  name?: string | null
  number?: number | null
  seats?: number | null
  status?: TableStatus | null
  zone?: string | null
  zone_name?: string | null
  shape?: RestaurantTable['shape'] | null
  grid_col?: number | null
  grid_row?: number | null
  is_active?: boolean | null
  current_session_id?: string | null
  current_order_id?: string | null
  current_guests?: number | null
  current_waiter_name?: string | null
  current_elapsed_minutes?: number | null
  current_total?: number | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

const DEFAULT_TABLE_NAME = 'restaurant_tables'

function nowIso(): string {
  return new Date().toISOString()
}

function rowToTable(row: RestaurantTableRow): RestaurantTable {
  const number = row.number ?? 0
  const zone = row.zone ?? 'indoor'
  return {
    id: row.id,
    name: row.name ?? `Table ${number}`,
    number,
    seats: row.seats ?? 4,
    status: row.status ?? 'available',
    zone,
    zoneName: row.zone_name ?? zone,
    shape: row.shape ?? 'square',
    gridCol: row.grid_col ?? 0,
    gridRow: row.grid_row ?? 0,
    isActive: row.is_active ?? true,
    currentSessionId: row.current_session_id ?? undefined,
    currentOrderId: row.current_order_id ?? undefined,
    currentGuests: row.current_guests ?? undefined,
    currentWaiterName: row.current_waiter_name ?? undefined,
    currentElapsedMinutes: row.current_elapsed_minutes ?? undefined,
    currentTotal: row.current_total ?? undefined,
    metadata: row.metadata ?? {},
    tenantId: row.tenant_id ?? 'runtime-tenant',
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? row.created_at ?? nowIso(),
  }
}

function tableCreatePayload(input: CreateTableInput): Record<string, unknown> {
  return {
    name: input.name,
    number: input.number,
    seats: input.seats,
    zone: input.zone,
    shape: input.shape ?? 'square',
    grid_col: input.gridCol ?? 0,
    grid_row: input.gridRow ?? 0,
    status: 'available',
    is_active: true,
  }
}

function tableUpdatePayload(data: Partial<RestaurantTable>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.number !== undefined) payload.number = data.number
  if (data.seats !== undefined) payload.seats = data.seats
  if (data.status !== undefined) payload.status = data.status
  if (data.zone !== undefined) payload.zone = data.zone
  if (data.zoneName !== undefined) payload.zone_name = data.zoneName
  if (data.shape !== undefined) payload.shape = data.shape
  if (data.gridCol !== undefined) payload.grid_col = data.gridCol
  if (data.gridRow !== undefined) payload.grid_row = data.gridRow
  if (data.isActive !== undefined) payload.is_active = data.isActive
  if (data.currentSessionId !== undefined) payload.current_session_id = data.currentSessionId
  if (data.currentOrderId !== undefined) payload.current_order_id = data.currentOrderId
  if (data.currentGuests !== undefined) payload.current_guests = data.currentGuests
  if (data.currentWaiterName !== undefined) payload.current_waiter_name = data.currentWaiterName
  if (data.currentElapsedMinutes !== undefined) payload.current_elapsed_minutes = data.currentElapsedMinutes
  if (data.currentTotal !== undefined) payload.current_total = data.currentTotal
  if (data.metadata !== undefined) payload.metadata = data.metadata
  return payload
}

function filtersFromQuery(query?: TableQuery): FayzTableFilter[] {
  const filters: FayzTableFilter[] = [{ column: 'is_active', operator: 'eq', value: true }]
  if (!query) return filters
  if (query.zone) filters.push({ column: 'zone', operator: 'eq', value: query.zone })
  if (query.status && !Array.isArray(query.status)) {
    filters.push({ column: 'status', operator: 'eq', value: query.status })
  }
  return filters
}

function matchesClientQuery(table: RestaurantTable, query?: TableQuery): boolean {
  if (!query) return true
  if (Array.isArray(query.status) && !query.status.includes(table.status)) return false
  if (query.search) {
    const search = query.search.toLowerCase()
    return table.name.toLowerCase().includes(search)
      || String(table.number).includes(search)
      || (table.zoneName?.toLowerCase().includes(search) ?? false)
  }
  return true
}

function summarize(tables: RestaurantTable[]): TablesSummary {
  const availableCount = tables.filter((table) => table.status === 'available').length
  const occupiedCount = tables.filter((table) => table.status === 'occupied').length
  const reservedCount = tables.filter((table) => table.status === 'reserved').length
  const cleaningCount = tables.filter((table) => table.status === 'cleaning').length
  const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0)
  const occupiedSeats = tables
    .filter((table) => table.status === 'occupied')
    .reduce((sum, table) => sum + (table.currentGuests ?? table.seats), 0)

  return {
    totalTables: tables.length,
    availableCount,
    occupiedCount,
    reservedCount,
    cleaningCount,
    totalSeats,
    occupiedSeats,
    averageSessionMinutes: 0,
  }
}

export function createFayzTablesProvider(options: FayzTablesProviderOptions = {}): TablesDataProvider {
  const client = createFayzClient(options)
  const table = options.tableName ?? DEFAULT_TABLE_NAME
  const baseOptions = {
    projectId: options.projectId,
    table,
    schema: options.schema,
    runtime: options.runtime,
  }

  async function listTables(query?: TableQuery): Promise<RestaurantTable[]> {
    const response = await client.data.listRows<RestaurantTableRow>({
      ...baseOptions,
      filters: filtersFromQuery(query),
      sortColumn: 'number',
      sortDirection: 'asc',
      limit: 500,
    })
    return response.rows.map(rowToTable).filter((item) => matchesClientQuery(item, query))
  }

  async function getById(id: string): Promise<RestaurantTable | null> {
    const response = await client.data.listRows<RestaurantTableRow>({
      ...baseOptions,
      filters: [{ column: 'id', operator: 'eq', value: id }],
      limit: 1,
    })
    return response.rows[0] ? rowToTable(response.rows[0]) : null
  }

  return {
    async getTables(query?: TableQuery) {
      return listTables(query)
    },

    async getTableById(id: string) {
      return getById(id)
    },

    async createTable(input: CreateTableInput) {
      const row = await client.data.createRow<RestaurantTableRow>({
        ...baseOptions,
        row: tableCreatePayload(input),
      })
      return rowToTable(row)
    },

    async updateTable(id: string, data: Partial<RestaurantTable>) {
      const row = await client.data.updateRow<RestaurantTableRow>({
        ...baseOptions,
        primaryKeys: { id },
        row: tableUpdatePayload(data),
      })
      return rowToTable(row)
    },

    async deleteTable(id: string) {
      await client.data.deleteRows({ ...baseOptions, rows: [{ id }] })
    },

    async updateTableStatus(input: UpdateTableStatusInput) {
      return this.updateTable(input.tableId, { status: input.status })
    },

    async updateTablePositions(positions: Array<{ id: string; gridCol: number; gridRow: number }>) {
      await Promise.all(positions.map((position) => this.updateTable(position.id, {
        gridCol: position.gridCol,
        gridRow: position.gridRow,
      })))
    },

    async seatGuests(input: SeatGuestsInput) {
      const table = await this.updateTable(input.tableId, {
        status: 'occupied',
        currentGuests: input.guests,
        currentWaiterName: input.waiterId ? `Waiter ${input.waiterId}` : undefined,
        currentElapsedMinutes: 0,
        currentTotal: 0,
      })
      const session: TableSession = {
        id: table.currentSessionId ?? `runtime-session-${table.id}`,
        tableId: table.id,
        tableName: table.name,
        guests: input.guests,
        waiterId: input.waiterId,
        waiterName: table.currentWaiterName,
        seatedAt: nowIso(),
        status: 'active',
        notes: input.notes,
        tenantId: table.tenantId,
        createdAt: nowIso(),
      }
      return session
    },

    async closeSession(sessionId: string) {
      const tables = await listTables()
      const table = tables.find((item) => item.currentSessionId === sessionId)
      if (table) await this.updateTable(table.id, {
        status: 'cleaning',
        currentSessionId: undefined,
        currentOrderId: undefined,
        currentGuests: undefined,
        currentWaiterName: undefined,
        currentElapsedMinutes: undefined,
        currentTotal: undefined,
      })
      return {
        id: sessionId,
        tableId: table?.id ?? '',
        tableName: table?.name,
        guests: table?.currentGuests ?? 0,
        seatedAt: nowIso(),
        closedAt: nowIso(),
        status: 'closed',
        tenantId: table?.tenantId ?? 'runtime-tenant',
        createdAt: nowIso(),
      }
    },

    async getActiveSessions() {
      const tables = await listTables({ status: 'occupied' })
      return tables.map((table) => ({
        id: table.currentSessionId ?? `runtime-session-${table.id}`,
        tableId: table.id,
        tableName: table.name,
        guests: table.currentGuests ?? table.seats,
        waiterName: table.currentWaiterName,
        seatedAt: nowIso(),
        status: 'active' as const,
        tenantId: table.tenantId,
        createdAt: nowIso(),
      }))
    },

    async getSessionHistory() {
      return []
    },

    async getZones() {
      const tables = await listTables()
      const zones = new Map<string, Zone>()
      for (const table of tables) {
        if (zones.has(table.zone)) continue
        zones.set(table.zone, {
          id: table.zone,
          name: table.zoneName ?? table.zone,
          sortOrder: zones.size,
          isActive: true,
          tenantId: table.tenantId,
          createdAt: table.createdAt,
        })
      }
      return [...zones.values()]
    },

    async createZone() {
      throw new Error('Restaurant zone writes require a dedicated Fayz table/broker contract.')
    },

    async updateZone() {
      throw new Error('Restaurant zone writes require a dedicated Fayz table/broker contract.')
    },

    async deleteZone() {
      throw new Error('Restaurant zone writes require a dedicated Fayz table/broker contract.')
    },

    async getSummary() {
      return summarize(await listTables())
    },
  }
}
