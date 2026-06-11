import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { InventoryPluginLabels } from './index'
import type { InventoryDataProvider } from './data/types'
import type { InventoryUIState } from './store'

export interface InventoryModules {
  recipes: boolean
  stockLocations: boolean
  batchTracking: boolean
}

export interface InventoryCurrency {
  code: string
  locale: string
  symbol: string
}

export interface ProductTypeOption {
  value: string
  label: string
}

export interface LocationOption {
  id: string
  name: string
  isHQ?: boolean
}

export interface ResolvedInventoryConfig {
  modules: InventoryModules
  labels: InventoryPluginLabels
  currency: InventoryCurrency
  productTypes: ProductTypeOption[]
  locations: LocationOption[]
}

const InventoryConfigContext = React.createContext<ResolvedInventoryConfig | null>(null)
const InventoryProviderContext = React.createContext<InventoryDataProvider | null>(null)
const InventoryStoreContext = React.createContext<StoreApi<InventoryUIState> | null>(null)

export function InventoryContextProvider({ config, provider, store, children }: {
  config: ResolvedInventoryConfig
  provider: InventoryDataProvider
  store: StoreApi<InventoryUIState>
  children: React.ReactNode
}) {
  return (
    <InventoryConfigContext.Provider value={config}>
      <InventoryProviderContext.Provider value={provider}>
        <InventoryStoreContext.Provider value={store}>
          {children}
        </InventoryStoreContext.Provider>
      </InventoryProviderContext.Provider>
    </InventoryConfigContext.Provider>
  )
}

export function useInventoryConfig(): ResolvedInventoryConfig {
  const ctx = React.useContext(InventoryConfigContext)
  if (!ctx) throw new Error('useInventoryConfig must be used within InventoryPage')
  return ctx
}

export function useInventoryProvider(): InventoryDataProvider {
  const ctx = React.useContext(InventoryProviderContext)
  if (!ctx) throw new Error('useInventoryProvider must be used within InventoryPage')
  return ctx
}

export function useInventoryStore<T>(selector: (state: InventoryUIState) => T): T {
  const store = React.useContext(InventoryStoreContext)
  if (!store) throw new Error('useInventoryStore must be used within InventoryPage')
  return useStore(store, selector)
}

export function formatCurrency(value: number, currency: InventoryCurrency): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
  }).format(value)
}
