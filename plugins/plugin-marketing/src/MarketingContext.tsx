import React from 'react'
import { createPluginContext } from '@fayz-ai/saas'
import type { AcquisitionChannel, ConversionModel } from './types'
import type { MarketingCurrency } from './format'
import type { MarketingDomainModules } from './presets'
import type { MarketingDataProvider } from './data/types'
import type { MarketingUIState } from './store'

export interface MarketingLabels {
  pageTitle: string
  pageSubtitle: string
  overview: string
  channels: string
  campaigns: string
  funnel: string
  landingPages: string
  settings: string
}

export interface ResolvedMarketingConfig {
  conversion: ConversionModel
  channels: AcquisitionChannel[]
  modules: MarketingDomainModules
  currency: MarketingCurrency
  labels: MarketingLabels
}

const ctx = createPluginContext<ResolvedMarketingConfig, MarketingDataProvider, MarketingUIState>('MarketingPage')

export const MarketingContextProvider = ctx.ContextProvider
export const useMarketingConfig = ctx.useConfig
export const useMarketingProvider = ctx.useProvider
export const useMarketingStore = ctx.useStore

/** Convenience: look up a channel definition by id. */
export function useChannelLookup(): Map<string, AcquisitionChannel> {
  const { channels } = useMarketingConfig()
  return React.useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels])
}
