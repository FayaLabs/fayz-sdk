import { createPluginContext, formatCurrency, type CurrencyConfig } from '@fayz-ai/saas'
import type { InventoryPluginLabels } from './index'
import type { InventoryDataProvider } from './data/types'
import type { InventoryUIState } from './store'

export interface InventoryModules {
  /** Product catalogue screens. Off when the host registers products elsewhere. */
  products: boolean
  recipes: boolean
  stockLocations: boolean
  batchTracking: boolean
}

export type InventoryCurrency = CurrencyConfig

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

const ctx = createPluginContext<ResolvedInventoryConfig, InventoryDataProvider, InventoryUIState>('InventoryPage')

export const InventoryContextProvider = ctx.ContextProvider
export const useInventoryConfig = ctx.useConfig
export const useInventoryProvider = ctx.useProvider
export const useInventoryStore = ctx.useStore

export { formatCurrency }
