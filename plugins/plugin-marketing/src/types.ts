// ---------------------------------------------------------------------------
// @fayz-ai/plugin-marketing — domain model for ACQUISITION & CONVERSION
// analytics. The plugin is vertical-agnostic: each app supplies a
// `ConversionModel` (what a conversion is + where it's read from) and a set of
// `AcquisitionChannel`s, and the same analytics engine adapts.
// ---------------------------------------------------------------------------

export type AcquisitionChannelKind =
  | 'paid'
  | 'organic'
  | 'social'
  | 'referral'
  | 'direct'
  | 'outbound'

export interface AcquisitionChannel {
  id: string
  label: string
  /** lucide-react icon name (resolved in components/icons.ts) */
  icon: string
  kind: AcquisitionChannelKind
}

/** Where attribution reads conversions from (per vertical). */
export type ConversionSource = 'crm' | 'agenda' | 'orders' | 'custom'

export interface ConversionModel {
  id: string
  /** singular noun for one conversion, e.g. 'Won deal' | 'Booking' | 'Order' */
  label: string
  labelPlural: string
  /** label for the monetary value, e.g. 'Pipeline value' | 'Revenue' */
  valueLabel: string
  source: ConversionSource
  /** average monetary value of a single conversion (mock + estimates) */
  avgValue: number
}

export type CampaignStatus = 'active' | 'paused' | 'ended' | 'draft'

/** An acquisition campaign running on a channel, with attributed performance. */
export interface Campaign {
  id: string
  name: string
  channelId: string
  status: CampaignStatus
  start: string
  end?: string
  spend: number
  /** visits / sessions / sends reached (NOT raw impressions) */
  reach: number
  leads: number
  conversions: number
  /** attributed monetary value */
  value: number
}

/** Per-channel rollup used by the Channels view + Overview. */
export interface ChannelPerformance {
  channelId: string
  reach: number
  leads: number
  conversions: number
  spend: number
  value: number
  /** conversions / reach * 100 */
  cvr: number
  /** spend / conversions (0 when no spend) */
  cpa: number
}

export interface FunnelStage {
  id: string
  label: string
  count: number
  color: string
}

export interface LandingPagePerf {
  id: string
  name: string
  type: 'Funnel' | 'Landing page' | 'Website'
  visits: number
  conversions: number
  /** conversions / visits * 100 */
  cvr: number
}

export interface MarketingOverview {
  conversions: number
  conversionsPrev: number
  cvr: number
  cvrPrev: number
  spend: number
  cpa: number
  value: number
  topChannelId: string | null
  /** conversions per channel for the mix bars */
  channelMix: Array<{ channelId: string; conversions: number }>
}

export type DateRangeKey = '7d' | '30d' | '90d'

export interface MarketingQuery {
  range: DateRangeKey
  /** optionally scope to a single channel (channel detail) */
  channelId?: string
}

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}
