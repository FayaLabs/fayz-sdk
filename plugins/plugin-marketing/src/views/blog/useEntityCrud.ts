import { useMemo, useState, useCallback } from 'react'
import { resolveDataProvider } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

interface ListQuery {
  search?: string
  filters?: Record<string, unknown>
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

/**
 * Minimal store-less CRUD wiring for a plugin that owns its data + routing.
 * Resolves the generic Supabase provider from the EntityDef's `data.table`
 * (mock fallback when Supabase is not configured) and exposes list/get/save/
 * remove. Used by the blog backoffice list + form views — the heavy list/form
 * rendering stays in the shared CrudListView / CrudFormPage.
 */
export function useEntityCrud<T extends { id: string }>(entity: EntityDef<T>) {
  const provider = useMemo(() => resolveDataProvider<T>(entity), [entity])
  const [items, setItems] = useState<T[] | null>(null)
  const [total, setTotal] = useState(0)

  const fetch = useCallback(async (query: ListQuery = {}) => {
    try {
      const res = await provider.list(query as any)
      setItems(res.data)
      setTotal(res.total)
    } catch (err) {
      // Table not provisioned yet (migration not applied to this pool) or a
      // transient error — surface an empty list instead of a perpetual skeleton.
      console.warn('[blog] list failed; showing empty. Apply the plugin-blog migration to this pool.', err)
      setItems([])
      setTotal(0)
    }
  }, [provider])

  const getById = useCallback(async (id: string): Promise<T | null> => {
    const res = await provider.list({ filters: { id }, page: 1, pageSize: 1 } as any)
    return res.data[0] ?? null
  }, [provider])

  const create = useCallback((data: Record<string, unknown>) => provider.create(data as any), [provider])
  const update = useCallback((id: string, data: Record<string, unknown>) => provider.update(id, data as any), [provider])
  const remove = useCallback((id: string) => provider.remove(id), [provider])

  return { items, total, fetch, getById, create, update, remove }
}
