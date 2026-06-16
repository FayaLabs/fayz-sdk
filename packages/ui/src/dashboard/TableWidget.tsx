import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '../primitives/card'
import { DataTable } from '../primitives/data-table'
import { renderIcon } from './icon'
import type { IconRef } from './types'

export interface TableWidgetProps<TData> {
  title?: string
  icon?: IconRef
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: TData) => void
  /** Right-aligned header content (e.g. a "view all" link). */
  headerAction?: React.ReactNode
  className?: string
}

/** "Recent N" table in a Card — wraps the shared DataTable primitive. */
export function TableWidget<TData>({
  title, icon, columns, data, loading, emptyMessage, onRowClick, headerAction, className,
}: TableWidgetProps<TData>) {
  return (
    <Card className={className}>
      {(title || headerAction) && (
        <CardHeader className="flex-row items-center justify-between space-y-0">
          {title ? (
            <CardTitle className="flex items-center gap-2">
              {renderIcon(icon)}
              {title}
            </CardTitle>
          ) : <span />}
          {headerAction}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage={emptyMessage}
          onRowClick={onRowClick}
          variant="flat"
          compact
        />
      </CardContent>
    </Card>
  )
}
