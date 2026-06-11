import type { ReportDef, ReportQueryState } from '../types'

export interface ReportResult {
  data: Record<string, any>[]
  total: number
}

export interface ReportDataProvider {
  fetch(reportDef: ReportDef, query: ReportQueryState): Promise<ReportResult>
}
