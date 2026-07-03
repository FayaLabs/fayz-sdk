import { createPluginContext, formatCurrency, type CurrencyConfig, type EntityLookupMap, type EntityLookup } from '@fayz-ai/saas'
import type { FinancialPluginLabels, ItemTypeOption } from './index'
import type { FinancialDataProvider } from './data/types'
import type { FinancialUIState } from './store'

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
  /** Bank reconciliation (conciliação). Opt-in — enable when a bank connector imports statements. */
  reconciliation: boolean
}

export type FinancialCurrency = CurrencyConfig

export interface LocationOption {
  id: string
  name: string
  isHQ?: boolean
}

export interface ResolvedFinancialConfig {
  modules: FinancialModules
  /** Show the plugin's own quick-add header buttons / FAB. Opt-in (default false). */
  quickAdd: boolean
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

const ctx = createPluginContext<ResolvedFinancialConfig, FinancialDataProvider, FinancialUIState>('FinancialPage')

export const FinancialContextProvider = ctx.ContextProvider
export const useFinancialConfig = ctx.useConfig
export const useFinancialProvider = ctx.useProvider
export const useFinancialStore = ctx.useStore

export { formatCurrency }
