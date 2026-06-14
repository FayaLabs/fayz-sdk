import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { CrmPluginLabels } from './index'
import type { CrmDataProvider } from './data/types'
import type { CrmUIState } from './store'
import type { EntityLookupMap, EntityLookup } from '@fayz-ai/saas'

export interface CrmModules {
  quotes: boolean
  activities: boolean
  pipeline: boolean
}

export interface CrmCurrency {
  code: string
  locale: string
  symbol: string
}

export interface ResolvedCrmConfig {
  modules: CrmModules
  labels: CrmPluginLabels
  currency: CrmCurrency
  itemTypes: Array<{ value: string; label: string }>
  entityLookups: EntityLookupMap
  contactLookup?: EntityLookup
}

const CrmConfigContext = React.createContext<ResolvedCrmConfig | null>(null)
const CrmProviderContext = React.createContext<CrmDataProvider | null>(null)
const CrmStoreContext = React.createContext<StoreApi<CrmUIState> | null>(null)

export function CrmContextProvider({ config, provider, store, children }: {
  config: ResolvedCrmConfig
  provider: CrmDataProvider
  store: StoreApi<CrmUIState>
  children?: React.ReactNode
}) {
  return (
    <CrmConfigContext.Provider value={config}>
      <CrmProviderContext.Provider value={provider}>
        <CrmStoreContext.Provider value={store}>
          {children}
        </CrmStoreContext.Provider>
      </CrmProviderContext.Provider>
    </CrmConfigContext.Provider>
  )
}

export function useCrmConfig(): ResolvedCrmConfig {
  const ctx = React.useContext(CrmConfigContext)
  if (!ctx) throw new Error('useCrmConfig must be used within CrmPage')
  return ctx
}

export function useCrmProvider(): CrmDataProvider {
  const ctx = React.useContext(CrmProviderContext)
  if (!ctx) throw new Error('useCrmProvider must be used within CrmPage')
  return ctx
}

export function useCrmStore<T>(selector: (state: CrmUIState) => T): T {
  const store = React.useContext(CrmStoreContext)
  if (!store) throw new Error('useCrmStore must be used within CrmPage')
  return useStore(store, selector)
}

export function formatCurrency(value: number, currency: CrmCurrency): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency', currency: currency.code, minimumFractionDigits: 2,
  }).format(value)
}
