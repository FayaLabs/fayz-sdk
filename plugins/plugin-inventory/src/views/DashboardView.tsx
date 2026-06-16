import React from 'react'
import { DashboardCanvas } from '@fayz-ai/ui'

/**
 * Inventory overview. KPIs and the activity panel are registered dashboard
 * widgets (see ./dashboardWidgets), rendered through the shared DashboardCanvas;
 * the stock-value KPI also surfaces on the global app home.
 */
export function DashboardView() {
  return <DashboardCanvas surface="plugin-home" domain="inventory" showHeader={false} className="space-y-6" />
}
