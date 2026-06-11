import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { ResolvedAgendaConfig } from './config'
import type { AgendaDataProvider } from './data/types'
import type { AgendaUIState } from './store'

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const AgendaConfigContext = React.createContext<ResolvedAgendaConfig | null>(null)
const AgendaProviderContext = React.createContext<AgendaDataProvider | null>(null)
const AgendaStoreContext = React.createContext<StoreApi<AgendaUIState> | null>(null)

// ---------------------------------------------------------------------------
// Combined provider component
// ---------------------------------------------------------------------------

export function AgendaContextProvider({ config, provider, store, children }: {
  config: ResolvedAgendaConfig
  provider: AgendaDataProvider
  store: StoreApi<AgendaUIState>
  children: React.ReactNode
}) {
  return (
    <AgendaConfigContext.Provider value={config}>
      <AgendaProviderContext.Provider value={provider}>
        <AgendaStoreContext.Provider value={store}>
          {children}
        </AgendaStoreContext.Provider>
      </AgendaProviderContext.Provider>
    </AgendaConfigContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAgendaConfig(): ResolvedAgendaConfig {
  const ctx = React.useContext(AgendaConfigContext)
  if (!ctx) throw new Error('useAgendaConfig must be used within AgendaPage')
  return ctx
}

export function useAgendaProvider(): AgendaDataProvider {
  const ctx = React.useContext(AgendaProviderContext)
  if (!ctx) throw new Error('useAgendaProvider must be used within AgendaPage')
  return ctx
}

export function useAgendaStore<T>(selector: (state: AgendaUIState) => T): T {
  const store = React.useContext(AgendaStoreContext)
  if (!store) throw new Error('useAgendaStore must be used within AgendaPage')
  return useStore(store, selector)
}
