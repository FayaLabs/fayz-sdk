import React, { useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, AlertTriangle, CreditCard as CreditCardIcon, Eye, EyeOff } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreApi } from 'zustand'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import {
  KpiCard, ChartWidget, TableWidget, Card, CardHeader, CardTitle, CardContent, GoldCard,
  defineKpiWidget, defineChartWidget, defineCustomWidget, defineTableWidget,
} from '@fayz-ai/ui'
import { FinancialContextProvider, useFinancialConfig, useFinancialProvider, useFinancialStore, formatCurrency, type ResolvedFinancialConfig } from '../FinancialContext'
import type { FinancialDataProvider } from '../data/types'
import type { FinancialUIState } from '../store'
import type { Invoice, FinancialMovement } from '../types'

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
// HOME surface (B2C) — a phone-first money dashboard that reflows into cells on
// desktop. These render on surface="home" only; the plugin-home Resumo widgets
// above are untouched. Same store/provider, so figures match the Financeiro
// module (FAY-1233 mobile-summary logic, generalized into reusable widgets).
// ---------------------------------------------------------------------------

/** Human "due in N days" label from a YYYY-MM-DD due date. */
function useDueLabel() {
  const t = useTranslation()
  return (dueDate: string): string => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(`${dueDate}T00:00:00`)
    const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
    if (days < 0) return t('financial.home.overdueDays', { count: String(Math.abs(days)) })
    if (days === 0) return t('financial.home.dueToday')
    if (days === 1) return t('financial.home.dueTomorrow')
    return t('financial.home.dueInDays', { count: String(days) })
  }
}

/** Branded balance hero — big Saldo + eye-toggle + Entradas/Saídas pills. */
function BalanceHero() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  useEnsureSummary()
  const [hidden, setHidden] = React.useState(false)
  const money = (v: number | null | undefined) => (hidden ? '••••••' : formatCurrency(v ?? 0, currency))
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0
  return (
    <GoldCard branded className="px-6 py-7 text-center md:px-10 md:py-9">
      <p className="text-sm font-medium opacity-80">{t('financial.home.balance')}</p>
      <div className="mt-1 flex items-center justify-center gap-3">
        <span className="text-4xl font-bold tracking-tight tabular-nums md:text-5xl">{money(summary?.totalBalance)}</span>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? t('financial.home.showBalance') : t('financial.home.hideBalance')}
          className="rounded-full p-1.5 text-primary-foreground/80 transition-colors hover:bg-white/10"
        >
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/90">
            <ArrowUpRight className="h-4 w-4 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide opacity-70">{t('financial.home.inflow')}</span>
            <span className="block truncate text-sm font-semibold tabular-nums">{money(inflow)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/90">
            <ArrowDownRight className="h-4 w-4 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide opacity-70">{t('financial.home.outflow')}</span>
            <span className="block truncate text-sm font-semibold tabular-nums">{money(outflow)}</span>
          </span>
        </div>
      </div>
    </GoldCard>
  )
}

/** "Próximas contas" — pending payable bills, soonest due first. */
function UpcomingBills() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const provider = useFinancialProvider()
  const dueLabel = useDueLabel()
  const [bills, setBills] = React.useState<FinancialMovement[]>([])
  useEffect(() => {
    let alive = true
    void (async () => {
      const pending = await provider.getMovements({ status: 'pending' })
      if (!alive) return
      setBills(
        pending.data
          .filter((m) => m.direction === 'debit' && m.movementKind === 'bill')
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      )
    })()
    return () => { alive = false }
  }, [provider])
  return (
    <GoldCard className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-sm font-semibold text-foreground">{t('financial.home.upcomingBills')}</h2>
      </div>
      <div className="mt-3">
        {bills.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">{t('financial.home.noBills')}</div>
        ) : (
          bills.map((bill, i) => (
            <div key={bill.id} className={'flex items-center justify-between px-4 py-3.5' + (i > 0 ? ' border-t border-border' : '')}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{bill.notes ?? t('financial.home.bill')}</p>
                <p className="text-xs text-muted-foreground">{dueLabel(bill.dueDate)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(bill.amount - bill.paidAmount, currency)}
              </span>
            </div>
          ))
        )}
      </div>
    </GoldCard>
  )
}

/** "Cartões" — credit-card accounts with current bill + available limit. */
function CreditCards() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const bankAccounts = useFinancialStore((s) => s.bankAccounts)
  const fetchBankAccounts = useFinancialStore((s) => s.fetchBankAccounts)
  useEffect(() => { void fetchBankAccounts() }, [])
  const cards = bankAccounts.filter((a) => a.accountType === 'credit_card')
  return (
    <GoldCard className="bg-transparent border-0 p-0 shadow-none">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t('financial.home.cards')}</h2>
      <div className="space-y-3">
        {cards.map((card) => {
          const fatura = Math.abs(Math.min(0, card.currentBalance))
          const limite = Math.max(0, (card.creditLimit ?? 0) - fatura)
          return (
            <div key={card.id} className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-4 text-white shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{card.bankName ?? card.name}</span>
                <CreditCardIcon className="h-5 w-5 opacity-80" />
              </div>
              <p className="mt-6 text-[11px] uppercase tracking-wide opacity-70">{t('financial.home.currentBill')}</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(fatura, currency)}</p>
              <p className="mt-2 text-[11px] opacity-70">{t('financial.home.availableLimit')} {formatCurrency(limite, currency)}</p>
            </div>
          )
        })}
        {cards.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border py-6 text-sm font-medium text-muted-foreground">
            + {t('financial.home.addCard')}
          </div>
        ) : null}
      </div>
    </GoldCard>
  )
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

    // HOME surface (B2C phone-first dashboard). Only these three appear on the
    // global home; they reflow into cells on desktop via the responsive grid.
    defineCustomWidget({ id: 'financial.hero.balance', title: 'financial.home.balance', domain: 'financial', span: 4, defaultOrder: 0, surfaces: ['home'], component: withCtx(BalanceHero) }),
    defineCustomWidget({ id: 'financial.list.upcoming-bills', title: 'financial.home.upcomingBills', domain: 'financial', span: 2, defaultOrder: 2, surfaces: ['home'], component: withCtx(UpcomingBills) }),
    defineCustomWidget({ id: 'financial.cards', title: 'financial.home.cards', domain: 'financial', span: 2, defaultOrder: 3, surfaces: ['home'], component: withCtx(CreditCards) }),
  ]
}
