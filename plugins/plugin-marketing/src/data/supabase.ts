import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import type {
  AttributionBridge,
  MarketingDataProvider,
  SaveCampaignInput,
  SitesPerformanceBridge,
} from './types'
import type {
  AcquisitionChannel,
  Campaign,
  ChannelPerformance,
  ConversionModel,
  DateRangeKey,
  FunnelStage,
  LandingPagePerf,
  MarketingOverview,
  MarketingQuery,
} from '../types'
import { T, V } from './tables'

// ---------------------------------------------------------------------------
// Supabase marketing provider. Channels/campaigns are real CRUD rows
// (plg_marketing_channels/_campaigns, lazily seeded from the app's channel
// config); performance is derived from v_marketing_attribution — REAL
// conversions (bookings/orders/won deals) and leads, attributed by matching
// the event's origin string against the channel set. Reach has no generic
// source yet, so it reads 0 until a sites/ads integration feeds it.
// ---------------------------------------------------------------------------

export interface SupabaseMarketingProviderOptions {
  channels: AcquisitionChannel[]
  conversion: ConversionModel
  attributionBridge?: AttributionBridge
  sitesBridge?: SitesPerformanceBridge
}

const RANGE_DAYS: Record<DateRangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 }

function getClient() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return supabase
}

function requireTenantId(): string {
  const tenantId = getActiveTenantId()
  if (!tenantId) throw new Error('No active tenant')
  return tenantId
}

/** 'Walk-in' → 'walkin', 'paid-search' → 'paidsearch' — origin strings match
 *  channel ids OR labels regardless of case/punctuation. */
function normKey(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

interface AttributionRow {
  kind: 'lead' | 'conversion'
  source: string
  channel_raw: string | null
  occurred_at: string
  value: number | null
}

export function createSupabaseMarketingProvider(
  options: SupabaseMarketingProviderOptions,
): MarketingDataProvider {
  const { channels, conversion, attributionBridge, sitesBridge } = options

  const channelByNorm = new Map<string, string>()
  for (const ch of channels) {
    channelByNorm.set(normKey(ch.id), ch.id)
    channelByNorm.set(normKey(ch.label), ch.id)
  }
  const resolveChannel = (raw: string | null): string | null =>
    channelByNorm.get(normKey(raw)) ?? null

  // Lazy per-tenant seed: the channel set comes from app config (SQL can't know
  // the domain), so the first read upserts the preset rows. Idempotent via the
  // (tenant_id, channel_key) unique index.
  const seeded = new Set<string>()
  async function ensureChannels(tenantId: string): Promise<void> {
    if (seeded.has(tenantId)) return
    seeded.add(tenantId)
    await getClient()
      .from(T.channels)
      .upsert(
        channels.map((c) => ({
          tenant_id: tenantId,
          channel_key: c.id,
          label: c.label,
          icon: c.icon,
          kind: c.kind,
        })),
        { onConflict: 'tenant_id,channel_key', ignoreDuplicates: true },
      )
  }

  // One store.load() fans out to overview + channels + funnel + campaigns, and
  // dashboard widgets pile on top — without dedup that's ~10 concurrent
  // requests per mount (a stampede the instant mock never surfaced). Share
  // in-flight promises and cache briefly; writes clear the cache.
  const CACHE_TTL_MS = 30_000
  const cache = new Map<string, { at: number; promise: Promise<unknown> }>()
  function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise as Promise<T>
    const promise = fn().catch((err) => {
      cache.delete(key)
      throw err
    })
    cache.set(key, { at: Date.now(), promise })
    return promise
  }

  function windowFor(range: DateRangeKey): { since: Date; days: number } {
    const days = RANGE_DAYS[range]
    // Quantized to the minute so equal ranges hit the same cache key.
    const now = Math.floor(Date.now() / 60_000) * 60_000
    return { since: new Date(now - days * 86_400_000), days }
  }

  function fetchAttribution(
    tenantId: string,
    since: Date,
    until?: Date,
  ): Promise<AttributionRow[]> {
    const key = `attr:${tenantId}:${since.getTime()}:${until?.getTime() ?? ''}`
    return memo(key, async () => {
      let q = getClient()
        .from(V.attribution)
        .select('kind, source, channel_raw, occurred_at, value')
        .eq('tenant_id', tenantId)
        .gte('occurred_at', since.toISOString())
        // Leads always count; conversions only from the vertical's source.
        .or(`kind.eq.lead,and(kind.eq.conversion,source.eq.${conversion.source})`)
      if (until) q = q.lt('occurred_at', until.toISOString())
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as AttributionRow[]
    })
  }

  interface ChannelRollup {
    leads: number
    conversions: number
    value: number
  }

  function rollup(rows: AttributionRow[]): Map<string, ChannelRollup> {
    const map = new Map<string, ChannelRollup>()
    for (const row of rows) {
      const channelId = resolveChannel(row.channel_raw)
      if (!channelId) continue
      const agg = map.get(channelId) ?? { leads: 0, conversions: 0, value: 0 }
      if (row.kind === 'lead') agg.leads += 1
      else {
        agg.conversions += 1
        agg.value += Number(row.value ?? conversion.avgValue)
      }
      map.set(channelId, agg)
    }
    return map
  }

  function fetchSpend(
    tenantId: string,
    days: number,
    since: Date,
  ): Promise<Map<string, number>> {
    return memo(`spend:${tenantId}:${days}:${since.getTime()}`, () => fetchSpendRaw(tenantId, days, since))
  }

  async function fetchSpendRaw(
    tenantId: string,
    days: number,
    since: Date,
  ): Promise<Map<string, number>> {
    const client = getClient()
    const [channelRows, campaignRows] = await Promise.all([
      client.from(V.channels).select('channel_key, monthly_spend').eq('tenant_id', tenantId),
      client
        .from(V.campaigns)
        .select('channel_key, spend, status, starts_at, ends_at')
        .eq('tenant_id', tenantId)
        .neq('status', 'draft'),
    ])
    const spend = new Map<string, number>()
    for (const row of channelRows.data ?? []) {
      const id = resolveChannel(row.channel_key)
      if (!id) continue
      spend.set(id, (spend.get(id) ?? 0) + (Number(row.monthly_spend) * days) / 30)
    }
    for (const row of campaignRows.data ?? []) {
      const id = resolveChannel(row.channel_key)
      if (!id) continue
      // Count a campaign's spend when its window overlaps the query window.
      const ended = row.ends_at ? new Date(row.ends_at) : null
      if (ended && ended < since) continue
      spend.set(id, (spend.get(id) ?? 0) + Number(row.spend))
    }
    return spend
  }

  async function channelPerformance(query: MarketingQuery): Promise<ChannelPerformance[]> {
    const tenantId = requireTenantId()
    await ensureChannels(tenantId)
    const { since, days } = windowFor(query.range)
    const [rows, spend] = await Promise.all([
      fetchAttribution(tenantId, since),
      fetchSpend(tenantId, days, since),
    ])
    const byChannel = rollup(rows)
    if (attributionBridge) {
      const bridged = await attributionBridge.conversionsByChannel(query)
      for (const b of bridged) {
        const agg = byChannel.get(b.channelId) ?? { leads: 0, conversions: 0, value: 0 }
        agg.conversions = b.conversions
        agg.value = b.value
        byChannel.set(b.channelId, agg)
      }
    }
    const list = channels.map((ch) => {
      const agg = byChannel.get(ch.id) ?? { leads: 0, conversions: 0, value: 0 }
      const chSpend = spend.get(ch.id) ?? 0
      return {
        channelId: ch.id,
        reach: 0,
        leads: agg.leads,
        conversions: agg.conversions,
        spend: Math.round(chSpend),
        value: Math.round(agg.value),
        cvr: 0,
        cpa: agg.conversions > 0 && chSpend > 0 ? chSpend / agg.conversions : 0,
      }
    })
    return query.channelId ? list.filter((c) => c.channelId === query.channelId) : list
  }

  function campaignFromRow(row: Record<string, any>): Campaign {
    return {
      id: row.id,
      name: row.name,
      channelId: row.channel_key,
      status: row.status,
      start: row.starts_at ?? row.created_at,
      end: row.ends_at ?? undefined,
      spend: Number(row.spend ?? 0),
      reach: 0,
      leads: 0,
      conversions: 0,
      value: 0,
    }
  }

  function withDerived(campaign: Campaign, rows: AttributionRow[]): Campaign {
    const start = new Date(campaign.start).getTime()
    const end = campaign.end ? new Date(campaign.end).getTime() : Number.POSITIVE_INFINITY
    let leads = 0
    let conversions = 0
    let value = 0
    for (const row of rows) {
      if (resolveChannel(row.channel_raw) !== campaign.channelId) continue
      const at = new Date(row.occurred_at).getTime()
      if (at < start || at > end) continue
      if (row.kind === 'lead') leads += 1
      else {
        conversions += 1
        value += Number(row.value ?? conversion.avgValue)
      }
    }
    return { ...campaign, leads, conversions, value: Math.round(value) }
  }

  return {
    channelPerformance,

    async overview(query: MarketingQuery): Promise<MarketingOverview> {
      const tenantId = requireTenantId()
      const perf = await channelPerformance(query)
      const { since, days } = windowFor(query.range)
      const prevRows = await fetchAttribution(
        tenantId,
        new Date(since.getTime() - days * 86_400_000),
        since,
      )
      const conversions = perf.reduce((s, c) => s + c.conversions, 0)
      const spend = perf.reduce((s, c) => s + c.spend, 0)
      const value = perf.reduce((s, c) => s + c.value, 0)
      const conversionsPrev = prevRows.filter(
        (r) => r.kind === 'conversion' && resolveChannel(r.channel_raw),
      ).length
      const top = [...perf].sort((a, b) => b.conversions - a.conversions)[0]
      return {
        conversions,
        conversionsPrev,
        cvr: 0,
        cvrPrev: 0,
        spend,
        cpa: conversions > 0 && spend > 0 ? spend / conversions : 0,
        value,
        topChannelId: top && top.conversions > 0 ? top.channelId : null,
        channelMix: perf.map((c) => ({ channelId: c.channelId, conversions: c.conversions })),
      }
    },

    async funnel(query: MarketingQuery): Promise<FunnelStage[]> {
      if (attributionBridge) return attributionBridge.funnel(query)
      const tenantId = requireTenantId()
      const { since } = windowFor(query.range)
      const rows = await fetchAttribution(tenantId, since)
      const leads = rows.filter((r) => r.kind === 'lead').length
      const conversions = rows.filter((r) => r.kind === 'conversion').length
      return [
        { id: 'leads', label: 'Leads', count: leads, color: '#0ea5e9' },
        { id: 'converted', label: conversion.labelPlural, count: conversions, color: '#22c55e' },
      ]
    },

    async listCampaigns(query: MarketingQuery): Promise<Campaign[]> {
      const tenantId = requireTenantId()
      const fetchRows = () =>
        memo(`campaigns:${tenantId}`, async () => {
          const { data, error } = await getClient()
            .from(V.campaigns)
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
          if (error) throw error
          return (data ?? []) as Record<string, any>[]
        })
      const [data, rows] = await Promise.all([
        fetchRows(),
        fetchAttribution(tenantId, windowFor(query.range).since),
      ])
      const list = query.channelId ? data.filter((r) => r.channel_key === query.channelId) : data
      return list.map((row) => withDerived(campaignFromRow(row), rows))
    },

    async getCampaign(id: string): Promise<Campaign | null> {
      const tenantId = requireTenantId()
      const { data, error } = await getClient()
        .from(V.campaigns)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const campaign = campaignFromRow(data)
      const rows = await fetchAttribution(tenantId, new Date(campaign.start))
      return withDerived(campaign, rows)
    },

    async saveCampaign(input: SaveCampaignInput): Promise<Campaign> {
      const tenantId = requireTenantId()
      const payload = {
        name: input.name,
        channel_key: input.channelId,
        status: input.status,
        starts_at: input.start || null,
        ends_at: input.end || null,
        spend: input.spend ?? 0,
      }
      if (input.id) {
        const { data, error } = await getClient()
          .from(T.campaigns)
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single()
        if (error) throw error
        cache.clear()
        return campaignFromRow(data)
      }
      const { data, error } = await getClient()
        .from(T.campaigns)
        .insert({ tenant_id: tenantId, ...payload })
        .select('*')
        .single()
      if (error) throw error
      cache.clear()
      return campaignFromRow(data)
    },

    async deleteCampaign(id: string): Promise<void> {
      const { error } = await getClient().from(T.campaigns).delete().eq('id', id)
      if (error) throw error
      cache.clear()
    },

    invalidateCache() {
      cache.clear()
    },

    async landingPages(query: MarketingQuery): Promise<LandingPagePerf[]> {
      if (sitesBridge) return sitesBridge.landingPages(query)
      return []
    },
  }
}
