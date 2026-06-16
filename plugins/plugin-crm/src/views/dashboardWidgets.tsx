import React, { useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreApi } from 'zustand'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import {
  KpiCard, ChartWidget, TableWidget,
  defineKpiWidget, defineChartWidget, defineTableWidget, defineCustomWidget,
  Card, CardHeader, CardTitle, CardContent,
} from '@fayz-ai/ui'
import { CrmContextProvider, useCrmConfig, useCrmStore, formatCurrency, type ResolvedCrmConfig } from '../CrmContext'
import type { CrmDataProvider } from '../data/types'
import type { CrmUIState } from '../store'
import type { Lead, Quote } from '../types'

// ---------------------------------------------------------------------------
// Data-loading hooks (the store dedups, so widgets can each ensure their data).
// ---------------------------------------------------------------------------

function useEnsureSummary() {
  const fetchSummary = useCrmStore((s) => s.fetchSummary)
  useEffect(() => { void fetchSummary() }, [])
}

function useEnsureFunnel() {
  const pipelines = useCrmStore((s) => s.pipelines)
  const fetchPipelines = useCrmStore((s) => s.fetchPipelines)
  const fetchFunnel = useCrmStore((s) => s.fetchFunnel)
  useEffect(() => { void fetchPipelines() }, [])
  useEffect(() => { if (pipelines.length > 0) void fetchFunnel(pipelines[0]!.id) }, [pipelines])
}

function StatusDot({ status, palette }: { status: string; palette: Record<string, string> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${palette[status] ?? 'bg-muted-foreground/40'}`} />
      <span className="text-xs capitalize text-muted-foreground">{status}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// KPI widgets
// ---------------------------------------------------------------------------

function TotalLeadsKpi() {
  const t = useTranslation()
  const summary = useCrmStore((s) => s.summary)
  useEnsureSummary()
  return (
    <KpiCard
      label={t('crm.dashboard.totalLeads')}
      icon="Users"
      value={String(summary?.totalLeads ?? 0)}
      sub={t('crm.dashboard.newThisMonth', { count: String(summary?.newLeadsThisMonth ?? 0) })}
    />
  )
}

function OpenPipelineKpi() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const summary = useCrmStore((s) => s.summary)
  useEnsureSummary()
  return (
    <KpiCard
      label={t('crm.dashboard.openPipeline')}
      icon="Target"
      value={formatCurrency(summary?.openDealsValue ?? 0, currency)}
      sub={t('crm.dashboard.activeDeals', { count: String(summary?.totalDeals ?? 0) })}
    />
  )
}

function ConversionRateKpi() {
  const t = useTranslation()
  const summary = useCrmStore((s) => s.summary)
  useEnsureSummary()
  return (
    <KpiCard
      label={t('crm.dashboard.conversionRate')}
      icon="TrendingUp"
      value={`${(summary?.conversionRate ?? 0).toFixed(1)}%`}
      sub={t('crm.dashboard.leadToDeal')}
    />
  )
}

function PendingTasksKpi() {
  const t = useTranslation()
  const summary = useCrmStore((s) => s.summary)
  useEnsureSummary()
  return (
    <KpiCard
      label={t('crm.dashboard.pendingTasks')}
      icon={summary?.overdueActivities ? 'AlertTriangle' : 'Clock'}
      value={String(summary?.pendingActivities ?? 0)}
      sub={t('crm.dashboard.overdueCount', { count: String(summary?.overdueActivities ?? 0) })}
    />
  )
}

// ---------------------------------------------------------------------------
// Chart widgets (recharts)
// ---------------------------------------------------------------------------

function SalesFunnelChart() {
  const t = useTranslation()
  const funnel = useCrmStore((s) => s.funnel)
  useEnsureFunnel()
  const data = funnel.map((s) => ({ name: s.stageName, deals: s.dealCount }))
  return (
    <ChartWidget
      type="bar"
      title={t('crm.dashboard.pipelineOverview')}
      icon="BarChart3"
      categoryKey="name"
      data={data}
      series={[{ dataKey: 'deals' }]}
    />
  )
}

function PipelineValueChart() {
  const t = useTranslation()
  const funnel = useCrmStore((s) => s.funnel)
  useEnsureFunnel()
  const data = funnel.map((s) => ({ name: s.stageName, value: s.totalValue }))
  return (
    <ChartWidget
      type="bar"
      title={t('crm.dashboard.pipelineValue')}
      icon="Target"
      categoryKey="name"
      data={data}
      series={[{ dataKey: 'value', label: t('crm.dashboard.pipelineValue'), color: 'hsl(var(--magic))' }]}
    />
  )
}

function PerformancePanel() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const summary = useCrmStore((s) => s.summary)
  useEnsureSummary()
  const rows = [
    { label: t('crm.dashboard.dealsWon'), value: String(summary?.wonDealsThisMonth ?? 0) },
    { label: t('crm.dashboard.revenueWon'), value: formatCurrency(summary?.wonDealsValueThisMonth ?? 0, currency), accent: true },
    { label: t('crm.dashboard.avgDealValue'), value: formatCurrency(summary?.averageDealValue ?? 0, currency) },
    { label: t('crm.dashboard.conversionRateLabel'), value: `${(summary?.conversionRate ?? 0).toFixed(1)}%` },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-warning">★</span>
          {t('crm.dashboard.performance')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className={`text-sm font-semibold ${r.accent ? 'text-success' : ''}`}>{r.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Table widgets
// ---------------------------------------------------------------------------

const LEAD_STATUS: Record<string, string> = {
  new: 'bg-info', contacted: 'bg-magic', qualified: 'bg-success', converted: 'bg-warning', lost: 'bg-destructive',
}
const QUOTE_STATUS: Record<string, string> = {
  draft: 'bg-muted-foreground', sent: 'bg-info', approved: 'bg-success', rejected: 'bg-destructive', expired: 'bg-warning',
}

function RecentLeadsTable() {
  const t = useTranslation()
  const leads = useCrmStore((s) => s.leads)
  const fetchLeads = useCrmStore((s) => s.fetchLeads)
  useEffect(() => { void fetchLeads({ pageSize: 5 }) }, [])
  const columns: ColumnDef<Lead, unknown>[] = [
    { accessorKey: 'name', header: t('crm.dashboard.recentLeads'), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'contact', header: '', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.email || row.original.phone || row.original.sourceName || '—'}</span> },
    { accessorKey: 'status', header: '', cell: ({ row }) => <StatusDot status={row.original.status} palette={LEAD_STATUS} /> },
  ]
  return <TableWidget title={t('crm.dashboard.recentLeads')} icon="Users" columns={columns} data={leads.slice(0, 5)} emptyMessage={t('crm.dashboard.noLeadsYet')} />
}

function RecentQuotesTable() {
  const t = useTranslation()
  const { currency } = useCrmConfig()
  const quotes = useCrmStore((s) => s.quotes)
  const fetchQuotes = useCrmStore((s) => s.fetchQuotes)
  useEffect(() => { void fetchQuotes({ pageSize: 5 }) }, [])
  const columns: ColumnDef<Quote, unknown>[] = [
    { accessorKey: 'quoteNumber', header: t('crm.dashboard.recentQuotes'), cell: ({ row }) => <span className="font-medium">{row.original.quoteNumber}</span> },
    { id: 'contact', header: '', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.contactName || '—'}</span> },
    { accessorKey: 'status', header: '', cell: ({ row }) => <StatusDot status={row.original.status} palette={QUOTE_STATUS} /> },
    { accessorKey: 'totalAmount', header: '', cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.totalAmount, currency)}</span> },
  ]
  return <TableWidget title={t('crm.dashboard.recentQuotes')} icon="FileText" columns={columns} data={quotes.slice(0, 5)} emptyMessage={t('crm.dashboard.noQuotesYet')} />
}

// ---------------------------------------------------------------------------
// Registry builder — wraps each widget in CrmContextProvider so it renders on
// both the global home (no CRM page around it) and the CRM plugin-home.
// ---------------------------------------------------------------------------

export function createCrmDashboardWidgets(ctx: {
  config: ResolvedCrmConfig
  provider: CrmDataProvider
  store: StoreApi<CrmUIState>
}): DashboardWidgetDef[] {
  const withCtx = (Inner: React.ComponentType): React.ComponentType<unknown> => {
    const Wrapped = () => (
      <CrmContextProvider config={ctx.config} provider={ctx.provider} store={ctx.store}>
        <Inner />
      </CrmContextProvider>
    )
    Wrapped.displayName = `CrmWidget(${Inner.displayName ?? Inner.name})`
    return Wrapped
  }

  return [
    // Open pipeline is CRM's headline KPI — visible on the global home by
    // default. The rest are hidden on the home (defaultVisible:false) but show
    // on the CRM plugin-home and can be added to the home via Customize.
    defineKpiWidget({ id: 'crm.kpi.open-pipeline', title: 'crm.dashboard.openPipeline', domain: 'crm', defaultOrder: 1, component: withCtx(OpenPipelineKpi) }),
    defineKpiWidget({ id: 'crm.kpi.total-leads', title: 'crm.dashboard.totalLeads', domain: 'crm', defaultOrder: 0, defaultVisible: false, component: withCtx(TotalLeadsKpi) }),
    defineKpiWidget({ id: 'crm.kpi.conversion-rate', title: 'crm.dashboard.conversionRate', domain: 'crm', defaultOrder: 2, defaultVisible: false, component: withCtx(ConversionRateKpi) }),
    defineKpiWidget({ id: 'crm.kpi.pending-tasks', title: 'crm.dashboard.pendingTasks', domain: 'crm', defaultOrder: 3, defaultVisible: false, component: withCtx(PendingTasksKpi) }),
    // Charts/tables are richer — default them to the CRM plugin-home only, so
    // the global app home stays a clean cross-domain KPI overview. Users can
    // still surface them via the Customize menu / app layout.
    defineChartWidget({ id: 'crm.chart.funnel', title: 'crm.dashboard.pipelineOverview', domain: 'crm', span: 2, defaultOrder: 10, surfaces: ['plugin-home'], component: withCtx(SalesFunnelChart) }),
    defineCustomWidget({ id: 'crm.panel.performance', title: 'crm.dashboard.performance', domain: 'crm', span: 2, defaultOrder: 11, surfaces: ['plugin-home'], component: withCtx(PerformancePanel) }),
    defineChartWidget({ id: 'crm.chart.pipeline-value', title: 'crm.dashboard.pipelineValue', domain: 'crm', span: 4, defaultOrder: 12, surfaces: ['plugin-home'], component: withCtx(PipelineValueChart) }),
    defineTableWidget({ id: 'crm.table.recent-leads', title: 'crm.dashboard.recentLeads', domain: 'crm', span: 2, defaultOrder: 20, surfaces: ['plugin-home'], component: withCtx(RecentLeadsTable) }),
    defineTableWidget({ id: 'crm.table.recent-quotes', title: 'crm.dashboard.recentQuotes', domain: 'crm', span: 2, defaultOrder: 21, surfaces: ['plugin-home'], component: withCtx(RecentQuotesTable) }),
  ]
}
