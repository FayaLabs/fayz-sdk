import { create } from 'zustand'
import type { DataProvider, CrudQuery } from '@fayz-ai/core'

export interface CrudState<T> {
  items: T[] | null
  total: number
  loading: boolean
  query: CrudQuery
}

export interface ImportBatchResult<T> {
  item?: T
  error?: string
}

export interface CrudActions<T> {
  fetch: () => Promise<void>
  create: (data: any) => Promise<T>
  /** Batch create without per-item list refetch. Calls onProgress after each batch. Single fetch at the end. */
  createMany: (
    rows: any[],
    options?: { batchSize?: number; onProgress?: (processed: number, total: number) => void },
  ) => Promise<{ success: number; results: ImportBatchResult<T>[] }>
  update: (id: string, data: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
  setQuery: (query: Partial<CrudQuery>) => void
  getById: (id: string) => T | undefined
}

export type CrudStore<T> = CrudState<T> & CrudActions<T>

export function createCrudStore<T extends { id: string }>(
  dataProvider: DataProvider<T>,
) {
  // Dedup: track the current in-flight fetch to avoid duplicate requests
  let inflightFetch: Promise<void> | null = null
  let lastQueryKey = ''

  function queryKey(query: CrudQuery): string {
    return JSON.stringify(query)
  }

  return create<CrudStore<T>>((set, get) => ({
    items: null,
    total: 0,
    loading: false,
    query: {},

    async fetch() {
      const currentKey = queryKey(get().query)

      // If we already have an in-flight request for the same query, reuse it
      if (inflightFetch && currentKey === lastQueryKey) {
        return inflightFetch
      }

      lastQueryKey = currentKey
      set({ loading: true })

      const promise = (async () => {
        try {
          const result = await dataProvider.list(get().query)
          set({ items: result.data, total: result.total, loading: false })
        } catch {
          set({ items: get().items ?? [], loading: false })
        } finally {
          inflightFetch = null
        }
      })()

      inflightFetch = promise
      return promise
    },

    async create(data) {
      const item = await dataProvider.create(data)
      inflightFetch = null // invalidate dedup cache
      lastQueryKey = ''
      await get().fetch()
      return item
    },

    async createMany(rows, options) {
      const batchSize = options?.batchSize ?? 10
      let success = 0
      const results: ImportBatchResult<T>[] = new Array(rows.length)

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const settled = await Promise.allSettled(
          batch.map((row) => dataProvider.create(row)),
        )
        for (let j = 0; j < settled.length; j++) {
          const r = settled[j]
          if (r.status === 'fulfilled' && r.value?.id) {
            success++
            results[i + j] = { item: r.value }
          } else {
            const msg = r.status === 'rejected' ? (r.reason?.message ?? 'Error') : 'No record returned'
            results[i + j] = { error: msg }
          }
        }
        options?.onProgress?.(Math.min(i + batch.length, rows.length), rows.length)
      }

      // Single list refresh after all inserts
      inflightFetch = null
      lastQueryKey = ''
      await get().fetch()

      return { success, results }
    },

    async update(id, data) {
      const item = await dataProvider.update(id, data)
      inflightFetch = null
      lastQueryKey = ''
      await get().fetch()
      return item
    },

    async remove(id) {
      await dataProvider.remove(id)
      // Optimistically drop the row so the list updates immediately. withCache
      // invalidates the table on remove() and the refetch below reconciles, but
      // the optimistic update guarantees the deleted row never lingers as a
      // "ghost" until a hard reload — even if the refetch is momentarily served
      // a stale, in-flight cached list.
      set((s) => ({
        items: s.items ? s.items.filter((item) => item.id !== id) : s.items,
        total: Math.max(0, s.total - 1),
      }))
      inflightFetch = null
      lastQueryKey = ''
      await get().fetch()
    },

    setQuery(partial) {
      set((s) => ({ query: { ...s.query, ...partial } }))
      queueMicrotask(() => get().fetch())
    },

    getById(id) {
      return (get().items ?? []).find((item) => item.id === id)
    },
  }))
}
