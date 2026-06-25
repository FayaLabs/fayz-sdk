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
import type { DateRange, Invoice } from '../types'

type SummaryPeriod = 'week' | 'month' | 'total'

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function rangeForPeriod(period: SummaryPeriod): DateRange {
  const today = new Date()
  if (period === 'total') return { from: '0001-01-01', to: '9999-12-31' }
  if (period === 'week') {
    const monday = new Date(today)
    const day = monday.getDay()
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    return { from: formatDateKey(monday), to: formatDateKey(sunday) }
  }
  return {
    from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    to: formatDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  }
}

function periodLabel(t: ReturnType<typeof useTranslation>, period: SummaryPeriod): string {
  if (period === 'week') return t('financial.summary.weeklyFlow')
  if (period === 'total') return t('financial.summary.totalFlow')
  return t('financial.summary.monthlyFlow')
}

function useEnsureSummary() {
  const fetchSummary = useFinancialStore((s) => s.fetchSummary)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  const period = useFinancialStore((s) => s.summaryPeriod)
  const bankAccountId = useFinancialStore((s) => s.summaryBankAccountId)
  useEffect(() => { void fetchBankAccounts() }, [fetchBankAccounts])
  useEffect(() => { void fetchSummary(rangeForPeriod(period)) }, [fetchSummary, period, bankAccountId])
}

function SummaryControls() {
  const t = useTranslation()
  const period = useFinancialStore((s) => s.summaryPeriod)
  const setPeriod = useFinancialStore((s) => s.setSummaryPeriod)
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const bankAccountId = useFinancialStore((s) => s.summaryBankAccountId)
  const setBankAccountId = useFinancialStore((s) => s.setSummaryBankAccountId)
  const activeAccount = bankAccounts.find((account) => account.id === bankAccountId)
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted"
        value={bankAccountId ?? ''}
        onChange={(event) => setBankAccountId(event.target.value || undefined)}
        aria-label={t('financial.summary.accountFilter')}
      >
        <option value="">{t('financial.summary.allAccounts')}</option>
        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
      <div className="flex gap-1" role="group" aria-label={t('financial.summary.flowPeriod')}>
        {(['week', 'month', 'total'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPeriod(option)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${period === option ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            {t(`financial.summary.period.${option}`)}
          </button>
        ))}
      </div>
      {activeAccount && <span className="w-full text-right text-[11px] text-muted-foreground">{t('financial.summary.filteredBy', { account: activeAccount.name })}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

function TotalBalanceKpi() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  const bankAccountId = useFinancialStore((s) => s.summaryBankAccountId)
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const loading = useFinancialStore((s) => s.summaryLoading)
  useEnsureSummary()
  const account = bankAccounts.find((item) => item.id === bankAccountId)
  return <KpiCard label={t('financial.summary.totalBalance')} icon="Wallet" value={formatCurrency(summary?.totalBalance ?? 0, currency)} sub={loading ? undefined : (account?.name ?? t('financial.summary.allAccounts'))} />
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
  const period = useFinancialStore((s) => s.summaryPeriod)
  useEnsureSummary()
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0
  return <KpiCard label={periodLabel(t, period)} icon="BarChart3" value={formatCurrency(inflow - outflow, currency)} sub={inflow >= outflow ? t('financial.summary.positiveBalance') : t('financial.summary.negativeBalance')} />
}

// ---------------------------------------------------------------------------
// Cash flow (recharts) + breakdown + overdue alerts
// ---------------------------------------------------------------------------

function CashFlowChart() {
  const t = useTranslation()
  const summary = useFinancialStore((s) => s.summary)
  const period = useFinancialStore((s) => s.summaryPeriod)
  useEnsureSummary()
  const data = [{ name: periodLabel(t, period), income: summary?.monthlyInflow ?? 0, expenses: summary?.monthlyOutflow ?? 0 }]
  return (
    <div className="space-y-2">
      <SummaryControls />
      <ChartWidget
        type="bar" title={t('financial.summary.cashFlow')} icon="BarChart3" categoryKey="name" data={data}
        series={[
          { dataKey: 'income', label: t('financial.summary.income'), color: 'hsl(var(--success))' },
          { dataKey: 'expenses', label: t('financial.summary.expenses'), color: 'hsl(var(--destructive))' },
        ]}
      />
    </div>
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
