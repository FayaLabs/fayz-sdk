import { exportCSV } from '@fayz-ai/core'
import type { CSVColumn } from '@fayz-ai/core'
import type { ReportColumnDef } from '../types'
import { formatValuePlain } from '../lib/columns'

export function exportToCsv(
  columns: ReportColumnDef[],
  data: Record<string, any>[],
  filename: string,
  currency?: string,
): void {
  const visibleCols = columns.filter((c) => c.visible !== false)

  const csvColumns: CSVColumn[] = visibleCols.map((col) => ({
    key: col.key,
    label: col.label,
    format: (value: any) => formatValuePlain(value, col, currency),
  }))

  exportCSV(csvColumns, data, filename)
}
