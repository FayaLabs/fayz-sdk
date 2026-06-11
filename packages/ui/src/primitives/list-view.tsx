import * as React from 'react'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { DataTable } from './data-table'
import { Button } from './button'
import { cn } from '../utils/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagFilter {
  value: string
  label: string
}

export interface ListViewProps<TData> {
  /** TanStack column definitions */
  columns: ColumnDef<TData, any>[]
  /** Data rows */
  data: TData[]
  /** Loading state — shows skeleton */
  loading?: boolean

  // ── Search ──
  /** Placeholder for search input (default: "Search...") */
  searchPlaceholder?: string
  /** Controlled search value */
  search?: string
  /** Called on search change (debounced internally if onSearchDebounced is used) */
  onSearchChange?: (value: string) => void
  /** Debounce delay in ms (default: 300). Set 0 for no debounce. */
  searchDebounce?: number

  // ── Tag filters ──
  /** Available filter tags (e.g. status values, types) */
  tags?: TagFilter[]
  /** "All" label (default: "All") */
  allTagLabel?: string
  /** Currently active tag value (undefined = all) */
  activeTag?: string
  /** Called when a tag is selected (undefined = all) */
  onTagChange?: (value: string | undefined) => void

  // ── CTA button ──
  /** Label for the "New" button (e.g. "New Product") */
  newLabel?: string
  /** Called when the "New" button is clicked */
  onNew?: () => void

  // ── Row interaction ──
  /** Called when a row is clicked */
  onRowClick?: (row: TData) => void

  // ── Empty state ──
  /** Icon component for the empty state */
  emptyIcon?: React.ComponentType<{ className?: string }>
  /** Empty state message */
  emptyMessage?: string
  /** Empty state action label (e.g. "Create your first product") */
  emptyActionLabel?: string
  /** Called when the empty action is clicked */
  onEmptyAction?: () => void

  // ── Pagination ──
  /** Total item count (enables pagination when > pageSize) */
  total?: number
  /** Current page (1-indexed) */
  page?: number
  /** Page size (default: 25) */
  pageSize?: number
  /** Called when page changes */
  onPageChange?: (page: number) => void

  // ── Extra ──
  /** Additional content rendered between filters and table */
  toolbar?: React.ReactNode
  /** CSS class for the outer wrapper */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ListView<TData>({
  columns,
  data,
  loading = false,
  searchPlaceholder = 'Search...',
  search: controlledSearch,
  onSearchChange,
  searchDebounce = 300,
  tags,
  allTagLabel = 'All',
  activeTag,
  onTagChange,
  newLabel,
  onNew,
  onRowClick,
  emptyIcon: EmptyIcon,
  emptyMessage = 'No results found.',
  emptyActionLabel,
  onEmptyAction,
  total,
  page = 1,
  pageSize = 25,
  onPageChange,
  toolbar,
  className,
}: ListViewProps<TData>) {
  // Internal search state for debouncing
  const [internalSearch, setInternalSearch] = useState(controlledSearch ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Sync controlled → internal
  useEffect(() => {
    if (controlledSearch !== undefined) setInternalSearch(controlledSearch)
  }, [controlledSearch])

  const handleSearchChange = useCallback((value: string) => {
    setInternalSearch(value)
    if (searchDebounce === 0) {
      onSearchChange?.(value)
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onSearchChange?.(value), searchDebounce)
    }
  }, [onSearchChange, searchDebounce])

  // Pagination
  const totalItems = total ?? data.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const showPagination = onPageChange && totalItems > pageSize

  const showSearch = !!onSearchChange
  const showTags = tags && tags.length > 0 && onTagChange
  const showToolbar = showSearch || onNew || showTags

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Search + CTA row ── */}
      {showToolbar && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {showSearch && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={internalSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-input border border-input  bg-card shadow-[inset_0_1px_0_rgb(0_0_0_/0.06)] pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          {onNew && newLabel && (
            <Button variant="default" size="default" onClick={onNew} className="shrink-0">
              <Plus className="h-3.5 w-3.5" />
              {newLabel}
            </Button>
          )}
        </div>
      )}

      {/* ── Tag filters ── */}
      {showTags && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onTagChange!(undefined)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              !activeTag
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {allTagLabel}
          </button>
          {tags!.map((tag) => (
            <button
              key={tag.value}
              onClick={() => onTagChange!(tag.value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                activeTag === tag.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Extra toolbar ── */}
      {toolbar}

      {/* ── Table / Empty / Loading ── */}
      {loading ? (
        <DataTable columns={columns} data={[]} loading variant="card" />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border-2 border-dashed border-muted">
          {EmptyIcon && <EmptyIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />}
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyActionLabel && onEmptyAction && (
            <button onClick={onEmptyAction} className="text-xs text-primary hover:underline mt-1">
              {emptyActionLabel}
            </button>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          onRowClick={onRowClick}
          variant="card"
        />
      )}

      {/* ── Pagination ── */}
      {showPagination && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange!(page - 1)}
              disabled={page <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange!(page + 1)}
              disabled={page >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted bg-card shadow-button active:shadow-button-inset transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
