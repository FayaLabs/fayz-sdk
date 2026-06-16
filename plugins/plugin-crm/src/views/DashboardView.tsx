import React from 'react'
import { DashboardCanvas } from '@fayz-ai/ui'

/**
 * CRM overview. The KPI cards, charts and recent-data tables are now registered
 * dashboard widgets (see ./dashboardWidgets) and rendered through the shared
 * DashboardCanvas — the same widgets also appear on the global app home. This
 * view simply mounts the CRM-scoped plugin-home surface.
 */
export function DashboardView() {
  return <DashboardCanvas surface="plugin-home" domain="crm" showHeader={false} className="space-y-6" />
}
