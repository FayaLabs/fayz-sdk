import { useOrganizationStore } from '../stores/organization.store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry<T = unknown> {
  data: T
  expiresAt: number
  lastAccess: number
}

export interface CacheStore {
  get<T>(key: string): T | undefined
  set<T>(key: string, data: T, ttl?: number): void
  /** Clear all entries whose key starts with `prefix` */
  invalidate(prefix: string): void
  clear(): void
  size(): number
}

export interface CacheConfig {
  /** Default time-to-live in ms (default: 60 000 — 1 minute) */
  defaultTTL?: number
  /** Maximum cached entries before LRU eviction (default: 500) */
  maxEntries?: number
}

// ---------------------------------------------------------------------------
// Stable key helper — deterministic JSON for cache keys
// ---------------------------------------------------------------------------

function sortDeep(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sortDeep)
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[k] = sortDeep((value as Record<string, unknown>)[k])
  }
  return sorted
}

export function stableKey(...parts: unknown[]): string {
  return parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(sortDeep(p)))).join(':')
}

// ---------------------------------------------------------------------------
// CacheStore implementation
// ---------------------------------------------------------------------------

export function createCacheStore(config?: CacheConfig): CacheStore {
  const defaultTTL = config?.defaultTTL ?? 60_000
  const maxEntries = config?.maxEntries ?? 500
  const entries = new Map<string, CacheEntry>()

  function evictLRU() {
    if (entries.size <= maxEntries) return
    // Find the entry with the oldest lastAccess
    let oldestKey: string | null = null
    let oldestAccess = Infinity
    for (const [key, entry] of entries) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess
        oldestKey = key
      }
    }
    if (oldestKey) entries.delete(oldestKey)
  }

  return {
    get<T>(key: string): T | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) {
        entries.delete(key)
        return undefined
      }
      entry.lastAccess = Date.now()
      return entry.data as T
    },

    set<T>(key: string, data: T, ttl?: number): void {
      const now = Date.now()
      entries.set(key, {
        data,
        expiresAt: now + (ttl ?? defaultTTL),
        lastAccess: now,
      })
      evictLRU()
    },

    invalidate(prefix: string): void {
      for (const key of entries.keys()) {
        if (key.startsWith(prefix)) {
          entries.delete(key)
        }
      }
    },

    clear(): void {
      entries.clear()
    },

    size(): number {
      return entries.size
    },
  }
}

// ---------------------------------------------------------------------------
// Global singleton — auto-flushes on tenant/org switch
// ---------------------------------------------------------------------------

export const globalCache = createCacheStore()

// Flush cache when the active organization changes
let lastOrgId: string | null | undefined
useOrganizationStore.subscribe((state) => {
  const orgId = state.currentOrg?.id ?? null
  if (lastOrgId !== undefined && orgId !== lastOrgId) {
    globalCache.clear()
  }
  lastOrgId = orgId
})
