import * as React from 'react'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import {
  KpiCard,
  OnboardingWidget,
  defineKpiWidget,
  defineCustomWidget,
  defineOnboardingWidget,
  useDashboardNavigate,
  type KpiCurrency,
  type OnboardingStepInput,
} from '@fayz-ai/ui'
import type { DashboardMetric, DashboardSection, OnboardingStep } from './types'

const DOMAIN = 'dashboard'

/** Legacy DashboardMetric[] → KPI widgets (async compute via the shared KpiCard). */
export function metricsToWidgets(metrics: DashboardMetric[], currency?: KpiCurrency): DashboardWidgetDef[] {
  return metrics.map((metric, i) =>
    defineKpiWidget({
      id: `dashboard.kpi.${metric.id}`,
      title: metric.label,
      icon: metric.icon,
      domain: DOMAIN,
      defaultVisible: metric.defaultVisible,
      defaultOrder: metric.defaultOrder ?? i,
      component: () => (
        <KpiCard
          label={metric.label}
          icon={metric.icon}
          compute={metric.compute}
          format={metric.format}
          currency={currency}
          goal={metric.goal}
          accent={metric.accent}
        />
      ),
    }),
  )
}

/** Legacy DashboardSection[] → full-width custom widgets. */
export function sectionsToWidgets(sections: DashboardSection[]): DashboardWidgetDef[] {
  return sections.map((section) => {
    const SectionComponent = section.component
    const Wrapped = () => {
      const navigate = useDashboardNavigate()
      return <SectionComponent onNavigate={navigate} />
    }
    return defineCustomWidget({
      id: `dashboard.section.${section.id}`,
      title: section.title,
      icon: section.icon,
      domain: DOMAIN,
      // Half-width by default (guide/section cards like "Agenda de Hoje" should
      // sit beside others, not dominate the row). Sections can opt into full
      // width with `span: 4`.
      span: section.span ?? 2,
      defaultOrder: 100 + section.order,
      verticalId: section.verticalId,
      component: Wrapped,
    })
  })
}

/** Onboarding steps → a single "first steps to set up" checklist widget. */
export function onboardingToWidget(
  steps: OnboardingStep[],
  labels: { title: string; subtitle: string },
): DashboardWidgetDef {
  const sorted = [...steps].sort((a, b) => a.order - b.order)
  const Onboarding = () => {
    const navigate = useDashboardNavigate()
    const items: OnboardingStepInput[] = sorted.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      icon: s.icon,
      check: s.check,
      action: s.action,
    }))
    return <OnboardingWidget title={labels.title} subtitle={labels.subtitle} steps={items} onNavigate={navigate} />
  }
  return defineOnboardingWidget({
    id: 'dashboard.onboarding',
    title: labels.title,
    domain: DOMAIN,
    // Half-width (2 of 4 cols) so the getting-started guide sits beside other
    // content rather than dominating the row.
    span: 2,
    defaultOrder: 50,
    component: Onboarding,
  })
}
