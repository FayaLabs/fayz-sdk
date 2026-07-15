import * as React from 'react'
import { Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { getCoursesProvider, type Subscription, type SubscriptionStatus } from '@fayz-ai/courses'
import { PageContainer, StatCard, StatGrid, SimpleTable, type SimpleColumn } from '../components/CommerceUI'
import { formatMoney, formatDate } from '../lib/format'

function statusVariant(s: SubscriptionStatus): 'success' | 'secondary' | 'destructive' {
  if (s === 'active') return 'success'
  if (s === 'past_due') return 'secondary'
  return 'destructive'
}

export function SubscriptionsPage() {
  const t = useTranslation()
  const [subs, setSubs] = React.useState<Subscription[] | null>(null)

  React.useEffect(() => {
    void getCoursesProvider().listSubscriptions().then(setSubs)
  }, [])

  const active = (subs ?? []).filter((s) => s.status === 'active')
  const mrr = active.reduce((sum, s) => sum + (s.interval === 'year' ? s.netValue / 12 : s.netValue), 0)
  const currency = subs?.[0]?.currency ?? 'BRL'

  const columns: SimpleColumn<Subscription>[] = [
    { key: 'start', header: t('courses.subs.start') || 'Start date', render: (s) => <span className="text-muted-foreground">{formatDate(s.startedAt)}</span> },
    { key: 'customer', header: t('courses.subs.customer') || 'Customer', render: (s) => (
      <div>
        <div className="font-medium text-foreground">{s.customerName ?? '—'}</div>
        <div className="text-xs text-muted-foreground">{s.customerEmail}</div>
      </div>
    ) },
    { key: 'status', header: t('courses.subs.status') || 'Status', render: (s) => (
      <Badge variant={statusVariant(s.status)}>{t(`courses.subStatus.${s.status}`) || s.status}</Badge>
    ) },
    { key: 'value', header: t('courses.subs.value') || 'Net value', align: 'right', render: (s) => (
      <span className="font-medium text-foreground">{formatMoney(s.netValue, s.currency)}<span className="text-xs text-muted-foreground"> / {t(`courses.interval.${s.interval}`) || s.interval}</span></span>
    ) },
  ]

  return (
    <PageContainer title={t('courses.subs.title') || 'Subscriptions'} subtitle={t('courses.subs.subtitle') || 'Recurring plans and MRR.'}>
      <StatGrid>
        <StatCard label={t('courses.subs.active') || 'Active subscriptions'} value={String(active.length)} />
        <StatCard label={t('courses.subs.mrr') || 'Monthly recurring revenue'} value={formatMoney(mrr, currency)} />
      </StatGrid>
      <SimpleTable
        columns={columns}
        rows={subs ?? []}
        empty={t('courses.subs.empty') || 'No subscriptions yet.'}
      />
    </PageContainer>
  )
}
SubscriptionsPage.displayName = 'SubscriptionsPage'
