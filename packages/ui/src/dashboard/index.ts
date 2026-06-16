// Dashboard widget kit — rendering engine + presentational primitives + builders.
export {
  DashboardCanvas,
  WidgetGrid,
  DashboardNavigateProvider,
  useDashboardNavigate,
  type DashboardCanvasProps,
} from './DashboardCanvas'
export { resolveDashboardLayout, type LaidOutWidget } from './layout'
export { useDashboardPreferences, type DashboardPreferencesState } from './preferences'
export { DashboardCustomizeMenu, type DashboardCustomizeMenuProps } from './DashboardCustomizeMenu'
export { DashboardGrid, type DashboardGridItem, type DashboardGridProps } from './DashboardGrid'
export {
  DashboardRangeProvider,
  DashboardRangeControl,
  useDashboardRange,
  DEFAULT_RANGE_OPTIONS,
  type DashboardRange,
  type DashboardRangeProviderProps,
} from './DashboardRange'
export type { DashboardRangeOptions } from './DashboardCanvas'
export { KpiCard, formatKpiValue, type KpiCardProps } from './KpiCard'
export { ChartWidget, type ChartWidgetProps } from './ChartWidget'
export { TableWidget, type TableWidgetProps } from './TableWidget'
export { OnboardingWidget, type OnboardingStepInput, type OnboardingWidgetProps } from './OnboardingWidget'
export { renderIcon } from './icon'
export {
  defineKpiWidget,
  defineChartWidget,
  defineTableWidget,
  defineOnboardingWidget,
  defineCustomWidget,
  type DefineWidgetInput,
} from './define'
export type {
  KpiFormat, KpiTrend, KpiValue, KpiCurrency, IconRef, ChartType, ChartSeries,
} from './types'
