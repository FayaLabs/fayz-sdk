import React from 'react'
import { useStore, type StoreApi } from 'zustand'
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

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const TablesConfigContext = React.createContext<ResolvedTablesConfig | null>(null)
const TablesProviderContext = React.createContext<TablesDataProvider | null>(null)
const TablesStoreContext = React.createContext<StoreApi<TablesUIState> | null>(null)

// ---------------------------------------------------------------------------
// Combined provider component
// ---------------------------------------------------------------------------

export function TablesContextProvider({ config, provider, store, children }: {
  config: ResolvedTablesConfig
  provider: TablesDataProvider
  store: StoreApi<TablesUIState>
  children: React.ReactNode
}) {
  return (
    <TablesConfigContext.Provider value={config}>
      <TablesProviderContext.Provider value={provider}>
        <TablesStoreContext.Provider value={store}>
          {children}
        </TablesStoreContext.Provider>
      </TablesProviderContext.Provider>
    </TablesConfigContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTablesConfig(): ResolvedTablesConfig {
  const ctx = React.useContext(TablesConfigContext)
  if (!ctx) throw new Error('useTablesConfig must be used within TablesPage')
  return ctx
}

export function useTablesProvider(): TablesDataProvider {
  const ctx = React.useContext(TablesProviderContext)
  if (!ctx) throw new Error('useTablesProvider must be used within TablesPage')
  return ctx
}

export function useTablesStore<T>(selector: (state: TablesUIState) => T): T {
  const store = React.useContext(TablesStoreContext)
  if (!store) throw new Error('useTablesStore must be used within TablesPage')
  return useStore(store, selector)
}
