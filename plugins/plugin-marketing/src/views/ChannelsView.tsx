import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useMarketingConfig, useMarketingStore } from '../MarketingContext'
import { formatCurrency, formatNumber, formatPercent } from '../format'
import { RangeTabs, ChannelCell } from '../components/MarketingBits'
import type { ChannelPerformance } from '../types'

export function ChannelsView({ onOpen }: { onOpen: (channelId: string) => void }) {
  const t = useTranslation()
  const { conversion, currency } = useMarketingConfig()
  const channels = useMarketingStore((s) => s.channels)

  // Default ordering by conversions; DataTable lets the user re-sort any column.
  const sorted = [...channels].sort((a, b) => b.conversions - a.conversions)

  const columns = React.useMemo<ColumnDef<ChannelPerformance, any>[]>(() => [
    { accessorKey: 'channelId', header: t('marketing.col.channel'), cell: ({ getValue }) => <ChannelCell channelId={getValue() as string} /> },
    { accessorKey: 'reach', header: t('marketing.col.reach'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue() as number)}</span> },
    { accessorKey: 'leads', header: t('marketing.col.leads'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue() as number)}</span> },
    { accessorKey: 'conversions', header: conversion.labelPlural, cell: ({ getValue }) => <span className="font-medium text-foreground">{formatNumber(getValue() as number)}</span> },
    { accessorKey: 'cvr', header: t('marketing.col.cvr'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatPercent(getValue() as number)}</span> },
    { accessorKey: 'spend', header: t('marketing.col.spend'), cell: ({ getValue }) => { const v = getValue() as number; return <span className="text-muted-foreground">{v > 0 ? formatCurrency(v, currency) : '—'}</span> } },
    { accessorKey: 'cpa', header: t('marketing.col.cpa'), cell: ({ getValue }) => { const v = getValue() as number; return <span className="text-muted-foreground">{v > 0 ? formatCurrency(v, currency) : '—'}</span> } },
    { accessorKey: 'value', header: conversion.valueLabel, cell: ({ getValue }) => <span className="text-muted-foreground">{formatCurrency(getValue() as number, currency)}</span> },
    { id: 'open', header: '', enableSorting: false, cell: () => <ChevronRight className="h-4 w-4 text-muted-foreground" /> },
  ], [t, conversion.labelPlural, conversion.valueLabel, currency])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('marketing.channels.subtitle')}</p>
        <RangeTabs />
      </div>

      <DataTable
        columns={columns}
        data={sorted}
        onRowClick={(row) => onOpen(row.channelId)}
        emptyMessage={t('marketing.channels.subtitle')}
      />
    </div>
  )
}
