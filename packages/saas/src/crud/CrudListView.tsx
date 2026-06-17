import React, { useMemo } from 'react'
import { MoreVertical, Upload, Download } from 'lucide-react'
import type { ColumnDef as TanStackColumnDef } from '@tanstack/react-table'
import { useTranslation } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'
import { Card } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { DataTable } from '@fayz-ai/ui'
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@fayz-ai/ui'
import { fieldToColumns } from './fieldToColumn'
import { CrudCardGrid } from './CrudCardGrid'
import { PermissionGate } from '../permissions/PermissionGate'

/** A resolved facet: a field plus the option pills to render. */
export interface CrudFacet {
  field: string
  options: { value: string; label: string }[]
  allLabel?: string
}

export interface CrudListViewProps<T extends { id: string }> {
  entityDef: EntityDef<T>
  /** TanStack columns. When omitted, derived from entityDef.fields (no actions column). */
  columns?: TanStackColumnDef<T, any>[]
  /** null = initial load (skeleton); [] = empty state. */
  items: T[] | null
  total: number
  display?: 'table' | 'cards'
  /** Search box — rendered when onSearchChange is provided. */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Facet pills below the search box. */
  facets?: CrudFacet[]
  activeFilters?: Record<string, string | undefined>
  onFacetChange?: (field: string, value: string | undefined) => void
  onNew?: () => void
  addLabel?: string
  onRowClick?: (row: T) => void
  /** Delete action for the card grid (table actions live in the columns). */
  onDelete?: (row: T) => void
  onImport?: () => void
  onExport?: () => void
  feature?: string
  readOnly?: boolean
  emptyMessage?: string
}

function pillClass(active: boolean): string {
  return [
    'rounded-full px-3 py-1 text-sm font-medium transition-colors',
    active
      ? 'bg-foreground text-background'
      : 'bg-muted text-muted-foreground hover:bg-muted/70',
  ].join(' ')
}

/**
 * The canonical generic list — header (count + New + import/export), search,
 * faceted filter pills, and a DataTable/card grid. Decoupled from data and
 * routing: feed it `items` and callbacks. Used by CrudPage (store-backed) and by
 * plugins that own their data/routing (e.g. the inventory product list).
 */
export function CrudListView<T extends { id: string }>({
  entityDef,
  columns,
  items,
  total,
  display = 'table',
  search,
  onSearchChange,
  searchPlaceholder,
  facets,
  activeFilters,
  onFacetChange,
  onNew,
  addLabel,
  onRowClick,
  onDelete,
  onImport,
  onExport,
  feature,
  readOnly,
  emptyMessage,
}: CrudListViewProps<T>) {
  const t = useTranslation()
  const namePlural = entityDef.namePlural ?? entityDef.name + 's'
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'

  const derivedColumns = useMemo<TanStackColumnDef<T, any>[]>(() => {
    return fieldToColumns(entityDef.fields).map((col) => ({
      accessorKey: col.key,
      header: col.label,
      enableSorting: col.sortable,
      cell: ({ row }: any) => {
        const value = row.original[col.key]
        const rendered = col.render(value, row.original)
        return col.key === displayField
          ? <span className="font-medium text-foreground">{rendered}</span>
          : rendered
      },
    }))
  }, [entityDef.fields, displayField])

  const tanColumns = columns ?? derivedColumns

  const isInitialLoad = items === null
  const isEmpty = items !== null && items.length === 0
  const hasImportExport = Boolean(onImport || onExport)

  const newButton = onNew && !readOnly
    ? <Button onClick={onNew}>{addLabel ?? t('crud.list.addEntity', { entity: entityDef.name })}</Button>
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{namePlural}</h1>
          {isInitialLoad ? (
            <div className="h-5 w-32 animate-pulse rounded bg-muted mt-1" />
          ) : (
            <p className="text-muted-foreground">{t('crud.list.totalCount', { count: String(total), entities: namePlural.toLowerCase() })}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {newButton && (feature ? <PermissionGate feature={feature} action="create">{newButton}</PermissionGate> : newButton)}
          {hasImportExport && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              <DropdownContent align="end">
                {onImport && (
                  <DropdownItem onClick={onImport}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('crud.import.action')}
                  </DropdownItem>
                )}
                {onExport && (
                  <DropdownItem onClick={onExport}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('crud.export.action')}
                  </DropdownItem>
                )}
              </DropdownContent>
            </Dropdown>
          )}
        </div>
      </div>

      {onSearchChange && (
        <div className="relative max-w-sm">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder={searchPlaceholder ?? t('crud.list.search', { entities: namePlural.toLowerCase() })}
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {facets?.map((facet) => {
        const active = activeFilters?.[facet.field]
        return (
          <div key={facet.field} className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onFacetChange?.(facet.field, undefined)} className={pillClass(active == null)}>
              {facet.allLabel ?? t('crud.list.allFacet')}
            </button>
            {facet.options.map((o) => (
              <button key={o.value} type="button" onClick={() => onFacetChange?.(facet.field, o.value)} className={pillClass(active === o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        )
      })}

      {isInitialLoad ? (
        display === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="flex justify-between"><div className="h-4 w-20 animate-pulse rounded bg-muted" /><div className="h-4 w-16 animate-pulse rounded bg-muted" /></div>
                    <div className="flex justify-between"><div className="h-4 w-24 animate-pulse rounded bg-muted" /><div className="h-4 w-12 animate-pulse rounded bg-muted" /></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <DataTable columns={tanColumns} data={[]} loading skeletonRows={3} />
        )
      ) : isEmpty ? (
        <DataTable
          columns={tanColumns}
          data={[]}
          emptyMessage={emptyMessage ?? t('crud.list.empty', { entities: namePlural.toLowerCase() })}
        />
      ) : display === 'cards' ? (
        <CrudCardGrid
          items={items ?? []}
          entityDef={entityDef as EntityDef<any>}
          onEdit={(item) => onRowClick?.(item as T)}
          onDelete={(item) => onDelete?.(item as T)}
        />
      ) : (
        <DataTable
          columns={tanColumns}
          data={items ?? []}
          onRowClick={(row) => onRowClick?.(row as T)}
        />
      )}
    </div>
  )
}
