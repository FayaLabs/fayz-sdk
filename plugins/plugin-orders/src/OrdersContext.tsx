import { createPluginContext, formatCurrency, type CurrencyConfig, type EntityLookup } from '@fayz-ai/saas'
import type { OrdersDataProvider } from './data/types'
import type { OrdersUIState } from './store'
import type { RestaurantOrder } from './types'

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface OrdersModules {
  delivery: boolean
  takeout: boolean
}

export type OrdersCurrency = CurrencyConfig

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

const ctx = createPluginContext<ResolvedOrdersConfig, OrdersDataProvider, OrdersUIState>('OrdersPage')

export const OrdersContextProvider = ctx.ContextProvider
export const useOrdersConfig = ctx.useConfig
export const useOrdersProvider = ctx.useProvider
export const useOrdersStore = ctx.useStore

export { formatCurrency }
