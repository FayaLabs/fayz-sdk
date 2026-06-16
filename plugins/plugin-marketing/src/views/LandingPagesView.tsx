import React from 'react'
import { MousePointerClick, Layers, Percent } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useMarketingStore } from '../MarketingContext'
import { formatNumber, formatPercent } from '../format'
import { KpiCard, RangeTabs } from '../components/MarketingBits'
import type { LandingPagePerf } from '../types'

const TYPE_STYLE: Record<string, string> = {
  Funnel: 'bg-indigo-100 text-indigo-700',
  'Landing page': 'bg-pink-100 text-pink-700',
  Website: 'bg-sky-100 text-sky-700',
}

export function LandingPagesView() {
  const t = useTranslation()
  const pages = useMarketingStore((s) => s.landingPages)

  const totalVisits = pages.reduce((s, p) => s + p.visits, 0)
  const totalConv = pages.reduce((s, p) => s + p.conversions, 0)
  const avgCvr = totalVisits > 0 ? (totalConv / totalVisits) * 100 : 0

  const columns = React.useMemo<ColumnDef<LandingPagePerf, any>[]>(() => [
    { accessorKey: 'name', header: t('marketing.col.page'), cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue() as string}</span> },
    { accessorKey: 'type', header: t('marketing.col.type'), cell: ({ getValue }) => { const v = getValue() as string; return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[v] ?? 'bg-muted text-muted-foreground'}`}>{v}</span> } },
    { accessorKey: 'visits', header: t('marketing.col.visits'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatNumber(getValue() as number)}</span> },
    { accessorKey: 'conversions', header: t('marketing.col.conversions'), cell: ({ getValue }) => <span className="font-medium text-foreground">{formatNumber(getValue() as number)}</span> },
    { accessorKey: 'cvr', header: t('marketing.col.cvr'), cell: ({ getValue }) => <span className="text-muted-foreground">{formatPercent(getValue() as number)}</span> },
  ], [t])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('marketing.landing.subtitle')}</p>
        <RangeTabs />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard icon={MousePointerClick} label={t('marketing.metric.totalVisits')} value={formatNumber(totalVisits)} />
        <KpiCard icon={Layers} label={t('marketing.metric.pages')} value={String(pages.length)} />
        <KpiCard icon={Percent} label={t('marketing.metric.avgConversion')} value={formatPercent(avgCvr)} />
      </div>

      <DataTable columns={columns} data={pages} emptyMessage={t('marketing.landing.subtitle')} />
    </div>
  )
}
