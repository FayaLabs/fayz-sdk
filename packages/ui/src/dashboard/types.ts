import type React from 'react'

// ---------------------------------------------------------------------------
// Shared, dependency-free types for the dashboard widget kit. These mirror the
// shapes in plugin-dashboard but live here so plugins can render widgets
// without depending on plugin-dashboard.
// ---------------------------------------------------------------------------

export type KpiFormat = 'number' | 'currency' | 'percent' | 'duration'
export type KpiTrend = 'up' | 'down' | 'neutral'

export interface KpiValue {
  value: number
  /** Comparison value used to derive the trend chip. */
  previousValue?: number
  /** Unit suffix (e.g. 'min'). */
  unit?: string
  trend?: KpiTrend
  /** Optional series (oldest → newest) rendered as an inline sparkline. */
  spark?: number[]
}

export interface KpiCurrency {
  code?: string
  locale?: string
  symbol?: string
}

/** A lucide icon name (resolved at render) or a React component. */
export type IconRef = string | React.ComponentType<{ className?: string }>

export type ChartType = 'line' | 'bar' | 'area' | 'pie'

export interface ChartSeries {
  /** Key into each data row. */
  dataKey: string
  /** Display label (legend/tooltip). */
  label?: string
  /** Explicit color; falls back to the theme palette. */
  color?: string
}
