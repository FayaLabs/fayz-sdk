import { exportCSV } from '@fayz/core'
import type { CSVColumn } from '@fayz/core'
import type { EntityDef } from '@fayz/core'

export function exportToCSV<T extends Record<string, any>>(
  items: T[],
  entityDef: EntityDef,
): void {
  const columns: CSVColumn[] = entityDef.fields
    .filter((f) => f.showInTable !== false)
    .map((f) => ({ key: f.key, label: f.label }))

  const namePlural = entityDef.namePlural ?? entityDef.name + 's'
  const filename = `${namePlural.toLowerCase().replace(/\s+/g, '-')}-export`

  exportCSV(columns, items, filename)
}
