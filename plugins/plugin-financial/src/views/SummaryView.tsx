import React, { useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle, BarChart3, CircleDollarSign } from 'lucide-react'
import { useFinancialConfig, useFinancialStore, formatCurrency } from '../FinancialContext'
import { useTranslation } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string; subtitle: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cash flow breakdown
// ---------------------------------------------------------------------------

function CashFlowBreakdown() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  const inflow = summary?.monthlyInflow ?? 0
  const outflow = summary?.monthlyOutflow ?? 0
  const total = Math.max(inflow + outflow, 1)

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5 h-full">
      <h3 className="text-sm font-semibold mb-1">{t('financial.summary.cashFlowBreakdown')}</h3>
      <p className="text-xs text-muted-foreground mb-4">{t('financial.summary.cashFlowBreakdownSubtitle')}</p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" />{t('financial.summary.received')}
            </span>
            <span className="font-medium">{formatCurrency(inflow, currency)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(inflow / total) * 100}%` }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-destructive" />{t('financial.summary.paid')}
            </span>
            <span className="font-medium">{formatCurrency(outflow, currency)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-destructive transition-all" style={{ width: `${(outflow / total) * 100}%` }} />
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('financial.summary.net')}</span>
            <span className={`font-semibold ${inflow - outflow >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(inflow - outflow, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overdue alerts
// ---------------------------------------------------------------------------

function OverdueAlerts() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)

  const items = [
    { label: t('financial.summary.overdueReceivable'), value: summary?.overdueReceivableAmount ?? 0, count: summary?.overdueReceivableCount ?? 0, icon: ArrowUpRight, color: 'text-warning' },
    { label: t('financial.summary.overduePayable'), value: summary?.overduePayableAmount ?? 0, count: summary?.overduePayableCount ?? 0, icon: ArrowDownRight, color: 'text-destructive' },
  ]

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold">{t('financial.summary.overdueTitle')}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(item.value, currency)}</span>
          </div>
        ))}
      </div>
      {items.every((i) => i.count === 0) && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{t('financial.summary.noOverdue')}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cash flow chart
// ---------------------------------------------------------------------------

function CashFlowChart() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{t('financial.summary.cashFlow')}</h3>
          <p className="text-xs text-muted-foreground">{t('financial.summary.cashFlowSubtitle')}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />{t('financial.summary.income')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive/80" />{t('financial.summary.expenses')}</span>
        </div>
      </div>
      <div className="flex-1 min-h-[11rem] flex items-end gap-3 px-2">
        {months.map((month) => (
          <div key={month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '140px' }}>
              <div className="w-3 rounded-t bg-success/30" style={{ height: '4px' }} />
              <div className="w-3 rounded-t bg-destructive/30" style={{ height: '4px' }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{month}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent transactions
// ---------------------------------------------------------------------------

function RecentTransactions() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const invoices = useFinancialStore((s) => s.invoices)

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{t('financial.summary.recentTransactions')}</h3>
        <button className="text-xs text-primary hover:underline">{t('financial.summary.viewAll')}</button>
      </div>
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-2">
            <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t('financial.summary.noTransactions')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('financial.summary.transactionsAppear')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{inv.contactName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground capitalize">{inv.direction} &middot; {inv.invoiceDate}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${inv.direction === 'credit' ? 'text-success' : 'text-destructive'}`}>
                  {inv.direction === 'credit' ? '+' : '-'}{formatCurrency(inv.totalAmount, currency)}
                </span>
                <p className="text-[10px] text-muted-foreground capitalize">{inv.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary view
// ---------------------------------------------------------------------------

export function SummaryView() {
  const t = useTranslation()
  const { currency } = useFinancialConfig()
  const summary = useFinancialStore((s) => s.summary)
  const summaryLoading = useFinancialStore((s) => s.summaryLoading)
  const fetchSummary = useFinancialStore((s) => s.fetchSummary)
  const fetchInvoices = useFinancialStore((s) => s.fetchInvoices)

  useEffect(() => {
    fetchSummary()
    fetchInvoices({ pageSize: 5 })
  }, [])

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('financial.summary.totalBalance')}
          value={formatCurrency(summary?.totalBalance ?? 0, currency)}
          subtitle={summaryLoading ? t('agenda.confirmations.loading') : t('financial.summary.allAccounts')}
          icon={Wallet}
          color="bg-magic/15 text-magic dark:bg-magic/20"
        />
        <StatCard
          label={t('financial.summary.receivable')}
          value={formatCurrency(summary?.totalReceivable ?? 0, currency)}
          subtitle={t('financial.summary.overdue', { count: String(summary?.overdueReceivableCount ?? 0) })}
          icon={TrendingUp}
          color="bg-success-soft text-success-soft-foreground"
        />
        <StatCard
          label={t('financial.summary.payable')}
          value={formatCurrency(summary?.totalPayable ?? 0, currency)}
          subtitle={t('financial.summary.overdue', { count: String(summary?.overduePayableCount ?? 0) })}
          icon={TrendingDown}
          color="bg-destructive-soft text-destructive-soft-foreground"
        />
        <StatCard
          label={t('financial.summary.monthlyFlow')}
          value={formatCurrency((summary?.monthlyInflow ?? 0) - (summary?.monthlyOutflow ?? 0), currency)}
          subtitle={(summary?.monthlyInflow ?? 0) >= (summary?.monthlyOutflow ?? 0) ? t('financial.summary.positiveBalance') : t('financial.summary.negativeBalance')}
          icon={BarChart3}
          color="bg-info/15 text-info dark:bg-info/20"
        />
      </div>

      {/* Middle row */}
      <div className="grid gap-4 lg:grid-cols-3 items-stretch">
        <div className="lg:col-span-2 flex">
          <div className="flex-1"><CashFlowChart /></div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex-1"><CashFlowBreakdown /></div>
          <div className="flex-1"><OverdueAlerts /></div>
        </div>
      </div>

      {/* Recent transactions */}
      <RecentTransactions />
    </div>
  )
}
