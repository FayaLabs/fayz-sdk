import type { DashboardWidgetDef, DashboardWidgetKind, DashboardSurface } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Widget-definition builders. Each sets the right `kind` + default `span` so a
// plugin author writes data, not layout. The widget's component renders the
// presentational primitives (KpiCard, ChartWidget, TableWidget, ...).
// ---------------------------------------------------------------------------

export interface DefineWidgetInput {
  id: string
  title: string
  component: React.ComponentType<unknown>
  description?: string
  icon?: string
  domain?: string
  span?: 1 | 2 | 3 | 4
  defaultVisible?: boolean
  defaultOrder?: number
  surfaces?: DashboardSurface[]
  verticalId?: DashboardWidgetDef['verticalId']
  permission?: DashboardWidgetDef['permission']
  props?: Record<string, unknown>
}

function build(kind: DashboardWidgetKind, defaultSpan: 1 | 2 | 3 | 4, input: DefineWidgetInput): DashboardWidgetDef {
  return {
    kind,
    span: input.span ?? defaultSpan,
    defaultVisible: input.defaultVisible ?? true,
    id: input.id,
    title: input.title,
    description: input.description,
    icon: input.icon,
    domain: input.domain,
    defaultOrder: input.defaultOrder,
    surfaces: input.surfaces,
    verticalId: input.verticalId,
    permission: input.permission,
    component: input.component,
    props: input.props,
  }
}

/** KPI card widget — spans 1 column (forms the 4-up top row). */
export const defineKpiWidget = (input: DefineWidgetInput): DashboardWidgetDef => build('kpi', 1, input)
/** Chart widget — spans 2 columns by default. */
export const defineChartWidget = (input: DefineWidgetInput): DashboardWidgetDef => build('chart', 2, input)
/** Table widget — spans the full row by default. */
export const defineTableWidget = (input: DefineWidgetInput): DashboardWidgetDef => build('table', 4, input)
/** Onboarding checklist widget — spans half the row (2 cols) by default. */
export const defineOnboardingWidget = (input: DefineWidgetInput): DashboardWidgetDef => build('onboarding', 2, input)
/** Custom client-provided widget — spans 2 columns by default. */
export const defineCustomWidget = (input: DefineWidgetInput): DashboardWidgetDef => build('custom', 2, input)
