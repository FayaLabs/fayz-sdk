import React, { useState, useEffect, useCallback } from 'react'
import { ReportsContextProvider } from './ReportsContext'
import { ReportHub } from './views/ReportHub'
import { ReportViewer } from './views/ReportViewer'
import type { ResolvedReportsConfig, ReportDef } from './types'
import type { ReportDataProvider } from './data/types'

const HASH_BASE = '/reports'

function getReportIdFromHash(): string | null {
  const hash = (window.location.hash.slice(1) || '/').split('?')[0]
  if (hash.startsWith(HASH_BASE + '/') && hash.length > HASH_BASE.length + 1) {
    return hash.slice(HASH_BASE.length + 1)
  }
  return null
}

export function ReportsPage({
  config,
  provider,
}: {
  config: ResolvedReportsConfig
  provider: ReportDataProvider
}) {
  const [activeReportId, setActiveReportId] = useState<string | null>(getReportIdFromHash)

  useEffect(() => {
    function handler() {
      setActiveReportId(getReportIdFromHash())
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const handleSelect = useCallback((report: ReportDef) => {
    window.location.hash = `${HASH_BASE}/${report.id}`
  }, [])

  const handleBack = useCallback(() => {
    window.location.hash = HASH_BASE
  }, [])

  const activeReport = activeReportId
    ? config.reports.find((r) => r.id === activeReportId) ?? null
    : null

  return (
    <ReportsContextProvider config={config} provider={provider}>
      <div className="p-1">
        {activeReport ? (
          <ReportViewer
            key={activeReport.id}
            report={activeReport}
            onBack={handleBack}
          />
        ) : (
          <ReportHub onSelect={handleSelect} />
        )}
      </div>
    </ReportsContextProvider>
  )
}
