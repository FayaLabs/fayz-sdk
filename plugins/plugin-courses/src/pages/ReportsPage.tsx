import * as React from 'react'
import { useTranslation } from '@fayz-ai/core'
import { getCoursesProvider, type Order, type Course } from '@fayz-ai/courses'
import { PageContainer, SimpleTable, type SimpleColumn } from '../components/CommerceUI'
import { formatMoney } from '../lib/format'

interface Row {
  courseId: string
  title: string
  sales: number
  revenue: number
  currency: string
}

export function ReportsPage() {
  const t = useTranslation()
  const [rows, setRows] = React.useState<Row[] | null>(null)

  React.useEffect(() => {
    const p = getCoursesProvider()
    void Promise.all([p.listCourses(), p.listOrders({ financialStatus: 'paid' })]).then(([courses, orders]) => {
      setRows(buildRevenueByCourse(courses, orders))
    })
  }, [])

  const columns: SimpleColumn<Row>[] = [
    { key: 'title', header: t('courses.reports.course') || 'Course', render: (r) => <span className="font-medium text-foreground">{r.title}</span> },
    { key: 'sales', header: t('courses.reports.sales') || 'Sales', align: 'right', render: (r) => <span>{r.sales}</span> },
    { key: 'revenue', header: t('courses.reports.revenue') || 'Revenue', align: 'right', render: (r) => <span className="font-medium text-foreground">{formatMoney(r.revenue, r.currency)}</span> },
  ]

  return (
    <PageContainer title={t('courses.reports.title') || 'Reports'} subtitle={t('courses.reports.subtitle') || 'Revenue by course.'}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{t('courses.reports.byCourse') || 'Revenue by course'}</h2>
      <SimpleTable
        columns={columns}
        rows={rows ?? []}
        empty={t('courses.reports.empty') || 'No revenue yet.'}
      />
    </PageContainer>
  )
}
ReportsPage.displayName = 'ReportsPage'

function buildRevenueByCourse(courses: Course[], orders: Order[]): Row[] {
  const byCourse = new Map<string, { sales: number; revenue: number; currency: string }>()
  for (const o of orders) {
    const agg = byCourse.get(o.courseId) ?? { sales: 0, revenue: 0, currency: o.currency }
    agg.sales += 1
    agg.revenue = Math.round((agg.revenue + o.total) * 100) / 100
    byCourse.set(o.courseId, agg)
  }
  return courses
    .map((c) => {
      const agg = byCourse.get(c.id)
      return { courseId: c.id, title: c.title, sales: agg?.sales ?? 0, revenue: agg?.revenue ?? 0, currency: agg?.currency ?? c.currency }
    })
    .sort((a, b) => b.revenue - a.revenue)
}
