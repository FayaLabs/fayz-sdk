import React, { useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreApi } from 'zustand'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import {
  KpiCard, ChartWidget, TableWidget, Card, CardHeader, CardTitle, CardContent,
  defineKpiWidget, defineChartWidget, defineCustomWidget, defineTableWidget,
} from '@fayz-ai/ui'
import { FinancialContextProvider, useFinancialConfig, useFinancialStore, formatCurrency, type ResolvedFinancialConfig } from '../FinancialContext'
import type { FinancialDataProvider } from '../data/types'
import type { FinancialUIState } from '../store'
import type { Invoice } from '../types'

function useEnsureSummary() {
  const fetchSummary = useFinancialStore((s) => s.fetchSummary)
  useEffect(() => { void fetchSummary() }, [])
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

function TotalBalanceKpi() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  const loading = useFinancialStore((s) => s.summaryLoading)
  useEnsureSummary()
  return <KpiCard label={t('financial.summary.totalBalance')} icon="Wallet" value={formatCurrency(summary?.totalBalance ?? 0, currency)} sub={loading ? undefined : t('financial.summary.allAccounts')} />
}

function ReceivableKpi() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  return <KpiCard label={t('financial.summary.receivable')} icon="TrendingUp" value={formatCurrency(summary?.totalReceivable ?? 0, currency)} sub={t('financial.summary.overdue', { count: String(summary?.overdueReceivableCount ?? 0) })} />
}

function PayableKpi() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  return <KpiCard label={t('financial.summary.payable')} icon="TrendingDown" value={formatCurrency(summary?.totalPayable ?? 0, currency)} sub={t('financial.summary.overdue', { count: String(summary?.overduePayableCount ?? 0) })} />
}

function MonthlyFlowKpi() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0
  return <KpiCard label={t('financial.summary.monthlyFlow')} icon="BarChart3" value={formatCurrency(inflow - outflow, currency)} sub={inflow >= outflow ? t('financial.summary.positiveBalance') : t('financial.summary.negativeBalance')} />
}

// ---------------------------------------------------------------------------
// Cash flow (recharts) + breakdown + overdue alerts
// ---------------------------------------------------------------------------

function CashFlowChart() {
  const t = useTranslation()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  const data = [{ name: t('financial.summary.cashFlow'), income: summary?.monthlyInflow ?? 0, expenses: summary?.monthlyOutflow ?? 0 }]
  return (
    <ChartWidget
      type="bar" title={t('financial.summary.cashFlow')} icon="BarChart3" categoryKey="name" data={data}
      series={[
        { dataKey: 'income', label: t('financial.summary.income'), color: 'hsl(var(--success))' },
        { dataKey: 'expenses', label: t('financial.summary.expenses'), color: 'hsl(var(--destructive))' },
      ]}
    />
  )
}

function CashFlowBreakdown() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0
  const total = Math.max(inflow + outflow, 1)
  return (
    <Card>
      <CardHeader><CardTitle>{t('financial.summary.cashFlowBreakdown')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" />{t('financial.summary.received')}</span>
            <span className="font-medium">{formatCurrency(inflow, currency)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${(inflow / total) * 100}%` }} /></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-destructive" />{t('financial.summary.paid')}</span>
            <span className="font-medium">{formatCurrency(outflow, currency)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-destructive" style={{ width: `${(outflow / total) * 100}%` }} /></div>
        </div>
        <div className="border-t pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('financial.summary.net')}</span>
            <span className={`font-semibold ${inflow - outflow >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(inflow - outflow, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OverdueAlerts() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  const items = [
    { label: t('financial.summary.overdueReceivable'), value: summary?.overdueReceivableAmount ?? 0, count: summary?.overdueReceivableCount ?? 0, Icon: ArrowUpRight, color: 'text-warning' },
    { label: t('financial.summary.overduePayable'), value: summary?.overduePayableAmount ?? 0, count: summary?.overduePayableCount ?? 0, Icon: ArrowDownRight, color: 'text-destructive' },
  ]
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />{t('financial.summary.overdueTitle')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2"><item.Icon className={`h-3.5 w-3.5 ${item.color}`} /><span className="text-sm text-muted-foreground">{item.label}</span></div>
            <span className="text-sm font-semibold">{formatCurrency(item.value, currency)}</span>
          </div>
        ))}
        {items.every((i) => i.count === 0) ? <p className="border-t pt-3 text-xs text-muted-foreground">{t('financial.summary.noOverdue')}</p> : null}
      </CardContent>
    </Card>
  )
}

function RecentTransactions() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const invoices = useFinancialStore((s) => s.invoices)
  const fetchInvoices = useFinancialStore((s) => s.fetchInvoices)
  useEffect(() => { void fetchInvoices({ pageSize: 5 }) }, [])
  const columns: ColumnDef<Invoice, unknown>[] = [
    { accessorKey: 'contactName', header: t('financial.summary.recentTransactions'), cell: ({ row }) => <span className="font-medium">{row.original.contactName || 'Unknown'}</span> },
    { id: 'date', header: '', cell: ({ row }) => <span className="text-xs capitalize text-muted-foreground">{row.original.direction} · {row.original.invoiceDate}</span> },
    { accessorKey: 'totalAmount', header: '', cell: ({ row }) => (
      <span className={`font-semibold ${row.original.direction === 'credit' ? 'text-success' : 'text-destructive'}`}>
        {row.original.direction === 'credit' ? '+' : '-'}{formatCurrency(row.original.totalAmount, currency)}
      </span>
    ) },
  ]
  return <TableWidget title={t('financial.summary.recentTransactions')} icon="CircleDollarSign" columns={columns} data={invoices.slice(0, 5)} emptyMessage={t('financial.summary.noTransactions')} />
}

// ---------------------------------------------------------------------------
// Registry builder
// ---------------------------------------------------------------------------

export function createFinancialDashboardWidgets(ctx: {
  config: ResolvedFinancialConfig
  provider: FinancialDataProvider
  store: StoreApi<FinancialUIState>
}): DashboardWidgetDef[] {
  const withCtx = (Inner: React.ComponentType): React.ComponentType<unknown> => {
    const Wrapped = () => (
      <FinancialContextProvider config={ctx.config} provider={ctx.provider} store={ctx.store}>
        <Inner />
      </FinancialContextProvider>
    )
    Wrapped.displayName = `FinancialWidget(${Inner.displayName ?? Inner.name})`
    return Wrapped
  }

  return [
    // Total balance is finance's headline KPI on the global home; the rest are
    // home-hidden by default (shown on the financial plugin-home, addable via Customize).
    defineKpiWidget({ id: 'financial.kpi.total-balance', title: 'financial.summary.totalBalance', domain: 'financial', defaultOrder: 0, component: withCtx(TotalBalanceKpi) }),
    defineKpiWidget({ id: 'financial.kpi.receivable', title: 'financial.summary.receivable', domain: 'financial', defaultOrder: 1, defaultVisible: false, component: withCtx(ReceivableKpi) }),
    defineKpiWidget({ id: 'financial.kpi.payable', title: 'financial.summary.payable', domain: 'financial', defaultOrder: 2, defaultVisible: false, component: withCtx(PayableKpi) }),
    defineKpiWidget({ id: 'financial.kpi.monthly-flow', title: 'financial.summary.monthlyFlow', domain: 'financial', defaultOrder: 3, defaultVisible: false, component: withCtx(MonthlyFlowKpi) }),
    defineChartWidget({ id: 'financial.chart.cash-flow', title: 'financial.summary.cashFlow', domain: 'financial', span: 2, defaultOrder: 10, surfaces: ['plugin-home'], component: withCtx(CashFlowChart) }),
    defineCustomWidget({ id: 'financial.panel.breakdown', title: 'financial.summary.cashFlowBreakdown', domain: 'financial', span: 1, defaultOrder: 11, surfaces: ['plugin-home'], component: withCtx(CashFlowBreakdown) }),
    defineCustomWidget({ id: 'financial.panel.overdue', title: 'financial.summary.overdueTitle', domain: 'financial', span: 1, defaultOrder: 12, surfaces: ['plugin-home'], component: withCtx(OverdueAlerts) }),
    defineTableWidget({ id: 'financial.table.recent', title: 'financial.summary.recentTransactions', domain: 'financial', span: 4, defaultOrder: 20, surfaces: ['plugin-home'], component: withCtx(RecentTransactions) }),
  ]
}
