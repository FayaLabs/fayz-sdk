import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Card, DataTable } from '@fayz-ai/ui'

/** Standard padded container for the commerce admin pages. */
export function PageContainer({ title, subtitle, actions, children }: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

/** A single KPI tile (revenue, sales, MRR…). */
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

/** Empty/loading state for the tables. */
export function TableEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export interface SimpleColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right'
}

/**
 * Thin adapter over the design-system DataTable (@fayz-ai/ui): the commerce
 * pages describe columns declaratively; this maps them to tanstack ColumnDef so
 * we reuse DataTable's sorting/skeleton/empty chrome instead of a bespoke table.
 */
export function SimpleTable<T>({ columns, rows, empty, loading }: {
  columns: SimpleColumn<T>[]
  rows: T[]
  empty: string
  loading?: boolean
}) {
  const cols = React.useMemo<ColumnDef<T>[]>(
    () => columns.map((c) => ({
      id: c.key,
      header: () => <div className={c.align === 'right' ? 'text-right' : ''}>{c.header}</div>,
      cell: ({ row }) => <div className={c.align === 'right' ? 'text-right' : ''}>{c.render(row.original)}</div>,
    })),
    [columns],
  )
  return <DataTable columns={cols} data={rows} emptyMessage={empty} loading={loading} />
}
