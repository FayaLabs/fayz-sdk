import type { DataProvider, CrudQuery, CrudResult } from './types'
import { globalCache, stableKey } from '../lib/cache'

export interface ProviderCacheOptions {
  /** Table/entity name — used as cache key namespace */
  table: string
  /** Dynamic tenant ID resolver */
  tenantId: () => string | undefined
  /** Override default TTL for this entity (ms) */
  ttl?: number
}

/**
 * Wraps a DataProvider with transparent read caching + mutation invalidation.
 *
 * - `list()` results are cached by query params
 * - `create()`, `update()`, `remove()` invalidate all cached entries for the table
 */
export function withCache<T extends { id: string }>(
  provider: DataProvider<T>,
  options: ProviderCacheOptions,
): DataProvider<T> {
  function prefix(): string {
    return `${options.tenantId() ?? '_'}:${options.table}`
  }

  return {
    async list(query: CrudQuery): Promise<CrudResult<T>> {
      const key = `${prefix()}:${stableKey(query)}`
      const cached = globalCache.get<CrudResult<T>>(key)
      if (cached) return cached

      const result = await provider.list(query)
      globalCache.set(key, result, options.ttl)
      return result
    },

    async create(data) {
      const result = await provider.create(data)
      globalCache.invalidate(prefix())
      return result
    },

    async update(id, data) {
      const result = await provider.update(id, data)
      globalCache.invalidate(prefix())
      return result
    },

    async remove(id) {
      await provider.remove(id)
      globalCache.invalidate(prefix())
    },
  }
}
