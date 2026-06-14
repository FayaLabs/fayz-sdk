import React from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { OrdersDataProvider } from './data/types'
import type { OrdersUIState } from './store'
import type { RestaurantOrder } from './types'
import type { EntityLookup } from '@fayz-ai/saas'

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface OrdersModules {
  delivery: boolean
  takeout: boolean
}

export interface OrdersCurrency {
  code: string
  locale: string
  symbol: string
}

export interface OrderSourceOption {
  value: string
  label: string
  icon?: string
}

export interface OrdersPluginLabels {
  pageTitle: string
  pageSubtitle: string
  orderSingular: string
  orderPlural: string
}

export interface ResolvedOrdersConfig {
  modules: OrdersModules
  labels: OrdersPluginLabels
  currency: OrdersCurrency
  orderSources: OrderSourceOption[]
  menuItemLookup?: EntityLookup
  staffLookup?: EntityLookup
  onOrderCompleted?: (order: RestaurantOrder) => Promise<void>
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const OrdersConfigContext = React.createContext<ResolvedOrdersConfig | null>(null)
const OrdersProviderContext = React.createContext<OrdersDataProvider | null>(null)
const OrdersStoreContext = React.createContext<StoreApi<OrdersUIState> | null>(null)

// ---------------------------------------------------------------------------
// Combined provider component
// ---------------------------------------------------------------------------

export function OrdersContextProvider({ config, provider, store, children }: {
  config: ResolvedOrdersConfig
  provider: OrdersDataProvider
  store: StoreApi<OrdersUIState>
  children: React.ReactNode
}) {
  return (
    <OrdersConfigContext.Provider value={config}>
      <OrdersProviderContext.Provider value={provider}>
        <OrdersStoreContext.Provider value={store}>
          {children}
        </OrdersStoreContext.Provider>
      </OrdersProviderContext.Provider>
    </OrdersConfigContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOrdersConfig(): ResolvedOrdersConfig {
  const ctx = React.useContext(OrdersConfigContext)
  if (!ctx) throw new Error('useOrdersConfig must be used within OrdersPage')
  return ctx
}

export function useOrdersProvider(): OrdersDataProvider {
  const ctx = React.useContext(OrdersProviderContext)
  if (!ctx) throw new Error('useOrdersProvider must be used within OrdersPage')
  return ctx
}

export function useOrdersStore<T>(selector: (state: OrdersUIState) => T): T {
  const store = React.useContext(OrdersStoreContext)
  if (!store) throw new Error('useOrdersStore must be used within OrdersPage')
  return useStore(store, selector)
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

export function formatCurrency(value: number, currency: OrdersCurrency): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
  }).format(value)
}
