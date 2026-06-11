import React from 'react'
import type { ReportColumnDef } from '../types'
import { formatValuePlain } from '../lib/columns'

interface ReportSummaryRowProps {
  columns: ReportColumnDef[]
  data: Record<string, any>[]
  currency?: string
}

export function ReportSummaryRow({ columns, data, currency }: ReportSummaryRowProps) {
  const visibleCols = columns.filter((c) => c.visible !== false)
  const hasAggregates = visibleCols.some((c) => c.aggregate)
  if (!hasAggregates || data.length === 0) return null

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          <tr className="font-semibold">
            {visibleCols.map((col) => {
              const value = computeAggregate(col, data)
              const alignRight = col.align === 'right' || col.type === 'currency' || col.type === 'number'
              return (
                <td
                  key={col.key}
                  className={`px-3 py-1.5 ${alignRight ? 'text-right' : ''}`}
                >
                  {value != null
                    ? formatValuePlain(value, col, currency)
                    : col.aggregate
                      ? '—'
                      : ''}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function computeAggregate(col: ReportColumnDef, data: Record<string, any>[]): number | null {
  if (!col.aggregate) return null

  const values = data
    .map((row) => row[col.key])
    .filter((v) => v != null && !isNaN(Number(v)))
    .map(Number)

  if (values.length === 0) return null

  switch (col.aggregate) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'count':
      return values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    default:
      return null
  }
}
