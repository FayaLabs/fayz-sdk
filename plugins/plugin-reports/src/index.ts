import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
import { ReportsPage } from './ReportsPage'
import type { ReportDataProvider } from './data/types'
import { createSupabaseReportProvider } from './data/supabase'
import { createMockReportProvider } from './data/mock'
import { getReportsTenantId } from './lib/tenant'
import { reportsLocales } from './locales'
import type {
  ReportsPluginOptions,
  ReportsPluginLabels,
  ResolvedReportsConfig,
} from './types'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: ReportsPluginLabels = {
  pageTitle: 'Reports',
  pageSubtitle: 'Access complete reports for analysis and decision making',
  allReports: 'All Reports',
  dateRange: 'Date Range',
  from: 'From',
  to: 'To',
  export: 'Export',
  exportCsv: 'Export CSV',
  exportExcel: 'Export Excel',
  exportPdf: 'Export PDF',
  noResults: 'No results found.',
  backToReports: 'Back',
  reports: 'reports',
  search: 'Search reports...',
  today: 'Today',
  yesterday: 'Yesterday',
  last7Days: 'Last 7 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisQuarter: 'This quarter',
  custom: 'Custom',
  generate: 'Generate',
  print: 'Print',
  filterFrom: 'From',
  filterTo: 'To',
  filterResults: 'Results',
  emptyStateTitle: 'Ready to generate',
  emptyStateDescription: 'Select a date range and filters, then click Generate to view the report.',
  unavailableTitle: 'Coming soon',
  unavailableDescription: 'This report is not available yet. It will be enabled in a future update.',
}

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options: ReportsPluginOptions): ResolvedReportsConfig {
  return {
    labels: { ...DEFAULT_LABELS, ...options.labels },
    currency: { ...DEFAULT_CURRENCY, ...options.currency },
    reports: options.reports,
    defaultPageSize: options.defaultPageSize ?? 50,
    showHeader: options.showHeader !== false,
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createReportsPlugin(options: ReportsPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  registerTranslations(reportsLocales)
  const provider: ReportDataProvider = options.dataProvider ?? createSafeDataProvider(
    () => createSupabaseReportProvider({ tenantId: () => getReportsTenantId() }),
    () => createMockReportProvider(),
  )

  const PageComponent: React.FC<any> = () =>
    React.createElement(ReportsPage, { config, provider })

  return {
    id: 'reports',
    name: config.labels.pageTitle,
    icon: 'BarChart3',
    version: '1.0.0',
    scope: options.scope ?? 'universal',
    verticalId: options.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'reports', label: config.labels.pageTitle, group: config.labels.pageTitle },
    ],
    navigation: [
      {
        section: options.navSection ?? 'main',
        position: options.navPosition ?? 9,
        label: config.labels.pageTitle,
        route: '/reports',
        icon: 'BarChart3',
        permission: { feature: 'reports', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/reports',
        component: PageComponent,
        permission: { feature: 'reports', action: 'read' as const },
      },
    ],
    widgets: [],
    registries: [],
    locales: reportsLocales,
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type {
  ReportDef,
  ReportColumnDef,
  ReportFilterDef,
  ReportDateRange,
  ReportQueryState,
  ReportBadge,
  ReportDataSource,
  ReportGrain,
  ReportAllowedAction,
  ReportFilterOption,
  ReportsPluginOptions,
  ReportsPluginLabels,
  ResolvedReportsConfig,
} from './types'

export type { ReportDataProvider, ReportResult } from './data/types'
export { createSupabaseReportProvider } from './data/supabase'
export type { SupabaseReportProviderConfig } from './data/supabase'
export { createMockReportProvider } from './data/mock'
