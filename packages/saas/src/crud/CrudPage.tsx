import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef as TanStackColumnDef } from '@tanstack/react-table'
import { useOrganizationStore } from '../org'
import { useTranslation } from '@fayz-ai/core'
import { Card } from '@fayz-ai/ui'
import { Button } from '@fayz-ai/ui'
import { CrudFormPage } from './CrudFormPage'
import { CrudListView, type CrudFacet } from './CrudListView'
import { CrudDetailPage } from './CrudDetailPage'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ImportWizard } from './ImportWizard'
import { exportToCSV } from './csv-export'
import { fieldToColumns } from './fieldToColumn'
import { PermissionGate } from '../permissions/PermissionGate'
import { useFieldRules } from '../hooks/useFieldRules'
import { deriveEntityKey } from '@fayz-ai/core'
import { toast } from '@fayz-ai/ui'
import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'
import type { CrudStore } from '../stores/createCrudStore'
import type { ImportRowError } from './ImportWizard'

type CrudDisplay = 'table' | 'cards'

interface CrudPageProps<T extends { id: string }> {
  entityDef: EntityDef<T>
  useStore: () => CrudStore<T>
  basePath: string
  display: CrudDisplay
  feature?: string
  /** If true, hides create/edit/delete actions — list and detail view only */
  readOnly?: boolean
}

function getRouteDepth(sub: string): number {
  if (sub === '' || sub === '/') return 0        // list
  if (sub === '/new') return 1                    // create
  if (sub.endsWith('/edit')) return 2             // edit
  return 1                                        // detail
}

function normalizeCrudBasePath(basePath: string): string {
  const normalized = `/${basePath}`.replace(/\/+/g, '/')
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function crudPath(basePath: string, ...parts: Array<string | undefined>): string {
  return normalizeCrudBasePath([basePath, ...parts.filter(Boolean)].join('/'))
}

function setCrudHash(basePath: string, ...parts: Array<string | undefined>): void {
  window.location.hash = crudPath(basePath, ...parts)
}

function useSubRoute(basePath: string) {
  const normalizedBasePath = normalizeCrudBasePath(basePath)
  const getSub = () => {
    const hash = normalizeCrudBasePath(window.location.hash.slice(1) || '/')
    if (hash === normalizedBasePath) return ''
    return hash.startsWith(`${normalizedBasePath}/`) ? hash.slice(normalizedBasePath.length) : ''
  }

  const [sub, setSub] = useState(getSub)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const prevDepthRef = useRef(getRouteDepth(getSub()))

  useEffect(() => {
    const handler = () => {
      const next = getSub()
      const nextDepth = getRouteDepth(next)
      setDirection(nextDepth > prevDepthRef.current ? 'forward' : 'back')
      prevDepthRef.current = nextDepth
      setSub(next)
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [normalizedBasePath])

  return { sub, direction }
}

/** Convert our FieldDef-based columns to TanStack ColumnDef for DataTable */
function useCrudColumns<T extends { id: string }>(
  entityDef: EntityDef<T>,
  options?: {
    basePath?: string
    onDelete?: (item: T) => void
    onInlineUpdate?: (id: string, field: string, value: any) => void
    feature?: string
    readOnly?: boolean
  },
): TanStackColumnDef<T, any>[] {
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'
  const cols = fieldToColumns(entityDef.fields, { onInlineUpdate: options?.onInlineUpdate })

  return useMemo(() => {
    const tanCols: TanStackColumnDef<T, any>[] = cols.map((col) => ({
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

    // Actions column
    if (!options?.readOnly && options?.basePath) {
      tanCols.push({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }: any) => {
          const id = row.original.id
          const editBtn = (
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCrudHash(options.basePath!, id, 'edit') }}>
              <Pencil className="h-4 w-4" />
            </Button>
          )
          const deleteBtn = options.onDelete ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); options.onDelete!(row.original) }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null
          return (
            <div className="flex items-center justify-end gap-1">
              {options.feature ? (
                <>
                  <PermissionGate feature={options.feature} action="edit">{editBtn}</PermissionGate>
                  {deleteBtn && <PermissionGate feature={options.feature} action="delete">{deleteBtn}</PermissionGate>}
                </>
              ) : (
                <>{editBtn}{deleteBtn}</>
              )}
            </div>
          )
        },
      })
    }

    return tanCols
  }, [cols, displayField, options?.basePath, options?.onDelete, options?.feature, options?.readOnly])
}

export function CrudPage<T extends { id: string }>({ entityDef: rawEntityDef, useStore, basePath, display, feature, readOnly }: CrudPageProps<T>) {
  const store = useStore()
  const t = useTranslation()
  const normalizedBasePath = normalizeCrudBasePath(basePath)
  const { sub, direction } = useSubRoute(normalizedBasePath)

  // Apply tenant field-rule overrides (required / visibility) before passing down
  const entityKey = deriveEntityKey(rawEntityDef)
  const { applyRules } = useFieldRules(entityKey)
  const entityDef = useMemo(() => ({
    ...rawEntityDef,
    fields: applyRules(rawEntityDef.fields),
  }), [rawEntityDef, applyRules]) as EntityDef<T>
  const [deleteItem, setDeleteItem] = useState<T | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string | undefined>>({})
  const activeFiltersRef = useRef<Record<string, string | undefined>>({})

  const namePlural = entityDef.namePlural ?? entityDef.name + 's'
  const displayField = entityDef.displayField ?? entityDef.fields[0]?.key ?? 'id'

  // Resolve declared facets (entityDef.facets) into pill options from each field.
  const resolvedFacets = useMemo<CrudFacet[]>(() => {
    return (entityDef.facets ?? []).map((f) => {
      const field = entityDef.fields.find((x) => x.key === f.field)
      const options = (field?.options ?? []).map((o) =>
        typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label },
      )
      return { field: f.field, options, allLabel: f.allLabel }
    })
  }, [entityDef])

  const handleFacetChange = useCallback((field: string, value: string | undefined) => {
    const next = { ...activeFiltersRef.current }
    if (value == null) delete next[field]
    else next[field] = value
    activeFiltersRef.current = next
    setActiveFilters(next)
    store.setQuery({ filters: next })
  }, [store])

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleInlineUpdate = useCallback(async (id: string, field: string, value: any) => {
    await store.update(id, { [field]: value } as any)
  }, [store])
  const tanColumns = useCrudColumns(entityDef, { basePath: normalizedBasePath, onDelete: readOnly ? undefined : (item) => setDeleteItem(item), onInlineUpdate: handleInlineUpdate, feature, readOnly })
  const currentOrgId = useOrganizationStore((s) => s.currentOrg?.id)

  useEffect(() => {
    if (currentOrgId) store.fetch()
  }, [currentOrgId])

  const navigateToList = () => { setCrudHash(normalizedBasePath) }
  const animClass = direction === 'forward' ? 'saas-nav-forward' : 'saas-nav-back'

  const handleImport = useCallback(async (
    rows: Record<string, any>[],
    onProgress: (processed: number, total: number) => void,
  ): Promise<{ success: number; errors: ImportRowError[] }> => {
    // Guard: refuse import if not connected to Supabase (would silently go to mock)
    if (!getSupabaseClientOptional() as any) {
      return {
        success: 0,
        errors: [{ row: 0, message: t('crud.import.noConnection') }],
      }
    }

    const { success, results } = await store.createMany(rows, {
      batchSize: 10,
      onProgress,
    })

    const errors: ImportRowError[] = []
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) {
        errors.push({ row: i + 2, message: results[i].error! })
      }
    }

    if (success > 0) {
      toast.success(t('crud.import.toastSuccess', { count: String(success) }))
    }
    return { success, errors }
  }, [store, t])

  const handleExport = useCallback(() => {
    const items = store.items
    if (!items || items.length === 0) {
      toast.error(t('crud.export.noData'))
      return
    }
    exportToCSV(items as any, entityDef)
    toast.success(t('crud.export.toastSuccess', { count: String(items.length) }))
  }, [store.items, entityDef, t])

  // Determine which view to show
  let viewKey = 'list'
  let content: React.ReactNode = null

  if (sub === '/new' && !readOnly) {
    viewKey = 'new'
    content = (
      <CrudFormPage
        entityDef={entityDef}
        mode="create"
        namePlural={namePlural}
        onCancel={navigateToList}
        onSubmit={async (data) => {
          await store.create(data)
          navigateToList()
        }}
      />
    )
  } else if (sub === '/new' && readOnly) {
    // readOnly — redirect back to list
    navigateToList()
  } else if (sub.endsWith('/edit') && !readOnly) {
    const id = sub.slice(1, -5)
    const item = store.getById(id)
    viewKey = `edit-${id}`

    if (!item && store.items === null) {
      content = (
        <div className="space-y-6 animate-pulse">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-20 rounded bg-muted" />
            <span className="text-muted-foreground">/</span>
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
          {/* Hero skeleton */}
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-7 w-48 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted mt-1" />
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="h-9 w-20 rounded-md bg-muted" />
              <div className="h-9 w-9 rounded-md bg-muted" />
            </div>
          </div>
          {/* Separator */}
          <div className="h-px bg-border" />
          {/* Tabs skeleton */}
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
          {/* Field rows skeleton */}
          <Card>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 px-5 py-3">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="col-span-2 h-4 w-32 rounded bg-muted" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )
    } else if (!item) {
      content = (
        <div className="space-y-6">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <button type="button" onClick={navigateToList} className="hover:text-foreground transition-colors">{namePlural}</button>
            <span>/</span>
            <span className="text-foreground font-medium">{t('common.notFound')}</span>
          </nav>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{t('crud.detail.notFound', { entity: entityDef.name })}</p>
            <Button onClick={navigateToList}>{t('crud.detail.backTo', { entities: namePlural })}</Button>
          </div>
        </div>
      )
    } else {
      content = (
        <CrudFormPage
          entityDef={entityDef}
          mode="edit"
          initialData={item as any}
          namePlural={namePlural}
          onCancel={() => { setCrudHash(normalizedBasePath, id) }}
          onSubmit={async (data) => {
            await store.update(id, data as Partial<T>)
            setCrudHash(normalizedBasePath, id)
          }}
        />
      )
    }
  } else if (sub.endsWith('/edit') && readOnly) {
    // readOnly — redirect to detail view
    const id = sub.slice(1, -5)
    setCrudHash(normalizedBasePath, id)
  } else if (sub.startsWith('/') && sub.length > 1) {
    // Parse /uuid or /uuid/tab-name
    const subParts = sub.slice(1).split('/')
    const id = subParts[0]
    const initialTab = subParts[1]?.split('?')[0] || undefined
    const item = store.getById(id)
    viewKey = `detail-${id}`

    if (!item && store.items === null) {
      content = (
        <div className="space-y-6 animate-pulse">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-20 rounded bg-muted" />
            <span className="text-muted-foreground">/</span>
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
          {/* Hero skeleton */}
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-7 w-48 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted mt-1" />
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="h-9 w-20 rounded-md bg-muted" />
              <div className="h-9 w-9 rounded-md bg-muted" />
            </div>
          </div>
          {/* Separator */}
          <div className="h-px bg-border" />
          {/* Tabs skeleton */}
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
          {/* Field rows skeleton */}
          <Card>
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 px-5 py-3">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="col-span-2 h-4 w-32 rounded bg-muted" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )
    } else if (!item) {
      content = (
        <div className="space-y-6">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <button type="button" onClick={navigateToList} className="hover:text-foreground transition-colors">{namePlural}</button>
            <span>/</span>
            <span className="text-foreground font-medium">{t('common.notFound')}</span>
          </nav>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{t('crud.detail.notFound', { entity: entityDef.name })}</p>
            <Button onClick={navigateToList}>{t('crud.detail.backTo', { entities: namePlural })}</Button>
          </div>
        </div>
      )
    } else {
      content = (
        <CrudDetailPage
          entityDef={entityDef}
          item={item as any}
          namePlural={namePlural}
          basePath={normalizedBasePath}
          initialTab={initialTab}
          onBack={navigateToList}
          onEdit={readOnly ? undefined : () => { setCrudHash(normalizedBasePath, id, 'edit') }}
          onDelete={readOnly ? undefined : () => setDeleteItem(item)}
          feature={feature}
        />
      )
    }
  } else {
    // List view — delegated to the shared CrudListView (header, search, facet
    // pills, table/cards). Data + routing stay here (store-backed).
    const handleSearch = (value: string) => {
      setSearchInput(value)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        store.setQuery({ search: value || undefined })
      }, 350)
    }

    const hasSearch = entityDef.fields.some((f) => f.searchable)

    content = (
      <CrudListView
        entityDef={entityDef}
        columns={tanColumns}
        items={store.items}
        total={store.total}
        display={display}
        search={searchInput}
        onSearchChange={hasSearch ? handleSearch : undefined}
        facets={resolvedFacets}
        activeFilters={activeFilters}
        onFacetChange={handleFacetChange}
        onNew={() => setCrudHash(normalizedBasePath, 'new')}
        onRowClick={(row) => setCrudHash(normalizedBasePath, (row as any).id)}
        onDelete={(item) => setDeleteItem(item)}
        onImport={() => setImportOpen(true)}
        onExport={handleExport}
        feature={feature}
        readOnly={readOnly}
      />
    )
  }

  const handleDeleteConfirm = () => {
    if (deleteItem) {
      store.remove((deleteItem as any).id)
      setDeleteItem(null)
      navigateToList()
    }
  }

  return (
    <>
      <div key={viewKey} className={animClass}>
        {content}
      </div>
      <DeleteConfirmDialog
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDeleteConfirm}
        entityName={entityDef.name}
        displayValue={deleteItem ? (deleteItem as any)[displayField] : undefined}
      />
      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityDef={entityDef as EntityDef<any>}
        onImport={handleImport}
      />
    </>
  )
}
