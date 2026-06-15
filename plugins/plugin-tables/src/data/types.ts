import type {
  RestaurantTable, TableSession, Zone,
  CreateTableInput, SeatGuestsInput, UpdateTableStatusInput,
  TableQuery, TablesSummary,
} from '../types'

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
