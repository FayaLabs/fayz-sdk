import * as React from 'react'
import { Badge, Button, toast } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { getCoursesProvider, type Payout, type FinancialSummary, type CreatorAccount } from '@fayz-ai/courses'
import { PageContainer, StatCard, StatGrid, SimpleTable, type SimpleColumn } from '../components/CommerceUI'
import { formatMoney, formatDate, formatPercent } from '../lib/format'

export function FinancialPage() {
  const t = useTranslation()
  const [summary, setSummary] = React.useState<FinancialSummary | null>(null)
  const [payouts, setPayouts] = React.useState<Payout[] | null>(null)
  const [account, setAccount] = React.useState<CreatorAccount | null>(null)

  React.useEffect(() => {
    const p = getCoursesProvider()
    void p.getFinancialSummary().then(setSummary)
    void p.listPayouts().then(setPayouts)
    void p.getCreatorAccount().then(setAccount)
  }, [])

  const currency = summary?.currency ?? 'BRL'
  const connected = !!account?.stripeAccountId && account.chargesEnabled

  function connectStripe() {
    // Wired to the real Stripe Connect onboarding edge function in Stage 3.
    toast.info(t('courses.financial.connectSoon') || 'Stripe Connect onboarding wires up in Stage 3.')
  }

  const columns: SimpleColumn<Payout>[] = [
    { key: 'date', header: t('courses.financial.date') || 'Date', render: (p) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span> },
    { key: 'amount', header: t('courses.financial.amount') || 'Amount', align: 'right', render: (p) => <span className="font-medium text-foreground">{formatMoney(p.amount, p.currency)}</span> },
    { key: 'status', header: t('courses.financial.status') || 'Status', align: 'right', render: (p) => (
      <Badge variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'secondary' : 'destructive'}>
        {t(`courses.payoutStatus.${p.status}`) || p.status}
      </Badge>
    ) },
  ]

  return (
    <PageContainer
      title={t('courses.financial.title') || 'Financial settings'}
      subtitle={t('courses.financial.subtitle') || 'Balance, payouts and your Stripe connection.'}
      actions={
        <Button variant={connected ? 'outline' : 'default'} onClick={connectStripe}>
          {connected ? (t('courses.financial.connected') || 'Stripe connected') : (t('courses.financial.connect') || 'Connect Stripe')}
        </Button>
      }
    >
      {!connected && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
          {t('courses.financial.notConnected') || 'Connect your Stripe account to receive payouts. The platform fee is applied automatically on each sale.'}
          {account && (
            <span className="ml-1 text-muted-foreground">
              ({t('courses.financial.platformFee') || 'Platform fee'}: {(account.platformFeeBps / 100).toFixed(2)}%)
            </span>
          )}
        </div>
      )}

      <StatGrid>
        <StatCard label={t('courses.financial.available') || 'Available balance'} value={formatMoney(summary?.availableBalance ?? 0, currency)} />
        <StatCard label={t('courses.financial.pending') || 'Pending balance'} value={formatMoney(summary?.pendingBalance ?? 0, currency)} />
        <StatCard label={t('courses.financial.revenue') || 'Total revenue'} value={formatMoney(summary?.totalRevenue ?? 0, currency)} />
        <StatCard label={t('courses.financial.feeCollected') || 'Platform fees'} value={formatMoney(summary?.platformFeeTotal ?? 0, currency)} hint={summary ? formatPercent(summary.refundRate, 1) + ' ' + (t('courses.financial.refundRate') || 'refund rate') : undefined} />
      </StatGrid>

      <h2 className="mb-3 text-sm font-semibold text-foreground">{t('courses.financial.payouts') || 'Payouts'}</h2>
      <SimpleTable
        columns={columns}
        rows={payouts ?? []}
        empty={t('courses.financial.noPayouts') || 'No payouts yet.'}
      />
    </PageContainer>
  )
}
FinancialPage.displayName = 'FinancialPage'
