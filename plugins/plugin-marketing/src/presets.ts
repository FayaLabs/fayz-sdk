import type { AcquisitionChannel, ConversionModel } from './types'

// ---------------------------------------------------------------------------
// Domain presets — the abstraction that lets ONE plugin feed every vertical.
// Each preset defines what a "conversion" is (and where it's attributed from)
// plus the acquisition channels that vertical actually uses. Channel ids align
// with plugin-crm's `lead-sources` registry where they overlap.
// ---------------------------------------------------------------------------

export type MarketingDomain = 'agency' | 'beauty' | 'resto'

export interface MarketingDomainModules {
  channels: boolean
  campaigns: boolean
  funnel: boolean
  landingPages: boolean
  /** Social content planner — accounts, week board, markdown post pages. */
  contentPlanner: boolean
  /** Outbound — reserved, off by default, implemented in a later milestone. */
  broadcasts: boolean
  journeys: boolean
}

export interface MarketingDomainPreset {
  conversion: ConversionModel
  channels: AcquisitionChannel[]
  modules: MarketingDomainModules
}

const AGENCY: MarketingDomainPreset = {
  conversion: {
    id: 'won-deal',
    label: 'Won deal',
    labelPlural: 'Won deals',
    valueLabel: 'Pipeline value',
    source: 'crm',
    avgValue: 3200,
  },
  channels: [
    { id: 'paid-search', label: 'Paid Search', icon: 'Search', kind: 'paid' },
    { id: 'paid-social', label: 'Paid Social', icon: 'Megaphone', kind: 'paid' },
    { id: 'organic', label: 'Organic / SEO', icon: 'Globe', kind: 'organic' },
    { id: 'email', label: 'Email', icon: 'Mail', kind: 'outbound' },
    { id: 'referral', label: 'Referral', icon: 'Users', kind: 'referral' },
    { id: 'direct', label: 'Direct', icon: 'MousePointerClick', kind: 'direct' },
  ],
  modules: { channels: true, campaigns: true, funnel: true, landingPages: true, contentPlanner: false, broadcasts: false, journeys: false },
}

const BEAUTY: MarketingDomainPreset = {
  conversion: {
    id: 'booking',
    label: 'Booking',
    labelPlural: 'Bookings',
    valueLabel: 'Booking revenue',
    source: 'agenda',
    avgValue: 85,
  },
  channels: [
    { id: 'instagram', label: 'Instagram', icon: 'Instagram', kind: 'social' },
    { id: 'google', label: 'Google', icon: 'Globe', kind: 'organic' },
    { id: 'referral', label: 'Referral', icon: 'Users', kind: 'referral' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', kind: 'social' },
    { id: 'walkin', label: 'Walk-in', icon: 'DoorOpen', kind: 'direct' },
  ],
  modules: { channels: true, campaigns: true, funnel: true, landingPages: false, contentPlanner: true, broadcasts: false, journeys: false },
}

const RESTO: MarketingDomainPreset = {
  conversion: {
    id: 'order',
    label: 'Order',
    labelPlural: 'Orders',
    valueLabel: 'Revenue',
    source: 'orders',
    avgValue: 42,
  },
  channels: [
    { id: 'ifood', label: 'iFood', icon: 'Utensils', kind: 'paid' },
    { id: 'delivery', label: 'Delivery apps', icon: 'Bike', kind: 'paid' },
    { id: 'google', label: 'Google', icon: 'Globe', kind: 'organic' },
    { id: 'instagram', label: 'Instagram', icon: 'Instagram', kind: 'social' },
    { id: 'walkin', label: 'Walk-in', icon: 'DoorOpen', kind: 'direct' },
  ],
  modules: { channels: true, campaigns: true, funnel: true, landingPages: false, contentPlanner: false, broadcasts: false, journeys: false },
}

export const MARKETING_PRESETS: Record<MarketingDomain, MarketingDomainPreset> = {
  agency: AGENCY,
  beauty: BEAUTY,
  resto: RESTO,
}

/** Vertical-flavored campaign name templates for the mock seed. */
export const CAMPAIGN_NAME_SEEDS: Record<MarketingDomain, string[]> = {
  agency: [
    'Q2 Lead-gen — Search',
    'LinkedIn Retargeting',
    'Webinar Funnel',
    'Newsletter Nurture',
    'Partner Referral Push',
  ],
  beauty: [
    'Summer Glow Promo',
    'New Client — Instagram',
    'Birthday Offer Blast',
    'Win-back 90 days',
    'Google Reviews Boost',
  ],
  resto: [
    'iFood Weekend Combo',
    'Happy Hour Promo',
    'New Menu Launch',
    'Loyalty Double Points',
    'Instagram Stories Drop',
  ],
}
