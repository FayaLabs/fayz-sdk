import type React from 'react'
import type { FieldType } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Report column
// ---------------------------------------------------------------------------

export type ReportFieldType = FieldType | 'person'

export interface ReportColumnDef {
  key: string
  label: string
  type: ReportFieldType
  sortable?: boolean
  currency?: string
  /** For type 'person': the row key containing the person UUID */
  idKey?: string
  renderCell?: (value: any, row: any) => React.ReactNode
  /** Include in export but hide in table. Default: true */
  visible?: boolean
  /** Text alignment. Currency/number default to 'right' */
  align?: 'left' | 'center' | 'right'
  /** Aggregate for optional summary row */
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

// ---------------------------------------------------------------------------
// Report filter
// ---------------------------------------------------------------------------

export type ReportFilterOption = { label: string; value: string }

export interface ReportFilterDef {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'text' | 'boolean' | 'number'
  options?: ReportFilterOption[] | (() => Promise<ReportFilterOption[]>)
  defaultValue?: any
  placeholder?: string
}

// ---------------------------------------------------------------------------
// Report definition
// ---------------------------------------------------------------------------

export type ReportBadge = 'popular' | 'essential' | 'new' | (string & {})

export type ReportDataSourceKind = 'view' | 'rpc'

export interface ReportDataSource {
  kind: ReportDataSourceKind
  /** View name (e.g. 'rep_appointments_by_period') or RPC function name */
  name: string
  /** Column for date range filtering. Default: 'created_at' */
  dateColumn?: string
  defaultSort?: string
  defaultSortDir?: 'asc' | 'desc'
  /** snake_case DB → camelCase JS column mapping */
  columnMap?: Record<string, string>
}

export interface ReportDef {
  id: string
  name: string
  description?: string
  icon: string
  category: string
  badge?: ReportBadge
  columns: ReportColumnDef[]
  filters?: ReportFilterDef[]
  dataSource: ReportDataSource
  permission?: { feature: string; action: 'read' }
  /** Show aggregate summary row */
  showSummary?: boolean
  /** Whether the backing view/RPC exists. Default: true */
  available?: boolean
}

// ---------------------------------------------------------------------------
// Query state
// ---------------------------------------------------------------------------

export interface ReportDateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

export interface ReportQueryState {
  dateRange: ReportDateRange
  filters: Record<string, any>
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page: number
  pageSize: number
  search?: string
}

// ---------------------------------------------------------------------------
// Plugin options
// ---------------------------------------------------------------------------

export interface ReportsPluginLabels {
  pageTitle: string
  pageSubtitle: string
  allReports: string
  dateRange: string
  from: string
  to: string
  export: string
  exportCsv: string
  exportExcel: string
  exportPdf: string
  noResults: string
  backToReports: string
  reports: string
  search: string
  today: string
  yesterday: string
  last7Days: string
  thisMonth: string
  lastMonth: string
  thisQuarter: string
  custom: string
  generate: string
  print: string
  filterFrom: string
  filterTo: string
  filterResults: string
  emptyStateTitle: string
  emptyStateDescription: string
  unavailableTitle: string
  unavailableDescription: string
}

export interface ReportsPluginOptions {
  reports: ReportDef[]
  labels?: Partial<ReportsPluginLabels>
  currency?: { code?: string; locale?: string; symbol?: string }
  dataProvider?: import('./data/types').ReportDataProvider
  navPosition?: number
  navSection?: 'main' | 'secondary'
  scope?: import('@fayz-ai/core').PluginScope
  verticalId?: import('@fayz-ai/core').VerticalId
  /** Default page size. Default: 50 */
  defaultPageSize?: number
  /** Render the in-content title/subtitle. Set false when the app shell owns the
   *  page title (sidebar/GHL-style layouts). Default: true. */
  showHeader?: boolean
}

export interface ResolvedReportsConfig {
  labels: ReportsPluginLabels
  currency: { code: string; locale: string; symbol: string }
  reports: ReportDef[]
  defaultPageSize: number
  showHeader: boolean
}
