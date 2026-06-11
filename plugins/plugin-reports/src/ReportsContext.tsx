import React, { createContext, useContext } from 'react'
import type { ResolvedReportsConfig, ReportDef } from './types'
import type { ReportDataProvider } from './data/types'

interface ReportsContextValue {
  config: ResolvedReportsConfig
  provider: ReportDataProvider
  reports: ReportDef[]
}

const ReportsContext = createContext<ReportsContextValue | null>(null)

export function useReportsContext(): ReportsContextValue {
  const ctx = useContext(ReportsContext)
  if (!ctx) throw new Error('useReportsContext must be used within ReportsContextProvider')
  return ctx
}

export function ReportsContextProvider({
  config,
  provider,
  children,
}: {
  config: ResolvedReportsConfig
  provider: ReportDataProvider
  children: React.ReactNode
}) {
  return (
    <ReportsContext.Provider value={{ config, provider, reports: config.reports }}>
      {children}
    </ReportsContext.Provider>
  )
}
