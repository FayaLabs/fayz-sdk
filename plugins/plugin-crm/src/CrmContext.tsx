import { createPluginContext, formatCurrency, type CurrencyConfig, type EntityLookupMap, type EntityLookup } from '@fayz-ai/saas'
import type { CrmPluginLabels } from './index'
import type { CrmDataProvider } from './data/types'
import type { CrmUIState } from './store'

export interface CrmModules {
  quotes: boolean
  activities: boolean
  pipeline: boolean
}

export type CrmCurrency = CurrencyConfig

export interface ResolvedCrmConfig {
  modules: CrmModules
  labels: CrmPluginLabels
  currency: CrmCurrency
  itemTypes: Array<{ value: string; label: string }>
  entityLookups: EntityLookupMap
  contactLookup?: EntityLookup
}

const ctx = createPluginContext<ResolvedCrmConfig, CrmDataProvider, CrmUIState>('CrmPage')

export const CrmContextProvider = ctx.ContextProvider
export const useCrmConfig = ctx.useConfig
export const useCrmProvider = ctx.useProvider
export const useCrmStore = ctx.useStore

export { formatCurrency }
