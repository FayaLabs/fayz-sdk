import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from 'sonner'
import type { TablesDataProvider } from './data/types'
import type {
  RestaurantTable, TableSession, Zone,
  CreateTableInput, SeatGuestsInput, UpdateTableStatusInput,
  TableQuery, TablesSummary,
} from './types'

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface TablesUIState {
  // Data cache
  tables: RestaurantTable[]
  tablesLoading: boolean

  zones: Zone[]
  zonesLoading: boolean

  activeSessions: TableSession[]
  sessionsLoading: boolean

  sessionHistory: TableSession[]
  historyLoading: boolean

  summary: TablesSummary | null
  summaryLoading: boolean

  selectedTableId: string | null

  // Actions
  fetchTables(query?: TableQuery): Promise<void>
  fetchZones(): Promise<void>
  fetchActiveSessions(): Promise<void>
  fetchSessionHistory(tableId?: string): Promise<void>
  fetchSummary(): Promise<void>
  selectTable(id: string | null): void
  seatGuests(input: SeatGuestsInput): Promise<TableSession>
  closeSession(sessionId: string): Promise<void>
  updateTableStatus(input: UpdateTableStatusInput): Promise<void>
  createTable(input: CreateTableInput): Promise<RestaurantTable>
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export function createTablesStore(provider: TablesDataProvider): StoreApi<TablesUIState> {
  return createStore<TablesUIState>((set, get) => ({
    tables: [],
    tablesLoading: false,

    zones: [],
    zonesLoading: false,

    activeSessions: [],
    sessionsLoading: false,

    sessionHistory: [],
    historyLoading: false,

    summary: null,
    summaryLoading: false,

    selectedTableId: null,

    async fetchTables(query) {
      return dedup('tables:tables:' + JSON.stringify(query), async () => {
        set({ tablesLoading: true })
        const tables = await provider.getTables(query)
        set({ tables, tablesLoading: false })
      })
    },

    async fetchZones() {
      return dedup('tables:zones', async () => {
        set({ zonesLoading: true })
        const zones = await provider.getZones()
        set({ zones, zonesLoading: false })
      })
    },

    async fetchActiveSessions() {
      return dedup('tables:activeSessions', async () => {
        set({ sessionsLoading: true })
        const activeSessions = await provider.getActiveSessions()
        set({ activeSessions, sessionsLoading: false })
      })
    },

    async fetchSessionHistory(tableId) {
      return dedup('tables:history:' + (tableId ?? ''), async () => {
        set({ historyLoading: true })
        const sessionHistory = await provider.getSessionHistory(tableId)
        set({ sessionHistory, historyLoading: false })
      })
    },

    async fetchSummary() {
      return dedup('tables:summary', async () => {
        set({ summaryLoading: true })
        const summary = await provider.getSummary()
        set({ summary, summaryLoading: false })
      })
    },

    selectTable(id) {
      set({ selectedTableId: id })
    },

    async seatGuests(input) {
      try {
        const session = await provider.seatGuests(input)
        const [tables, activeSessions, summary] = await Promise.all([
          provider.getTables(),
          provider.getActiveSessions(),
          provider.getSummary(),
        ])
        set({ tables, activeSessions, summary })
        toast.success('Guests seated')
        return session
      } catch (err: any) {
        toast.error('Failed to seat guests', { description: err?.message })
        throw err
      }
    },

    async closeSession(sessionId) {
      try {
        await provider.closeSession(sessionId)
        const [tables, activeSessions, summary] = await Promise.all([
          provider.getTables(),
          provider.getActiveSessions(),
          provider.getSummary(),
        ])
        set({ tables, activeSessions, summary })
        toast.success('Session closed')
      } catch (err: any) {
        toast.error('Failed to close session', { description: err?.message })
        throw err
      }
    },

    async updateTableStatus(input) {
      try {
        await provider.updateTableStatus(input)
        const [tables, summary] = await Promise.all([
          provider.getTables(),
          provider.getSummary(),
        ])
        set({ tables, summary })
        toast.success('Table status updated')
      } catch (err: any) {
        toast.error('Failed to update table status', { description: err?.message })
        throw err
      }
    },

    async createTable(input) {
      try {
        const table = await provider.createTable(input)
        const [tables, summary] = await Promise.all([
          provider.getTables(),
          provider.getSummary(),
        ])
        set({ tables, summary })
        toast.success('Table created')
        return table
      } catch (err: any) {
        toast.error('Failed to create table', { description: err?.message })
        throw err
      }
    },
  }))
}
