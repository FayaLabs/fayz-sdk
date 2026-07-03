import * as React from 'react'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { useTranslation } from '@fayz-ai/core'
import { KpiCard, defineKpiWidget } from '@fayz-ai/ui'
import { getCoursesProvider, type FinancialSummary } from '@fayz-ai/courses'
import { formatMoney, formatPercent } from './lib/format'

// Course KPIs contributed to the central admin Dashboard (rendered by
// @fayz-ai/plugin-dashboard's DashboardCanvas, which auto-collects every
// plugin's dashboardWidgets for surface 'home'). Mirrors Kiwify's dashboard.

function useSummary(): FinancialSummary | null {
  const [summary, setSummary] = React.useState<FinancialSummary | null>(null)
  React.useEffect(() => {
    void getCoursesProvider().getFinancialSummary().then(setSummary)
  }, [])
  return summary
}

function RevenueKpi() {
  const t = useTranslation()
  const s = useSummary()
  return <KpiCard label={t('courses.kpi.revenue') || 'Total revenue'} icon="DollarSign" loading={!s} value={s ? formatMoney(s.totalRevenue, s.currency) : undefined} />
}

function SalesKpi() {
  const t = useTranslation()
  const s = useSummary()
  return <KpiCard label={t('courses.kpi.sales') || 'Sales'} icon="TrendingUp" loading={!s} value={s ? String(s.salesCount) : undefined} sub={s ? formatPercent(s.refundRate, 1) + ' ' + (t('courses.kpi.refunds') || 'refunds') : undefined} />
}

function MrrKpi() {
  const t = useTranslation()
  const s = useSummary()
  return <KpiCard label={t('courses.kpi.mrr') || 'MRR'} icon="Repeat" loading={!s} value={s ? formatMoney(s.mrr, s.currency) : undefined} sub={s ? `${s.activeSubscriptions} ${t('courses.kpi.activeSubs') || 'active'}` : undefined} />
}

function FeesKpi() {
  const t = useTranslation()
  const s = useSummary()
  return <KpiCard label={t('courses.kpi.fees') || 'Platform fees'} icon="Percent" loading={!s} value={s ? formatMoney(s.platformFeeTotal, s.currency) : undefined} />
}

export function createCoursesDashboardWidgets(): DashboardWidgetDef[] {
  return [
    defineKpiWidget({ id: 'courses.kpi.revenue', title: 'courses.kpi.revenue', domain: 'courses', defaultOrder: 0, component: RevenueKpi }),
    defineKpiWidget({ id: 'courses.kpi.sales', title: 'courses.kpi.sales', domain: 'courses', defaultOrder: 1, component: SalesKpi }),
    defineKpiWidget({ id: 'courses.kpi.mrr', title: 'courses.kpi.mrr', domain: 'courses', defaultOrder: 2, component: MrrKpi }),
    defineKpiWidget({ id: 'courses.kpi.fees', title: 'courses.kpi.fees', domain: 'courses', defaultOrder: 3, component: FeesKpi }),
  ]
}
