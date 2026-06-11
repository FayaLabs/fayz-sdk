import type { ReportColumnDef } from '../types'
import { formatValuePlain } from '../lib/columns'

// Opaque dynamic import — hidden from Vite's static analysis so it won't
// fail when jspdf is not installed (it's an optional peer dependency).
const load = (m: string) => new Function('m', 'return import(m)')(m) as Promise<any>

export async function exportToPdf(
  columns: ReportColumnDef[],
  data: Record<string, any>[],
  filename: string,
  options?: { title?: string; currency?: string },
): Promise<void> {
  const { default: jsPDF } = await load('jspdf')
  await load('jspdf-autotable')

  const visibleCols = columns.filter((c) => c.visible !== false)

  const doc = new jsPDF({ orientation: visibleCols.length > 6 ? 'landscape' : 'portrait' })

  if (options?.title) {
    doc.setFontSize(14)
    doc.text(options.title, 14, 20)
  }

  ;(doc as any).autoTable({
    startY: options?.title ? 30 : 14,
    head: [visibleCols.map((c) => c.label)],
    body: data.map((row) =>
      visibleCols.map((col) => formatValuePlain(row[col.key], col, options?.currency)),
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 100, 100] },
  })

  doc.save(`${filename}.pdf`)
}

export async function isPdfAvailable(): Promise<boolean> {
  try {
    await load('jspdf')
    await load('jspdf-autotable')
    return true
  } catch {
    return false
  }
}
