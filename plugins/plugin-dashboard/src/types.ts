import type React from 'react'
import type { VerticalId } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// KPI Metric system
// ---------------------------------------------------------------------------

export type MetricCategory = 'revenue' | 'operations' | 'clients' | 'custom'
export type MetricFormat = 'number' | 'currency' | 'percent' | 'duration'

export interface MetricValue {
  /** Primary numeric value */
  value: number
  /** Comparison value for trend (e.g., yesterday, last week) */
  previousValue?: number
  /** Unit suffix (e.g., 'min', 'BRL') */
  unit?: string
  /** Trend direction for visual indicator */
  trend?: 'up' | 'down' | 'neutral'
}

export interface DashboardMetric {
  /** Unique metric ID, e.g. 'revenue-today' */
  id: string
  /** i18n key or plain label */
  label: string
  /** Tooltip description */
  description?: string
  /** Lucide icon name */
  icon: string
  /** Grouping category */
  category: MetricCategory
  /** Async function that computes the current value */
  compute: () => Promise<MetricValue>
  /** Whether visible by default (before user customization) */
  defaultVisible: boolean
  /** Default display order (lower = first) */
  defaultOrder: number
  /** How to format the value */
  format?: MetricFormat
}

export interface ResolvedMetric extends DashboardMetric {
  /** Current computed value (null while loading) */
  currentValue: MetricValue | null
  /** Whether this metric is currently loading */
  loading: boolean
  /** Error message if compute() failed */
  error?: string
}

// ---------------------------------------------------------------------------
// Section system
// ---------------------------------------------------------------------------

export type DashboardZone = 'main' | 'sidebar' | 'bottom-right'

export interface DashboardSectionProps {
  tenantId?: string
  onNavigate?: (path: string) => void
}

export interface DashboardSection {
  /** Unique section ID */
  id: string
  /** i18n key or plain title */
  title: string
  /** Lucide icon name */
  icon?: string
  /** Zone placement on the dashboard */
  zone: DashboardZone
  /** Sort order within zone (lower = first) */
  order: number
  /** React component to render */
  component: React.ComponentType<DashboardSectionProps>
  /** Only show for specific verticals */
  verticalId?: VerticalId
}

// ---------------------------------------------------------------------------
// Onboarding system
// ---------------------------------------------------------------------------

export interface OnboardingStep {
  /** Unique step ID, e.g. 'add-first-client' */
  id: string
  /** i18n key or plain title */
  title: string
  /** i18n key or plain description */
  description: string
  /** Lucide icon name */
  icon: string
  /** Async check: returns true if this step is already completed */
  check: () => Promise<boolean>
  /** Route path to navigate to, or a callback */
  action: string | (() => void)
  /** Sort order (lower = first) */
  order: number
}

export interface OnboardingProgress {
  stepId: string
  completedAt: string | null
}

// ---------------------------------------------------------------------------
// Preferences (DB-backed per-tenant)
// ---------------------------------------------------------------------------

export interface DashboardPreferences {
  id: string
  tenantId: string
  /** Ordered list of metric IDs the user wants visible */
  visibleMetrics: string[]
  /** Full metric ordering (visible + hidden) */
  metricOrder: string[]
  createdAt: string
  updatedAt: string
}
