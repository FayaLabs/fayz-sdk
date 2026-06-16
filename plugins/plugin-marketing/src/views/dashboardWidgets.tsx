import React, { useEffect } from 'react'
import { Target, Percent, DollarSign, Trophy } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreApi } from 'zustand'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import {
  KpiCard, TableWidget, Card, CardHeader, CardTitle, CardContent,
  defineKpiWidget, defineCustomWidget, defineTableWidget,
} from '@fayz-ai/ui'
import {
  MarketingContextProvider, useMarketingConfig, useMarketingStore, useChannelLookup,
  type ResolvedMarketingConfig,
} from '../MarketingContext'
import type { MarketingDataProvider } from '../data/types'
import type { MarketingUIState } from '../store'
import { formatCurrency, formatNumber, formatPercent, formatCompact } from '../format'
import { ProportionBar, ChannelCell, StatusBadge } from '../components/MarketingBits'
import type { Campaign } from '../types'

// Ensure marketing data is loaded — covers the global home, where MarketingPage
// (which normally triggers load) is not mounted. Guarded to avoid refetch storms.
function useEnsureMarketingData() {
  const overview = useMarketingStore((s) => s.overview)
  const loading = useMarketingStore((s) => s.loading)
  const load = useMarketingStore((s) => s.load)
  useEffect(() => { if (!overview && !loading) void load() }, [])
}

// ---------------------------------------------------------------------------
// KPI widgets (shared KpiCard — trend chip from current/previous)
// ---------------------------------------------------------------------------

function ConversionsKpi() {
  const { conversion } = useMarketingConfig()
  const overview = useMarketingStore((s) => s.overview)
  useEnsureMarketingData()
  return (
    <KpiCard
      icon={Target} label={conversion.labelPlural}
      value={formatNumber(overview?.conversions ?? 0)}
      current={overview?.conversions} previous={overview?.conversionsPrev}
    />
  )
}

function ConversionRateKpi() {
  const t = useTranslation()
  const overview = useMarketingStore((s) => s.overview)
  useEnsureMarketingData()
  return (
    <KpiCard
      icon={Percent} label={t('marketing.metric.conversionRate')}
      value={formatPercent(overview?.cvr ?? 0)}
      current={overview?.cvr} previous={overview?.cvrPrev}
    />
  )
}

function CpaKpi() {
  const t = useTranslation()
  const { currency } = useMarketingConfig()
  const overview = useMarketingStore((s) => s.overview)
  useEnsureMarketingData()
  return (
    <KpiCard
      icon={DollarSign} label={t('marketing.metric.cpa')}
      value={overview && overview.cpa > 0 ? formatCurrency(overview.cpa, currency) : '—'}
      sub={`${formatCurrency(overview?.spend ?? 0, currency)} ${t('marketing.metric.spend')}`}
    />
  )
}

function TopChannelKpi() {
  const t = useTranslation()
  const { conversion, currency } = useMarketingConfig()
  const overview = useMarketingStore((s) => s.overview)
  const lookup = useChannelLookup()
  useEnsureMarketingData()
  return (
    <KpiCard
      icon={Trophy} label={t('marketing.metric.topChannel')}
      value={overview?.topChannelId ? lookup.get(overview.topChannelId)?.label ?? '—' : '—'}
      sub={`${conversion.valueLabel}: ${formatCurrency(overview?.value ?? 0, currency)}`}
    />
  )
}

// ---------------------------------------------------------------------------
// Channel mix (custom — reuses the existing ProportionBar + channel icons)
// ---------------------------------------------------------------------------

function ChannelMixPanel() {
  const t = useTranslation()
  const { conversion } = useMarketingConfig()
  const overview = useMarketingStore((s) => s.overview)
  useEnsureMarketingData()
  const mix = overview?.channelMix ?? []
  const maxMix = Math.max(...mix.map((m) => m.conversions), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{conversion.labelPlural} {t('marketing.overview.byChannelSuffix')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {mix.map((m) => (
          <ProportionBar
            key={m.channelId}
            value={m.conversions}
            max={maxMix}
            color="#6366f1"
            label={<ChannelCell channelId={m.channelId} />}
            right={<span>{formatNumber(m.conversions)}</span>}
          />
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Recent campaigns table
// ---------------------------------------------------------------------------

function CampaignsTable() {
  const t = useTranslation()
  const { conversion } = useMarketingConfig()
  const campaigns = useMarketingStore((s) => s.campaigns)
  useEnsureMarketingData()
  const columns: ColumnDef<Campaign, unknown>[] = [
    { accessorKey: 'name', header: t('marketing.col.campaign'), cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue() as string}</span> },
    { accessorKey: 'channelId', header: t('marketing.col.channel'), cell: ({ getValue }) => <ChannelCell channelId={getValue() as string} /> },
    { accessorKey: 'conversions', header: conversion.labelPlural, cell: ({ getValue }) => <span className="text-muted-foreground">{formatCompact(getValue() as number)}</span> },
    { id: 'cvr', accessorFn: (c) => (c.reach > 0 ? (c.conversions / c.reach) * 100 : 0), header: t('marketing.col.cvr'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatPercent(getValue() as number)}</span> },
    { accessorKey: 'status', header: t('marketing.col.status'), cell: ({ getValue }) => <StatusBadge status={getValue() as Campaign['status']} /> },
  ]
  const recent = campaigns.filter((c) => c.status !== 'draft').slice(0, 5)
  return <TableWidget title={t('marketing.overview.recent')} icon="Megaphone" columns={columns} data={recent} emptyMessage={t('marketing.campaigns.empty')} />
}

// ---------------------------------------------------------------------------
// Registry builder — wraps each widget in MarketingContextProvider so it renders
// on the global home (no MarketingPage around it) and the marketing plugin-home.
// ---------------------------------------------------------------------------

export function createMarketingDashboardWidgets(ctx: {
  config: ResolvedMarketingConfig
  provider: MarketingDataProvider
  store: StoreApi<MarketingUIState>
}): DashboardWidgetDef[] {
  const withCtx = (Inner: React.ComponentType): React.ComponentType<unknown> => {
    const Wrapped = () => (
      <MarketingContextProvider config={ctx.config} provider={ctx.provider} store={ctx.store}>
        <Inner />
      </MarketingContextProvider>
    )
    Wrapped.displayName = `MarketingWidget(${Inner.displayName ?? Inner.name})`
    return Wrapped
  }

  return [
    // Conversions is marketing's headline KPI on the global home; the rest are
    // home-hidden by default (shown on the marketing plugin-home, addable via Customize).
    defineKpiWidget({ id: 'marketing.kpi.conversions', title: 'marketing.metric.conversions', domain: 'marketing', defaultOrder: 0, component: withCtx(ConversionsKpi) }),
    defineKpiWidget({ id: 'marketing.kpi.conversion-rate', title: 'marketing.metric.conversionRate', domain: 'marketing', defaultOrder: 1, defaultVisible: false, component: withCtx(ConversionRateKpi) }),
    defineKpiWidget({ id: 'marketing.kpi.cpa', title: 'marketing.metric.cpa', domain: 'marketing', defaultOrder: 2, defaultVisible: false, component: withCtx(CpaKpi) }),
    defineKpiWidget({ id: 'marketing.kpi.top-channel', title: 'marketing.metric.topChannel', domain: 'marketing', defaultOrder: 3, defaultVisible: false, component: withCtx(TopChannelKpi) }),
    // Channel-mix + campaigns default to the marketing plugin-home only; the
    // global home stays a clean cross-domain KPI overview.
    defineCustomWidget({ id: 'marketing.panel.channel-mix', title: 'marketing.overview.byChannelSuffix', domain: 'marketing', span: 4, defaultOrder: 10, surfaces: ['plugin-home'], component: withCtx(ChannelMixPanel) }),
    defineTableWidget({ id: 'marketing.table.recent-campaigns', title: 'marketing.overview.recent', domain: 'marketing', span: 4, defaultOrder: 20, surfaces: ['plugin-home'], component: withCtx(CampaignsTable) }),
  ]
}
