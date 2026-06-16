import { createStore, type StoreApi } from 'zustand/vanilla'
import type { MarketingDataProvider, SaveCampaignInput } from './data/types'
import type {
  Campaign,
  ChannelPerformance,
  DateRangeKey,
  FunnelStage,
  LandingPagePerf,
  MarketingOverview,
} from './types'

export interface MarketingUIState {
  range: DateRangeKey
  overview: MarketingOverview | null
  channels: ChannelPerformance[]
  campaigns: Campaign[]
  funnel: FunnelStage[]
  landingPages: LandingPagePerf[]
  loading: boolean

  load(): Promise<void>
  setRange(range: DateRangeKey): Promise<void>
  saveCampaign(input: SaveCampaignInput): Promise<Campaign>
  deleteCampaign(id: string): Promise<void>
}

export function createMarketingStore(provider: MarketingDataProvider): StoreApi<MarketingUIState> {
  return createStore<MarketingUIState>((set, get) => ({
    range: '30d',
    overview: null,
    channels: [],
    campaigns: [],
    funnel: [],
    landingPages: [],
    loading: false,

    async load() {
      const range = get().range
      set({ loading: true })
      const [overview, channels, campaigns, funnel, landingPages] = await Promise.all([
        provider.overview({ range }),
        provider.channelPerformance({ range }),
        provider.listCampaigns({ range }),
        provider.funnel({ range }),
        provider.landingPages({ range }),
      ])
      set({ overview, channels, campaigns, funnel, landingPages, loading: false })
    },

    async setRange(range) {
      set({ range })
      await get().load()
    },

    async saveCampaign(input) {
      const created = await provider.saveCampaign(input)
      await get().load()
      return created
    },

    async deleteCampaign(id) {
      await provider.deleteCampaign(id)
      await get().load()
    },
  }))
}
