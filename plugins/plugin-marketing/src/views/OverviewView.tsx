import React from 'react'
import { DashboardCanvas } from '@fayz-ai/ui'
import { useMarketingStore } from '../MarketingContext'
import type { DateRangeKey } from '../types'

/**
 * Marketing overview. KPIs, channel mix and the campaigns table are registered
 * dashboard widgets (see ./dashboardWidgets) rendered through DashboardCanvas —
 * the same widgets also surface on the global app home. The sticky range control
 * drives the marketing store's range, which refetches all widgets' data.
 */
export function OverviewView() {
  const setRange = useMarketingStore((s) => s.setRange)
  const range = useMarketingStore((s) => s.range)
  return (
    <DashboardCanvas
      surface="plugin-home"
      domain="marketing"
      showHeader={false}
      className="mx-auto max-w-6xl space-y-6"
      range={{ default: range, onChange: (r) => void setRange(r as DateRangeKey) }}
    />
  )
}
