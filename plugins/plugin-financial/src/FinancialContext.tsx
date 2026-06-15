import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { FinancialPluginLabels, ItemTypeOption } from './index'
import type { FinancialDataProvider } from './data/types'
import type { FinancialUIState } from './store'
import type { EntityLookupMap, EntityLookup } from '@fayz-ai/saas'

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface FinancialModules {
  payables: boolean
  receivables: boolean
  cashRegisters: boolean
  statements: boolean
  commissions: boolean
  cards: boolean
}

export interface FinancialCurrency {
  code: string
  locale: string
  symbol: string
}

export interface LocationOption {
  id: string
  name: string
  isHQ?: boolean
}

export interface ResolvedFinancialConfig {
  modules: FinancialModules
  labels: FinancialPluginLabels
  currency: FinancialCurrency
  itemTypes: ItemTypeOption[]
  enableServiceExecution: boolean
  contactEntity: { archetypeKind: string; label: string }
  locations: LocationOption[]
  entityLookups: EntityLookupMap
  contactLookup?: EntityLookup
  onBookingClick?: (orderId: string) => void
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const FinancialConfigContext = React.createContext<ResolvedFinancialConfig | null>(null)
const FinancialProviderContext = React.createContext<FinancialDataProvider | null>(null)
const FinancialStoreContext = React.createContext<StoreApi<FinancialUIState> | null>(null)

// ---------------------------------------------------------------------------
// Combined provider component
// ---------------------------------------------------------------------------

export function FinancialContextProvider({ config, provider, store, children }: {
  config: ResolvedFinancialConfig
  provider: FinancialDataProvider
  store: StoreApi<FinancialUIState>
  children: React.ReactNode
}) {
  return (
    <FinancialConfigContext.Provider value={config}>
      <FinancialProviderContext.Provider value={provider}>
        <FinancialStoreContext.Provider value={store}>
          {children}
        </FinancialStoreContext.Provider>
      </FinancialProviderContext.Provider>
    </FinancialConfigContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useFinancialConfig(): ResolvedFinancialConfig {
  const ctx = React.useContext(FinancialConfigContext)
  if (!ctx) throw new Error('useFinancialConfig must be used within FinancialPage')
  return ctx
}

export function useFinancialProvider(): FinancialDataProvider {
  const ctx = React.useContext(FinancialProviderContext)
  if (!ctx) throw new Error('useFinancialProvider must be used within FinancialPage')
  return ctx
}

export function useFinancialStore<T>(selector: (state: FinancialUIState) => T): T {
  const store = React.useContext(FinancialStoreContext)
  if (!store) throw new Error('useFinancialStore must be used within FinancialPage')
  return useStore(store, selector)
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

export function formatCurrency(value: number, currency: FinancialCurrency): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
  }).format(value)
}
