import React from 'react'
import * as LucideIcons from 'lucide-react'
import { Card } from '@fayz-ai/ui'
import { Badge } from '@fayz-ai/ui'
import type { FieldDef, EntityDef } from '@fayz-ai/core'
import { formatCurrency, formatDate } from '@fayz-ai/core'

interface CrudCardGridProps<T> {
  items: T[]
  entityDef: EntityDef<T>
  onEdit: (item: T) => void
  onDelete: (item: T) => void
}

function formatValue(field: FieldDef, value: any): React.ReactNode {
  if (value == null || value === '') return null

  switch (field.type) {
    case 'currency': {
      const num = typeof value === 'number' ? value : parseFloat(value)
      if (isNaN(num)) return null
      return formatCurrency(num, field.currency)
    }
    case 'date':
      try { return formatDate(value) }
      catch { return String(value) }
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'select':
      return <Badge variant="secondary" className="text-[10px]">{String(value)}</Badge>
    case 'image':
      return null
    default:
      return String(value)
  }
}

export function CrudCardGrid<T extends { id: string }>({ items, entityDef, onEdit, onDelete }: CrudCardGridProps<T>) {
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'
  const imageField = entityDef.imageField
  const entityIcon = entityDef.icon
  const IconComponent = (LucideIcons as any)[entityIcon] ?? LucideIcons.Package
  const visibleFields = entityDef.fields.filter(
    (f) => f.showInTable !== false && f.key !== displayField && f.key !== imageField && f.type !== 'image'
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const record = item as any
        const imageUrl = imageField ? record[imageField] : null

        return (
          <Card
            key={record.id}
            className="flex items-center gap-4 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onEdit(item)}
          >
            {/* Thumbnail or icon */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={record[displayField] ?? ''}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                <IconComponent className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{record[displayField] ?? record.id}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {visibleFields.slice(0, 3).map((field) => {
                  const val = formatValue(field, record[field.key])
                  if (val == null) return null
                  return (
                    <span key={field.key} className="text-xs text-muted-foreground">
                      {val}
                    </span>
                  )
                })}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
