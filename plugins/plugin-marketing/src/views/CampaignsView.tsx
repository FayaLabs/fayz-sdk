import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, DataTable } from '@fayz-ai/ui'
import { PermissionGate } from '@fayz-ai/saas'
import { useTranslation } from '@fayz-ai/core'
import { useMarketingConfig, useMarketingStore } from '../MarketingContext'
import { formatCurrency, formatNumber, formatPercent } from '../format'
import { RangeTabs, ChannelCell, StatusBadge } from '../components/MarketingBits'
import { CampaignComposer } from './CampaignComposer'
import type { Campaign } from '../types'

export function CampaignsView() {
  const t = useTranslation()
  const { conversion, currency } = useMarketingConfig()
  const campaigns = useMarketingStore((s) => s.campaigns)
  const deleteCampaign = useMarketingStore((s) => s.deleteCampaign)
  const [composerOpen, setComposerOpen] = React.useState(false)

  const columns = React.useMemo<ColumnDef<Campaign, any>[]>(() => [
    { accessorKey: 'name', header: t('marketing.col.campaign'), cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue() as string}</span> },
    { accessorKey: 'channelId', header: t('marketing.col.channel'), cell: ({ getValue }) => <ChannelCell channelId={getValue() as string} /> },
    { accessorKey: 'reach', header: t('marketing.col.reach'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue() as number)}</span> },
    { accessorKey: 'conversions', header: conversion.labelPlural, cell: ({ getValue }) => <span className="font-medium text-foreground">{formatNumber(getValue() as number)}</span> },
    { id: 'cvr', accessorFn: (c) => (c.reach > 0 ? (c.conversions / c.reach) * 100 : 0), header: t('marketing.col.cvr'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatPercent(getValue() as number)}</span> },
    { accessorKey: 'spend', header: t('marketing.col.spend'), cell: ({ getValue }) => { const v = getValue() as number; return <span className="text-muted-foreground">{v > 0 ? formatCurrency(v, currency) : '—'}</span> } },
    { accessorKey: 'status', header: t('marketing.col.status'), cell: ({ getValue }) => <StatusBadge status={getValue() as Campaign['status']} /> },
    {
      id: 'actions', header: '', enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); void deleteCampaign(row.original.id) }}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title={t('marketing.campaigns.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ], [t, conversion.labelPlural, currency, deleteCampaign])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('marketing.campaigns.subtitle')}</p>
        <div className="flex items-center gap-2">
          <RangeTabs />
          <PermissionGate feature="marketing" action="create">
            <Button onClick={() => setComposerOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> {t('marketing.campaigns.new')}</Button>
          </PermissionGate>
        </div>
      </div>

      <DataTable columns={columns} data={campaigns} emptyMessage={t('marketing.campaigns.empty')} />

      <CampaignComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
