import React from 'react'
import { Target, Percent, DollarSign, Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, SubpageHeader } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useMarketingConfig, useMarketingStore, useChannelLookup, useMarketingProvider } from '../MarketingContext'
import { formatCurrency, formatNumber, formatPercent } from '../format'
import { KpiCard, StatusBadge } from '../components/MarketingBits'
import type { Campaign } from '../types'

export function ChannelDetailView({ channelId, onBack }: { channelId: string; onBack: () => void }) {
  const t = useTranslation()
  const { conversion, currency, labels } = useMarketingConfig()
  const range = useMarketingStore((s) => s.range)
  const channels = useMarketingStore((s) => s.channels)
  const lookup = useChannelLookup()
  const provider = useMarketingProvider()
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])

  React.useEffect(() => {
    void provider.listCampaigns({ range, channelId }).then(setCampaigns)
  }, [provider, range, channelId])

  const perf = channels.find((c) => c.channelId === channelId)
  const channel = lookup.get(channelId)

  const columns = React.useMemo<ColumnDef<Campaign, any>[]>(() => [
    { accessorKey: 'name', header: t('marketing.col.campaign'), cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue() as string}</span> },
    { accessorKey: 'conversions', header: conversion.labelPlural, cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue() as number)}</span> },
    { id: 'cvr', accessorFn: (c) => (c.reach > 0 ? (c.conversions / c.reach) * 100 : 0), header: t('marketing.col.cvr'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatPercent(getValue() as number)}</span> },
    { accessorKey: 'spend', header: t('marketing.col.spend'), cell: ({ getValue }) => { const v = getValue() as number; return <span className="text-muted-foreground">{v > 0 ? formatCurrency(v, currency) : '—'}</span> } },
    { accessorKey: 'status', header: t('marketing.col.status'), cell: ({ getValue }) => <StatusBadge status={getValue() as Campaign['status']} /> },
  ], [t, conversion.labelPlural, currency])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SubpageHeader
        title={channel?.label ?? channelId}
        subtitle={channel?.kind}
        onBack={onBack}
        parentLabel={labels.channels}
      />

      {perf && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard icon={Users} label={t('marketing.metric.reach')} value={formatNumber(perf.reach)} />
          <KpiCard icon={Target} label={conversion.labelPlural} value={formatNumber(perf.conversions)} />
          <KpiCard icon={Percent} label={t('marketing.metric.cvr')} value={formatPercent(perf.cvr)} />
          <KpiCard icon={DollarSign} label={t('marketing.col.cpa')} value={perf.cpa > 0 ? formatCurrency(perf.cpa, currency) : '—'} sub={perf.spend > 0 ? `${formatCurrency(perf.spend, currency)} ${t('marketing.metric.spend')}` : '—'} />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">{t('marketing.channels.campaignsOn')}</h2>
        <DataTable columns={columns} data={campaigns} emptyMessage={t('marketing.channels.noCampaigns')} />
      </div>
    </div>
  )
}
