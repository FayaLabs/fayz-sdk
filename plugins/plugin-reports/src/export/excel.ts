import type { ReportColumnDef } from '../types'
import { formatValuePlain } from '../lib/columns'

// Opaque dynamic import — hidden from Vite's static analysis so it won't
// fail when xlsx is not installed (it's an optional peer dependency).
const load = (m: string) => new Function('m', 'return import(m)')(m) as Promise<any>

export async function exportToExcel(
  columns: ReportColumnDef[],
  data: Record<string, any>[],
  filename: string,
  currency?: string,
): Promise<void> {
  const XLSX = await load('xlsx')
  const visibleCols = columns.filter((c) => c.visible !== false)

  const header = visibleCols.map((c) => c.label)
  const rows = data.map((row) =>
    visibleCols.map((col) => {
      const value = row[col.key]
      if (col.type === 'number' || col.type === 'currency') {
        const num = typeof value === 'number' ? value : parseFloat(value)
        return isNaN(num) ? '' : num
      }
      return formatValuePlain(value, col, currency)
    }),
  )

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export async function isExcelAvailable(): Promise<boolean> {
  try {
    await load('xlsx')
    return true
  } catch {
    return false
  }
}
