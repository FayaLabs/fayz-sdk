import type { ReportDataProvider } from './types'

export function createMockReportProvider(): ReportDataProvider {
  return {
    async fetch() {
      return { data: [], total: 0 }
    },
  }
}
