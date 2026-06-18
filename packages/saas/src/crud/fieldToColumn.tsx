import React from 'react'
import type { FieldDef } from '@fayz-ai/core'
import { Badge } from '@fayz-ai/ui'
import { RelationCell } from './relation-field'
import {
  formatCurrency as formatCurrencyLocale,
  formatDate as formatDateLocale,
  formatDateTime as formatDateTimeLocale,
} from '@fayz-ai/core'

function formatCurrency(value: any, currency?: string): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num)) return '—'
  return formatCurrencyLocale(num, currency)
}

function formatDate(value: any): string {
  if (!value) return '—'
  return formatDateLocale(value)
}

function formatDateTime(value: any): string {
  if (!value) return '—'
  return formatDateTimeLocale(value)
}

export interface ColumnDef {
  key: string
  label: string
  sortable: boolean
  render: (value: any, row: any) => React.ReactNode
}

export interface FieldToColumnsOptions {
  /** Callback for inline field updates (e.g. toggle active) */
  onInlineUpdate?: (id: string, field: string, value: any) => void
}

function InlineToggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function fieldToColumns(fields: FieldDef[], options?: FieldToColumnsOptions): ColumnDef[] {
  return fields
    .filter((f) => f.showInTable !== false)
    .map((field): ColumnDef => {
      const sortable = field.sortable ?? ['text', 'number', 'currency', 'date', 'datetime', 'email'].includes(field.type)

      const render = field.renderCell ?? ((value: any, row: any): React.ReactNode => {
        if (value == null || value === '') return <span className="text-muted-foreground">—</span>

        switch (field.type) {
          case 'currency':
            return <span>{formatCurrency(value, field.currency)}</span>
          case 'date':
            return <span>{formatDate(value)}</span>
          case 'datetime':
            return <span>{formatDateTime(value)}</span>
          case 'boolean':
            if (field.inlineToggle && options?.onInlineUpdate) {
              const handler = options.onInlineUpdate
              return (
                <InlineToggle
                  checked={!!value}
                  onChange={(val) => handler(row.id, field.key, val)}
                />
              )
            }
            return value ? (
              <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          case 'color':
            return (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full border shrink-0" style={{ backgroundColor: String(value) }} />
                <span className="text-xs text-muted-foreground">{String(value)}</span>
              </span>
            )
          case 'relation':
            return <RelationCell relation={field.relation} value={value} />
          case 'select':
            return <Badge variant="secondary">{String(value)}</Badge>
          case 'number':
            return <span>{typeof value === 'number' ? value.toLocaleString() : value}</span>
          default:
            return <span>{String(value)}</span>
        }
      })

      return { key: field.key, label: field.label, sortable, render }
    })
}
