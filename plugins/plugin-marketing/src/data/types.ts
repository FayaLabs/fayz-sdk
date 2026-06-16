import type {
  Campaign,
  CampaignStatus,
  ChannelPerformance,
  FunnelStage,
  LandingPagePerf,
  MarketingOverview,
  MarketingQuery,
} from '../types'

// ---------------------------------------------------------------------------
// Provider — everything the marketing surface reads/writes. The mock provider
// computes analytics from a vertical-flavored seed; a Supabase-backed provider
// lands later. Attribution + sites data can also come from sibling plugins via
// the bridge seams below (defined now, injected later).
// ---------------------------------------------------------------------------

export interface SaveCampaignInput {
  id?: string
  name: string
  channelId: string
  status: CampaignStatus
  start: string
  end?: string
  spend: number
}

export interface MarketingDataProvider {
  overview(query: MarketingQuery): Promise<MarketingOverview>
  channelPerformance(query: MarketingQuery): Promise<ChannelPerformance[]>
  listCampaigns(query: MarketingQuery): Promise<Campaign[]>
  getCampaign(id: string): Promise<Campaign | null>
  saveCampaign(input: SaveCampaignInput): Promise<Campaign>
  deleteCampaign(id: string): Promise<void>
  funnel(query: MarketingQuery): Promise<FunnelStage[]>
  landingPages(query: MarketingQuery): Promise<LandingPagePerf[]>
}

// ---------------------------------------------------------------------------
// Bridge seams (optional DI). Apps inject these to swap mock numbers for real
// conversions read from plugin-crm / plugin-agenda / plugin-orders, and real
// landing-page performance read from plugin-sites. Mirrors the agenda↔financial
// bridge pattern (plugins compose via DI, never direct imports).
// ---------------------------------------------------------------------------

export interface AttributionBridge {
  conversionsByChannel(
    query: MarketingQuery,
  ): Promise<Array<{ channelId: string; conversions: number; value: number }>>
  funnel(query: MarketingQuery): Promise<FunnelStage[]>
}

export interface SitesPerformanceBridge {
  landingPages(query: MarketingQuery): Promise<LandingPagePerf[]>
}
