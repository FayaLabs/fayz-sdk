import type {
  RestaurantTable, TableSession, Zone,
  CreateTableInput, SeatGuestsInput, UpdateTableStatusInput,
  TableQuery, TablesSummary, TableShape,
} from '../types'
import type { TablesDataProvider } from './types'

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

let uid = 0
function nextId(prefix: string) { return prefix + '-' + (++uid) }

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const TENANT = 'mock-tenant'
const NOW = new Date().toISOString()

function makeTable(
  id: string,
  number: number,
  seats: number,
  zone: string,
  zoneName: string,
  shape: TableShape,
  gridCol: number,
  gridRow: number,
): RestaurantTable {
  return {
    id,
    name: `Table ${number}`,
    number,
    seats,
    status: 'available',
    zone,
    zoneName,
    shape,
    gridCol,
    gridRow,
    isActive: true,
    tenantId: TENANT,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function seedZones(): Zone[] {
  return [
    { id: nextId('zone'), name: 'Indoor',  color: '#3b82f6', sortOrder: 0, isActive: true, tenantId: TENANT, createdAt: NOW },
    { id: nextId('zone'), name: 'Outdoor', color: '#22c55e', sortOrder: 1, isActive: true, tenantId: TENANT, createdAt: NOW },
    { id: nextId('zone'), name: 'Bar',     color: '#f59e0b', sortOrder: 2, isActive: true, tenantId: TENANT, createdAt: NOW },
  ]
}

function seedTables(zones: Zone[]): RestaurantTable[] {
  const [indoor, outdoor, bar] = zones

  const tables: RestaurantTable[] = []

  // Indoor zone — tables 1-8, 4x2 grid, alternating 4/6 seats, square/rectangle
  for (let i = 0; i < 8; i++) {
    const num = i + 1
    tables.push(makeTable(
      nextId('table'),
      num,
      i % 2 === 0 ? 4 : 6,
      indoor.id,
      indoor.name,
      i % 2 === 0 ? 'square' : 'rectangle',
      (i % 4),
      Math.floor(i / 4),
    ))
  }

  // Outdoor zone — tables 9-10, round, 4 seats
  tables.push(makeTable(nextId('table'), 9,  4, outdoor.id, outdoor.name, 'round', 0, 0))
  tables.push(makeTable(nextId('table'), 10, 4, outdoor.id, outdoor.name, 'round', 1, 0))

  // Bar zone — tables 11-12, bar shape, 2 seats
  tables.push(makeTable(nextId('table'), 11, 2, bar.id, bar.name, 'bar', 0, 0))
  tables.push(makeTable(nextId('table'), 12, 2, bar.id, bar.name, 'bar', 1, 0))

  return tables
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export function createMockTablesProvider(): TablesDataProvider {
  const zones = seedZones()
  const tables = seedTables(zones)
  const sessions: TableSession[] = []

  // ------- helpers -------

  function findTable(id: string) {
    return tables.find(t => t.id === id) ?? null
  }

  function matchesQuery(table: RestaurantTable, query?: TableQuery): boolean {
    if (!query) return true
    if (query.zone && table.zone !== query.zone) return false
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status]
      if (!statuses.includes(table.status)) return false
    }
    if (query.search) {
      const s = query.search.toLowerCase()
      if (
        !table.name.toLowerCase().includes(s) &&
        !String(table.number).includes(s) &&
        !(table.zoneName ?? '').toLowerCase().includes(s)
      ) return false
    }
    return true
  }

  // ------- provider -------

  return {
    // ---- Tables ----

    async getTables(query?: TableQuery) {
      return tables.filter(t => matchesQuery(t, query))
    },

    async getTableById(id: string) {
      return findTable(id)
    },

    async createTable(input: CreateTableInput) {
      const zone = zones.find(z => z.id === input.zone)
      const table: RestaurantTable = {
        id: nextId('table'),
        name: input.name,
        number: input.number,
        seats: input.seats,
        status: 'available',
        zone: input.zone,
        zoneName: zone?.name,
        shape: input.shape ?? 'square',
        gridCol: input.gridCol ?? 0,
        gridRow: input.gridRow ?? 0,
        isActive: true,
        tenantId: TENANT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      tables.push(table)
      return table
    },

    async updateTable(id: string, data: Partial<RestaurantTable>) {
      const table = findTable(id)
      if (!table) throw new Error(`Table ${id} not found`)
      Object.assign(table, data, { updatedAt: new Date().toISOString() })
      return table
    },

    async deleteTable(id: string) {
      const idx = tables.findIndex(t => t.id === id)
      if (idx !== -1) tables.splice(idx, 1)
    },

    async updateTableStatus(input: UpdateTableStatusInput) {
      const table = findTable(input.tableId)
      if (!table) throw new Error(`Table ${input.tableId} not found`)
      table.status = input.status
      table.updatedAt = new Date().toISOString()
      return table
    },

    async updateTablePositions(positions: Array<{ id: string; gridCol: number; gridRow: number }>) {
      for (const pos of positions) {
        const table = findTable(pos.id)
        if (table) {
          table.gridCol = pos.gridCol
          table.gridRow = pos.gridRow
          table.updatedAt = new Date().toISOString()
        }
      }
    },

    // ---- Sessions ----

    async seatGuests(input: SeatGuestsInput) {
      const table = findTable(input.tableId)
      if (!table) throw new Error(`Table ${input.tableId} not found`)

      const session: TableSession = {
        id: nextId('session'),
        tableId: input.tableId,
        tableName: table.name,
        guests: input.guests,
        waiterId: input.waiterId,
        waiterName: input.waiterId ? `Waiter ${input.waiterId}` : undefined,
        seatedAt: new Date().toISOString(),
        status: 'active',
        notes: input.notes,
        tenantId: TENANT,
        createdAt: new Date().toISOString(),
      }
      sessions.push(session)

      // Denormalize onto table
      table.status = 'occupied'
      table.currentSessionId = session.id
      table.currentGuests = input.guests
      table.currentWaiterName = session.waiterName
      table.currentElapsedMinutes = 0
      table.currentTotal = 0
      table.updatedAt = new Date().toISOString()

      return session
    },

    async closeSession(sessionId: string) {
      const session = sessions.find(s => s.id === sessionId)
      if (!session) throw new Error(`Session ${sessionId} not found`)

      session.status = 'closed'
      session.closedAt = new Date().toISOString()

      // Update table → cleaning
      const table = findTable(session.tableId)
      if (table) {
        table.status = 'cleaning'
        table.currentSessionId = undefined
        table.currentOrderId = undefined
        table.currentGuests = undefined
        table.currentWaiterName = undefined
        table.currentElapsedMinutes = undefined
        table.currentTotal = undefined
        table.updatedAt = new Date().toISOString()
      }

      return session
    },

    async getActiveSessions() {
      return sessions.filter(s => s.status === 'active')
    },

    async getSessionHistory(tableId?: string) {
      const closed = sessions.filter(s => s.status === 'closed')
      if (tableId) return closed.filter(s => s.tableId === tableId)
      return closed
    },

    // ---- Zones ----

    async getZones() {
      return [...zones]
    },

    async createZone(data: Partial<Zone>) {
      const zone: Zone = {
        id: nextId('zone'),
        name: data.name ?? 'New Zone',
        color: data.color,
        sortOrder: data.sortOrder ?? zones.length,
        isActive: data.isActive ?? true,
        tenantId: TENANT,
        createdAt: new Date().toISOString(),
      }
      zones.push(zone)
      return zone
    },

    async updateZone(id: string, data: Partial<Zone>) {
      const zone = zones.find(z => z.id === id)
      if (!zone) throw new Error(`Zone ${id} not found`)
      Object.assign(zone, data)
      return zone
    },

    async deleteZone(id: string) {
      const idx = zones.findIndex(z => z.id === id)
      if (idx !== -1) zones.splice(idx, 1)
    },

    // ---- Summary ----

    async getSummary(): Promise<TablesSummary> {
      const available = tables.filter(t => t.status === 'available').length
      const occupied = tables.filter(t => t.status === 'occupied').length
      const reserved = tables.filter(t => t.status === 'reserved').length
      const cleaning = tables.filter(t => t.status === 'cleaning').length

      const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0)
      const occupiedSeats = tables
        .filter(t => t.status === 'occupied')
        .reduce((sum, t) => sum + (t.currentGuests ?? t.seats), 0)

      const closedSessions = sessions.filter(s => s.status === 'closed' && s.closedAt)
      let averageSessionMinutes = 0
      if (closedSessions.length > 0) {
        const totalMinutes = closedSessions.reduce((sum, s) => {
          const seated = new Date(s.seatedAt).getTime()
          const closed = new Date(s.closedAt!).getTime()
          return sum + (closed - seated) / 60_000
        }, 0)
        averageSessionMinutes = Math.round(totalMinutes / closedSessions.length)
      }

      return {
        totalTables: tables.length,
        availableCount: available,
        occupiedCount: occupied,
        reservedCount: reserved,
        cleaningCount: cleaning,
        totalSeats,
        occupiedSeats,
        averageSessionMinutes,
      }
    },
  }
}
