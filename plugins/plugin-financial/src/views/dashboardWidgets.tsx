import React, { useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, AlertTriangle, CreditCard as CreditCardIcon, Eye, EyeOff } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { StoreApi } from 'zustand'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import {
  KpiCard, ChartWidget, TableWidget, Card, CardHeader, CardTitle, CardContent, GoldCard,
  defineKpiWidget, defineChartWidget, defineCustomWidget, defineTableWidget, useDashboardNavigate,
} from '@fayz-ai/ui'
import { FinancialContextProvider, useFinancialConfig, useFinancialProvider, useFinancialStore, formatCurrency, type ResolvedFinancialConfig } from '../FinancialContext'
import type { FinancialDataProvider } from '../data/types'
import type { FinancialUIState } from '../store'
import type { DateRange, Invoice, FinancialMovement } from '../types'

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

/** Branded balance hero — Saldo + eye-toggle + clickable Entradas/Saídas pills.
 *  Compact band (span-4): tight padding so it never becomes a tall empty block on
 *  desktop. Pills deep-link into the Financeiro module (receivables / payables). */
function BalanceHero() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  const navigate = useDashboardNavigate()
  useEnsureSummary()
  const [hidden, setHidden] = React.useState(false)
  const money = (v: number | null | undefined) => (hidden ? '••••••' : formatCurrency(v ?? 0, currency))
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0
  return (
    <GoldCard branded className="px-5 py-4 text-center md:px-8 md:py-5">
      <p className="text-xs font-medium uppercase tracking-wide opacity-75">{t('financial.home.balance')}</p>
      <div className="mt-0.5 flex items-center justify-center gap-2.5">
        <span className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">{money(summary?.totalBalance)}</span>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? t('financial.home.showBalance') : t('financial.home.hideBalance')}
          className="rounded-full p-1.5 text-primary-foreground/80 transition-colors hover:bg-white/10"
        >
          {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <div className="mx-auto mt-3 grid max-w-lg grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate('/financial/receivables-list')}
          aria-label={t('financial.home.inflow')}
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-left transition-colors hover:bg-white/20"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/90">
            <ArrowUpRight className="h-4 w-4 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide opacity-70">{t('financial.home.inflow')}</span>
            <span className="block truncate text-sm font-semibold tabular-nums">{money(inflow)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/financial/payables-list')}
          aria-label={t('financial.home.outflow')}
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-left transition-colors hover:bg-white/20"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/90">
            <ArrowDownRight className="h-4 w-4 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wide opacity-70">{t('financial.home.outflow')}</span>
            <span className="block truncate text-sm font-semibold tabular-nums">{money(outflow)}</span>
          </span>
        </button>
      </div>
    </GoldCard>
  )
}

// ---------------------------------------------------------------------------
// HOME charts — spend-by-category (donut) + cash-flow (in vs out). Both read the
// same provider/store as the module, so figures stay coherent. surface 'home'
// only (the plugin-home Resumo keeps its own cash-flow chart untouched).
// ---------------------------------------------------------------------------

/** Provider-agnostic expense classifier: maps a movement's label to a spend
 *  bucket by keyword (pt-BR + en). Checked in priority order; first hit wins. */
const SPEND_CATEGORIES: Array<{ key: string; keywords: string[] }> = [
  { key: 'subscriptions', keywords: ['netflix', 'spotify', 'prime video', 'disney', 'hbo', ' max', 'youtube', 'apple', 'assinatura', 'subscription'] },
  { key: 'groceries', keywords: ['supermercado', 'mercado', 'padaria', 'hortifruti', 'feira', 'açougue', 'grocery', 'market'] },
  { key: 'transport', keywords: ['uber', '99', 'taxi', 'posto', 'shell', 'ipiranga', 'combustível', 'gasolina', 'metrô', 'ônibus', 'transport', 'fuel'] },
  { key: 'dining', keywords: ['ifood', 'rappi', 'restaurante', 'outback', 'lanchonete', 'pizzaria', 'café', 'cafeteria', 'mcdonald', 'burger', 'food'] },
  { key: 'home', keywords: ['aluguel', 'condomínio', 'luz', 'enel', 'água', 'sabesp', 'internet', 'vivo', 'claro', 'gás', 'iptu', 'rent', 'utilit'] },
  { key: 'health', keywords: ['farmácia', 'farmacia', 'drogasil', 'drogaria', 'academia', 'smartfit', 'clínica', 'hospital', 'médico', 'saúde', 'gym', 'fitness', 'health', 'pharmac'] },
  { key: 'leisure', keywords: ['cinema', 'cinemark', 'ingresso', 'show', 'teatro', 'viagem', 'hotel', 'steam', 'leisure'] },
  { key: 'shopping', keywords: ['amazon', 'magalu', 'shopee', 'aliexpress', 'loja', 'shopping', 'zara', 'renner', 'store'] },
]

function categorizeSpend(notes: string | undefined): string {
  const s = (notes ?? '').toLowerCase()
  for (const c of SPEND_CATEGORIES) if (c.keywords.some((k) => s.includes(k))) return c.key
  return 'other'
}

/** "Gastos por categoria" — realized expenses grouped into a donut. */
function SpendByCategoryChart() {
  const t = useTranslation()
  const provider = useFinancialProvider()
  const [rows, setRows] = React.useState<Array<{ name: string; value: number }>>([])
  useEffect(() => {
    let alive = true
    void (async () => {
      const res = await provider.getMovements({ status: 'paid', direction: 'debit' })
      if (!alive) return
      const totals = new Map<string, number>()
      for (const m of res.data) {
        if (m.movementKind === 'transfer') continue
        const key = categorizeSpend(m.notes)
        totals.set(key, (totals.get(key) ?? 0) + (m.paidAmount || m.amount))
      }
      setRows(
        [...totals.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => ({ name: t(`financial.home.category.${key}`), value: Math.round(value * 100) / 100 })),
      )
    })()
    return () => { alive = false }
  }, [provider])
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{t('financial.home.spendByCategory')}</CardTitle></CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          {t('financial.home.noSpend')}
        </CardContent>
      </Card>
    )
  }
  return (
    <ChartWidget
      type="pie" title={t('financial.home.spendByCategory')} icon="PieChart" categoryKey="name" data={rows}
      series={[{ dataKey: 'value', label: t('financial.home.spendByCategory') }]}
    />
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

    // FINANCE-HOME surface (B2C phone-first dashboard) — a compact analytical
    // layout: hero band → charts row (spend-by-category + cash-flow) → bills +
    // cards. This is a dedicated consumer surface (norman-ai's money screen), NOT
    // the universal B2B 'home': a full-bleed balance hero and credit-card tiles
    // are personal-finance chrome that would leak into every app that merely
    // enables plugin-financial (e.g. the beauty-saas Painel). Apps that want them
    // opt in explicitly by rendering <DashboardCanvas surface="finance-home">.
    defineCustomWidget({ id: 'financial.hero.balance', title: 'financial.home.balance', domain: 'financial', span: 4, defaultOrder: 0, surfaces: ['finance-home'], component: withCtx(BalanceHero) }),
    defineChartWidget({ id: 'financial.chart.spend-by-category', title: 'financial.home.spendByCategory', domain: 'financial', span: 2, defaultOrder: 1, surfaces: ['finance-home'], component: withCtx(SpendByCategoryChart) }),
    defineChartWidget({ id: 'financial.chart.cash-flow-home', title: 'financial.summary.cashFlow', domain: 'financial', span: 2, defaultOrder: 2, surfaces: ['finance-home'], component: withCtx(CashFlowChart) }),
    defineCustomWidget({ id: 'financial.list.upcoming-bills', title: 'financial.home.upcomingBills', domain: 'financial', span: 2, defaultOrder: 3, surfaces: ['finance-home'], component: withCtx(UpcomingBills) }),
    defineCustomWidget({ id: 'financial.cards', title: 'financial.home.cards', domain: 'financial', span: 2, defaultOrder: 4, surfaces: ['finance-home'], component: withCtx(CreditCards) }),
  ]
}
