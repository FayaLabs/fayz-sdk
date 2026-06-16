import * as React from 'react'
import type { DashboardWidgetDef } from '@fayz-ai/core'
import { WidgetGrid } from '@fayz-ai/ui'
import { metricsToWidgets, sectionsToWidgets } from './builders'
import type { DashboardMetric, DashboardSection } from './types'

export interface DashboardPageProps {
  title?: string
  subtitle?: string
  metrics?: DashboardMetric[]
  sections?: DashboardSection[]
  currency?: { code?: string; locale?: string; symbol?: string }
  /** Render the in-content title/subtitle. Set false when the app shell owns
   *  the page title (sidebar/GHL-style layouts). Default: true. */
  showHeader?: boolean
}

/**
 * Back-compat shim. The dashboard is now a widget registry (see DashboardCanvas),
 * but standalone callers can still render a fixed set of metrics/sections. This
 * converts them to widget definitions and renders them through the shared grid.
 */
export function DashboardPage({
  title = 'Dashboard', subtitle = 'Business overview', metrics = [], sections = [], currency, showHeader = true,
}: DashboardPageProps) {
  const widgets: DashboardWidgetDef[] = React.useMemo(
    () => [...metricsToWidgets(metrics, currency), ...sectionsToWidgets(sections)],
    [metrics, sections, currency],
  )

  return (
    <div className="space-y-6 p-6">
      {showHeader ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}
      <WidgetGrid widgets={widgets} surface="home" />
    </div>
  )
}
