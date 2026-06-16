import React from 'react'
import { DashboardCanvas } from '@fayz-ai/ui'

/**
 * Financial summary. KPIs, cash-flow chart, breakdown, overdue alerts and the
 * recent-transactions table are registered dashboard widgets (see
 * ./dashboardWidgets), rendered through the shared DashboardCanvas; the
 * total-balance KPI also surfaces on the global app home.
 */
export function SummaryView() {
  return <DashboardCanvas surface="plugin-home" domain="financial" showHeader={false} className="space-y-6" />
}
