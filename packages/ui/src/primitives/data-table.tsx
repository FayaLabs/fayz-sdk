import * as React from 'react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import { cn } from '../utils/cn'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  onRowClick?: (row: TData) => void
  /** Visual variant: 'card' (white bg, card wrapper — default) or 'flat' (transparent bg) */
  variant?: 'card' | 'flat'
  /** Compact mode: smaller padding and font size */
  compact?: boolean
}

function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  skeletonRows = 3,
  emptyMessage = 'No results.',
  onRowClick,
  variant = 'card',
  compact = false,
}: DataTableProps<TData, TValue>) {
  const isCard = variant === 'card'
  const wrapperCls = isCard ? 'rounded-lg border bg-card shadow-sm overflow-x-auto' : 'rounded-lg border overflow-x-auto'
  const headerCls = isCard ? 'border-b bg-muted/50' : 'border-b bg-muted/30'
  const thCls = compact ? 'px-3 py-1.5 text-left text-[11px] font-medium text-muted-foreground' : 'px-4 py-2.5 text-left font-medium text-muted-foreground'
  const tdCls = compact ? 'px-3 py-1.5 align-middle text-xs' : 'px-4 py-3 align-middle'
  const tableCls = compact ? 'w-full text-xs min-w-max' : 'w-full text-sm min-w-max'
  const rowHoverCls = isCard ? 'hover:bg-muted/30' : 'hover:bg-muted/20'
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  })

  if (loading) {
    return (
      <div className={wrapperCls}>
        <table className={tableCls}>
          <thead>
            <tr className={headerCls}>
              {columns.map((_, i) => (
                <th key={i} className={thCls}>
                  <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((_, j) => (
                  <td key={j} className={tdCls}>
                    <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={wrapperCls}>
      <table className={tableCls}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className={headerCls}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    className={thCls}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  `border-b last:border-0 transition-colors ${rowHoverCls}`,
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={tdCls}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export { DataTable, type DataTableProps }
