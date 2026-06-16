import type { MarketingDataProvider, SaveCampaignInput } from './types'
import type {
  AcquisitionChannel,
  AcquisitionChannelKind,
  Campaign,
  ChannelPerformance,
  ConversionModel,
  DateRangeKey,
  FunnelStage,
  LandingPagePerf,
  MarketingOverview,
  MarketingQuery,
} from '../types'
import { CAMPAIGN_NAME_SEEDS, type MarketingDomain } from '../presets'

// ---------------------------------------------------------------------------
// Deterministic seed knobs (no Date.now at module init for stable analytics).
// ---------------------------------------------------------------------------

const RANGE_FACTOR: Record<DateRangeKey, number> = { '7d': 0.25, '30d': 1, '90d': 3.05 }
const BASE_REACH = [4200, 3100, 2600, 1900, 1500, 1200, 1000]

const KIND_LEAD_RATE: Record<AcquisitionChannelKind, number> = {
  paid: 0.18, social: 0.22, organic: 0.14, referral: 0.3, direct: 0.1, outbound: 0.16,
}
const KIND_CONV_RATE: Record<AcquisitionChannelKind, number> = {
  paid: 0.28, social: 0.25, organic: 0.32, referral: 0.45, direct: 0.22, outbound: 0.24,
}
const KIND_SPEND30: Record<AcquisitionChannelKind, number> = {
  paid: 2800, social: 900, outbound: 600, organic: 0, referral: 0, direct: 0,
}

interface ChannelBase {
  channelId: string
  kind: AcquisitionChannelKind
  reach: number
  leads: number
  conversions: number
  spend: number
  value: number
}

export interface MockMarketingConfig {
  channels: AcquisitionChannel[]
  conversion: ConversionModel
  domain: MarketingDomain
}

function channelBase30(channels: AcquisitionChannel[], conversion: ConversionModel): ChannelBase[] {
  return channels.map((ch, i) => {
    const reach = BASE_REACH[i % BASE_REACH.length]
    const leads = Math.round(reach * KIND_LEAD_RATE[ch.kind])
    const conversions = Math.round(leads * KIND_CONV_RATE[ch.kind])
    const spend = KIND_SPEND30[ch.kind]
    const value = Math.round(conversions * conversion.avgValue)
    return { channelId: ch.id, kind: ch.kind, reach, leads, conversions, spend, value }
  })
}

function scale(n: number, range: DateRangeKey): number {
  return Math.round(n * RANGE_FACTOR[range])
}

function toPerformance(base: ChannelBase, range: DateRangeKey): ChannelPerformance {
  const reach = scale(base.reach, range)
  const leads = scale(base.leads, range)
  const conversions = scale(base.conversions, range)
  const spend = scale(base.spend, range)
  const value = scale(base.value, range)
  return {
    channelId: base.channelId,
    reach, leads, conversions, spend, value,
    cvr: reach > 0 ? (conversions / reach) * 100 : 0,
    cpa: conversions > 0 && spend > 0 ? spend / conversions : 0,
  }
}

function seedCampaigns(cfg: MockMarketingConfig): Campaign[] {
  const names = CAMPAIGN_NAME_SEEDS[cfg.domain]
  const base = channelBase30(cfg.channels, cfg.conversion)
  const statuses: Campaign['status'][] = ['active', 'active', 'paused', 'ended', 'draft']
  const startDays = [12, 26, 40, 8, 3]
  const baseDate = new Date('2026-06-16T00:00:00Z').getTime()

  return names.map((name, i) => {
    const ch = cfg.channels[i % cfg.channels.length]
    const b = base[i % base.length]
    const status = statuses[i % statuses.length]
    const draft = status === 'draft'
    const start = new Date(baseDate - startDays[i % startDays.length] * 86_400_000).toISOString()
    // Campaigns carry a slice of their channel's volume so totals stay plausible.
    const share = 0.55 + (i % 3) * 0.12
    return {
      id: `cmp-${i + 1}`,
      name,
      channelId: ch.id,
      status,
      start,
      end: status === 'ended' ? new Date(baseDate - 2 * 86_400_000).toISOString() : undefined,
      spend: draft ? 0 : Math.round(b.spend * share),
      reach: draft ? 0 : Math.round(b.reach * share),
      leads: draft ? 0 : Math.round(b.leads * share),
      conversions: draft ? 0 : Math.round(b.conversions * share),
      value: draft ? 0 : Math.round(b.value * share),
    }
  })
}

function scaleCampaign(c: Campaign, range: DateRangeKey): Campaign {
  if (c.status === 'draft') return c
  return {
    ...c,
    spend: scale(c.spend, range),
    reach: scale(c.reach, range),
    leads: scale(c.leads, range),
    conversions: scale(c.conversions, range),
    value: scale(c.value, range),
  }
}

function seedLandingPages(): Array<Omit<LandingPagePerf, 'cvr'>> {
  // 30d baseline; scaled per range at read time.
  return [
    { id: 'lp-1', name: 'Free Consultation Funnel', type: 'Funnel', visits: 3820, conversions: 474 },
    { id: 'lp-2', name: 'Summer Promo Landing', type: 'Landing page', visits: 1560, conversions: 126 },
    { id: 'lp-3', name: 'Pricing Page', type: 'Landing page', visits: 2240, conversions: 198 },
    { id: 'lp-4', name: 'Company Website', type: 'Website', visits: 9240, conversions: 296 },
  ]
}

export function createMockMarketingProvider(cfg: MockMarketingConfig): MarketingDataProvider {
  const base = channelBase30(cfg.channels, cfg.conversion)
  const campaigns = seedCampaigns(cfg)
  const landing = seedLandingPages()
  let counter = 100

  async function channelPerformance(query: MarketingQuery): Promise<ChannelPerformance[]> {
    const list = base.map((b) => toPerformance(b, query.range))
    return query.channelId ? list.filter((c) => c.channelId === query.channelId) : list
  }

  return {
    channelPerformance,

    async overview(query: MarketingQuery): Promise<MarketingOverview> {
      const perf = await channelPerformance(query)
      const reach = perf.reduce((s, c) => s + c.reach, 0)
      const conversions = perf.reduce((s, c) => s + c.conversions, 0)
      const spend = perf.reduce((s, c) => s + c.spend, 0)
      const value = perf.reduce((s, c) => s + c.value, 0)
      const cvr = reach > 0 ? (conversions / reach) * 100 : 0
      const top = [...perf].sort((a, b) => b.conversions - a.conversions)[0]
      return {
        conversions,
        conversionsPrev: Math.round(conversions * 0.86),
        cvr,
        cvrPrev: cvr * 0.94,
        spend,
        cpa: conversions > 0 && spend > 0 ? spend / conversions : 0,
        value,
        topChannelId: top?.channelId ?? null,
        channelMix: perf.map((c) => ({ channelId: c.channelId, conversions: c.conversions })),
      }
    },

    async funnel(query: MarketingQuery): Promise<FunnelStage[]> {
      const perf = await channelPerformance(query)
      const reach = perf.reduce((s, c) => s + c.reach, 0)
      const leads = perf.reduce((s, c) => s + c.leads, 0)
      const conversions = perf.reduce((s, c) => s + c.conversions, 0)
      const qualified = Math.round(leads * 0.62)
      return [
        { id: 'reach', label: 'Reach / visits', count: reach, color: '#6366f1' },
        { id: 'leads', label: 'Leads', count: leads, color: '#0ea5e9' },
        { id: 'qualified', label: 'Qualified', count: qualified, color: '#14b8a6' },
        { id: 'converted', label: cfg.conversion.labelPlural, count: conversions, color: '#22c55e' },
      ]
    },

    async listCampaigns(query: MarketingQuery): Promise<Campaign[]> {
      const list = query.channelId ? campaigns.filter((c) => c.channelId === query.channelId) : campaigns
      return list.map((c) => scaleCampaign(c, query.range))
    },

    async getCampaign(id: string): Promise<Campaign | null> {
      return campaigns.find((c) => c.id === id) ?? null
    },

    async saveCampaign(input: SaveCampaignInput): Promise<Campaign> {
      if (input.id) {
        const existing = campaigns.find((c) => c.id === input.id)
        if (existing) {
          Object.assign(existing, {
            name: input.name, channelId: input.channelId, status: input.status,
            start: input.start, end: input.end, spend: input.spend,
          })
          return existing
        }
      }
      const b = base.find((x) => x.channelId === input.channelId) ?? base[0]
      const active = input.status === 'active'
      const created: Campaign = {
        id: `cmp-${++counter}`,
        name: input.name,
        channelId: input.channelId,
        status: input.status,
        start: input.start,
        end: input.end,
        spend: input.spend,
        // New campaigns ramp from a small slice of their channel's volume.
        reach: active ? Math.round(b.reach * 0.15) : 0,
        leads: active ? Math.round(b.leads * 0.15) : 0,
        conversions: active ? Math.round(b.conversions * 0.15) : 0,
        value: active ? Math.round(b.value * 0.15) : 0,
      }
      campaigns.unshift(created)
      return created
    },

    async deleteCampaign(id: string): Promise<void> {
      const idx = campaigns.findIndex((c) => c.id === id)
      if (idx >= 0) campaigns.splice(idx, 1)
    },

    async landingPages(query: MarketingQuery): Promise<LandingPagePerf[]> {
      return landing.map((p) => {
        const visits = scale(p.visits, query.range)
        const conversions = scale(p.conversions, query.range)
        return { ...p, visits, conversions, cvr: visits > 0 ? (conversions / visits) * 100 : 0 }
      })
    },
  }
}
