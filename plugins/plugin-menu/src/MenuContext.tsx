import { createPluginContext, formatCurrency, type CurrencyConfig } from '@fayz-ai/saas'
import type { MenuDataProvider } from './data/types'
import type { MenuUIState } from './store'

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface MenuPluginLabels {
  pageTitle: string
  menuManager: string
  categories: string
  newItem: string
}

// ---------------------------------------------------------------------------
// Resolved config — fully merged, no optionals
// ---------------------------------------------------------------------------

export interface MenuModules {
  modifiers: boolean
  deliveryPricing: boolean
}

export type MenuCurrency = CurrencyConfig

export interface ResolvedMenuConfig {
  modules: MenuModules
  labels: MenuPluginLabels
  currency: MenuCurrency
}

const ctx = createPluginContext<ResolvedMenuConfig, MenuDataProvider, MenuUIState>('MenuPage')

export const MenuContextProvider = ctx.ContextProvider
export const useMenuConfig = ctx.useConfig
export const useMenuProvider = ctx.useProvider
export const useMenuStore = ctx.useStore

export { formatCurrency }
