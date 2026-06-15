import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ReportColumnDef } from '../types'
import { PersonLink } from '@fayz-ai/saas'
import {
  formatCurrency as formatCurrencyLocale,
  formatDate as formatDateLocale,
  formatDateTime as formatDateTimeLocale,
} from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Formatters (mirrors fieldToColumn.tsx logic)
// ---------------------------------------------------------------------------

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

function formatNumber(value: any): string {
  if (value == null) return '—'
  return typeof value === 'number' ? value.toLocaleString() : String(value)
}

// ---------------------------------------------------------------------------
// Plain-text formatter for exports
// ---------------------------------------------------------------------------

export function formatValuePlain(value: any, col: ReportColumnDef, currency?: string): string {
  if (value == null || value === '') return ''
  switch (col.type) {
    case 'currency':
      return formatCurrency(value, col.currency ?? currency)
    case 'date':
      return formatDate(value)
    case 'datetime':
      return formatDateTime(value)
    case 'number':
      return formatNumber(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
    default:
      return String(value)
  }
}

// ---------------------------------------------------------------------------
// ReportColumnDef[] → TanStack ColumnDef[]
// ---------------------------------------------------------------------------

export function reportColumnsToTanstack(
  columns: ReportColumnDef[],
  currency?: string,
): ColumnDef<Record<string, any>>[] {
  return columns
    .filter((c) => c.visible !== false)
    .map((col): ColumnDef<Record<string, any>> => {
      const sortable = col.sortable ?? ['text', 'number', 'currency', 'date', 'datetime', 'email'].includes(col.type)
      const alignRight = col.align === 'right' || (!col.align && (col.type === 'currency' || col.type === 'number'))
      const alignCenter = col.align === 'center'

      return {
        accessorKey: col.key,
        header: col.label,
        enableSorting: sortable,
        cell: (ctx) => {
          const value = ctx.getValue()
          const row = ctx.row.original

          if (col.renderCell) {
            return col.renderCell(value, row)
          }

          if (value == null || value === '') {
            return React.createElement('span', { className: 'text-muted-foreground' }, '—')
          }

          let content: React.ReactNode
          switch (col.type) {
            case 'person':
              content = React.createElement(PersonLink, {
                personId: col.idKey ? row[col.idKey] : null,
                name: String(value),
                size: 'sm',
                className: 'text-xs',
              })
              break
            case 'currency':
              content = formatCurrency(value, col.currency ?? currency)
              break
            case 'date':
              content = formatDate(value)
              break
            case 'datetime':
              content = formatDateTime(value)
              break
            case 'boolean':
              content = value
                ? React.createElement('svg', { className: 'h-4 w-4 text-success', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
                    React.createElement('polyline', { points: '20 6 9 17 4 12' }),
                  )
                : React.createElement('span', { className: 'text-muted-foreground' }, '—')
              break
            case 'number':
              content = formatNumber(value)
              break
            default:
              content = String(value)
          }

          const cls = alignRight ? 'text-right' : alignCenter ? 'text-center' : undefined
          return cls
            ? React.createElement('div', { className: cls }, content)
            : React.createElement(React.Fragment, null, content)
        },
        meta: { align: alignRight ? 'right' : alignCenter ? 'center' : 'left' },
      }
    })
}
