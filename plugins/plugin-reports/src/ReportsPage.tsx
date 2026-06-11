import React from 'react'
import type { ResolvedReportsConfig } from './types'

export interface ReportsPageProps {
  config?: ResolvedReportsConfig
}

export function ReportsPage({ config }: ReportsPageProps) {
  const title = config?.labels?.pageTitle ?? 'Reports'
  const subtitle = config?.labels?.pageSubtitle ?? 'Access complete reports for analysis and decision making'
  const reportCount = config?.reports?.length ?? 0

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{title}</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0' }}>{subtitle}</p>
      </div>
      <div style={{ padding: '32px', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
        Reports plugin — {reportCount} report{reportCount !== 1 ? 's' : ''} configured. Full UI available in saas-core.
      </div>
    </div>
  )
}
