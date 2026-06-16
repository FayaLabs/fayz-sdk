import { createPluginContext } from '@fayz-ai/saas'
import type { TablesDataProvider } from './data/types'
import type { TablesUIState } from './store'
import type { TableSession } from './types'

// ---------------------------------------------------------------------------
// Plugin labels
// ---------------------------------------------------------------------------

export interface TablesPluginLabels {
  pageTitle: string
  pageSubtitle: string
  tableSingular: string
  tablePlural: string
  sessionSingular: string
  sessionPlural: string
}

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface TablesModules {
  reservations: boolean
  sessionHistory: boolean
}

export interface ResolvedTablesConfig {
  modules: TablesModules
  labels: TablesPluginLabels
  defaultZones: Array<{ name: string; color?: string }>
  onTableSeated?: (session: TableSession) => Promise<string | undefined>
  onTableClosed?: (session: TableSession) => Promise<void>
}

const ctx = createPluginContext<ResolvedTablesConfig, TablesDataProvider, TablesUIState>('TablesPage')

export const TablesContextProvider = ctx.ContextProvider
export const useTablesConfig = ctx.useConfig
export const useTablesProvider = ctx.useProvider
export const useTablesStore = ctx.useStore
