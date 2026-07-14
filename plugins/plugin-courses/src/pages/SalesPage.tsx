import * as React from 'react'
import { Badge } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { getCoursesProvider, type Order, type FinancialStatus } from '@fayz-ai/courses'
import { PageContainer, StatCard, StatGrid, SimpleTable, type SimpleColumn } from '../components/CommerceUI'
import { formatMoney, formatDate } from '../lib/format'

function statusVariant(s: FinancialStatus): 'success' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'paid') return 'success'
  if (s === 'pending') return 'secondary'
  if (s === 'refunded' || s === 'chargeback') return 'destructive'
  return 'outline'
}

export function SalesPage() {
  const t = useTranslation()
  const [orders, setOrders] = React.useState<Order[] | null>(null)

  React.useEffect(() => {
    void getCoursesProvider().listOrders().then(setOrders)
  }, [])

  const paid = (orders ?? []).filter((o) => o.financialStatus === 'paid')
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const currency = orders?.[0]?.currency ?? 'BRL'

  const columns: SimpleColumn<Order>[] = [
    { key: 'date', header: t('courses.sales.date') || 'Date', render: (o) => <span className="text-muted-foreground">{formatDate(o.createdAt)}</span> },
    { key: 'customer', header: t('courses.sales.customer') || 'Customer', render: (o) => (
      <div>
        <div className="font-medium text-foreground">{o.customerName ?? '—'}</div>
        <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
      </div>
    ) },
    { key: 'method', header: t('courses.sales.method') || 'Method', render: (o) => <span className="capitalize">{o.paymentMethod ?? '—'}</span> },
    { key: 'status', header: t('courses.sales.status') || 'Status', render: (o) => (
      <Badge variant={statusVariant(o.financialStatus)}>{t(`courses.financialStatus.${o.financialStatus}`) || o.financialStatus}</Badge>
    ) },
    { key: 'fee', header: t('courses.sales.fee') || 'Platform fee', align: 'right', render: (o) => <span className="text-muted-foreground">{formatMoney(o.platformFee, o.currency)}</span> },
    { key: 'total', header: t('courses.sales.amount') || 'Amount', align: 'right', render: (o) => <span className="font-medium text-foreground">{formatMoney(o.total, o.currency)}</span> },
  ]

  return (
    <PageContainer title={t('courses.sales.title') || 'Sales'} subtitle={t('courses.sales.subtitle') || 'Every transaction across your courses.'}>
      <StatGrid>
        <StatCard label={t('courses.sales.count') || 'Sales'} value={String(paid.length)} />
        <StatCard label={t('courses.sales.revenue') || 'Revenue'} value={formatMoney(revenue, currency)} />
      </StatGrid>
      <SimpleTable
        columns={columns}
        rows={orders ?? []}
        empty={t('courses.sales.empty') || 'No sales yet.'}
      />
    </PageContainer>
  )
}
SalesPage.displayName = 'SalesPage'
