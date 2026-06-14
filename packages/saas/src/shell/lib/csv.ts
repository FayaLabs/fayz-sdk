/** Column descriptor for generic CSV export */
export interface CSVColumn {
  key: string
  label: string
  format?: (value: any, row: Record<string, any>) => string
}

export function escapeCSVField(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Build a CSV string from columns + rows. Each cell runs through `column.format` if provided, then escaping. */
export function buildCSV(
  columns: CSVColumn[],
  rows: Record<string, any>[],
): string {
  const header = columns.map((c) => escapeCSVField(c.label)).join(',')
  const body = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key]
        const formatted = col.format ? col.format(raw, row) : raw
        return escapeCSVField(formatted)
      })
      .join(','),
  )
  return [header, ...body].join('\n')
}

/** Trigger a CSV file download in the browser. */
export function downloadCSV(csv: string, filename: string): void {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Convenience: build + download in one call. */
export function exportCSV(
  columns: CSVColumn[],
  rows: Record<string, any>[],
  filename: string,
): void {
  downloadCSV(buildCSV(columns, rows), filename)
}
