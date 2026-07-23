import { getSupabaseClientOptional } from './supabase'
import { getActiveTenantId } from '../tenant'

/**
 * Tenant-scoped row counter — the single cheap `count(*)` helper the access
 * engine uses to resolve quantity limits. Uses Supabase's `head:true` count so
 * no rows are transferred. Results are cached briefly per tenant+table+filter to
 * survive the burst of reads a page does (nav badge + gate + list), and can be
 * force-invalidated by creates via {@link invalidateCount}.
 *
 * MOCK MODE NEVER BLOCKS: with no global Supabase client the count is `0`, so
 * limits always read as "well under cap" — offline/demo apps stay fully usable.
 */

export interface CountByTenantOptions {
  /** Optional `kind` column filter for multi-kind tables. */
  kind?: string
  /** `'month'` counts rows created since the 1st of the current month; `'total'` (default) counts all. */
  period?: 'month' | 'total'
  /** Tenant override; defaults to the active tenant (getActiveTenantId). */
  tenantId?: string
  /** Skip the short-lived cache and hit the DB (used by fresh guard checks). */
  fresh?: boolean
}

const TTL_MS = 15_000

interface CacheEntry {
  value: number
  expires: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(table: string, tenantId: string, kind: string | undefined, period: string): string {
  return `${tenantId}::${table}::${kind ?? ''}::${period}`
}

function startOfMonthISO(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

/**
 * How long a usage count may take before we give up on it. Failing OPEN on an
 * error was always the policy (see below); a request that never settles is the
 * same failure with worse symptoms — a caller awaiting this (the create guards)
 * hangs forever, which reads to the user as a dead button. Observed on a cold
 * boot, where the query can be issued before the auth session is ready.
 */
const COUNT_TIMEOUT_MS = 5_000

/**
 * Count rows in `table` for the given (or active) tenant.
 * Returns 0 when no Supabase client is registered (mock mode).
 */
export async function countByTenant(table: string, options: CountByTenantOptions = {}): Promise<number> {
  const tenantId = options.tenantId ?? getActiveTenantId()
  if (!tenantId) return 0

  const period = options.period ?? 'total'
  const key = cacheKey(table, tenantId, options.kind, period)

  if (!options.fresh) {
    const hit = cache.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
  }

  const client = getSupabaseClientOptional() as {
    from: (t: string) => {
      select: (columns: string, opts: { count: 'exact'; head: true }) => {
        eq: (col: string, val: unknown) => unknown
      }
    }
  } | null

  // No client → mock/offline mode: never block.
  if (!client) return 0

  let query = client.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId) as {
    eq: (col: string, val: unknown) => unknown
    gte: (col: string, val: unknown) => unknown
  }

  if (options.kind) {
    query = query.eq('kind', options.kind) as typeof query
  }
  if (period === 'month') {
    query = query.gte('created_at', startOfMonthISO()) as typeof query
  }

  // On error OR timeout, fail OPEN (return 0) — a counting failure must never
  // wall a tenant out of their own product, and must never hang the UI awaiting
  // it. Enforcement's source of truth is the DB anyway.
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<{ count: null; error: unknown; timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ count: null, error: 'timeout', timedOut: true }), COUNT_TIMEOUT_MS)
  })
  const settled = await Promise.race([
    query as unknown as Promise<{ count: number | null; error: unknown }>,
    timeout,
  ])
  if (timer) clearTimeout(timer)

  const { count, error } = settled
  const value = error ? 0 : count ?? 0

  // A timed-out count is not a fact about the tenant — caching it would make one
  // slow request suppress the guard for the whole TTL.
  if (!(settled as { timedOut?: true }).timedOut) {
    cache.set(key, { value, expires: Date.now() + TTL_MS })
  }
  return value
}

/**
 * Drop cached counts. Called by create handlers (via invalidateLimit) so the
 * next read reflects the row they just added.
 *
 * @param tenantOrKey Substring matched against cache keys (a tenant id, a table
 *   name, or any fragment). Omit to clear the entire cache.
 */
export function invalidateCount(tenantOrKey?: string): void {
  if (!tenantOrKey) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(tenantOrKey)) cache.delete(key)
  }
}
