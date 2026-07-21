import { describe, it, expect, beforeEach, vi } from 'vitest'
import { countByTenant, invalidateCount } from './count'
import { setGlobalSupabaseClient } from './supabase'
import { setActiveTenantId } from '../tenant'

// ---------------------------------------------------------------------------
// Mock Supabase client — a thenable query builder that records .eq/.gte calls.
// ---------------------------------------------------------------------------

interface MockClient {
  client: unknown
  selectCalls: number
  lastEq: Array<[string, unknown]>
  lastGte: Array<[string, unknown]>
  setCount: (n: number, error?: unknown) => void
}

function makeClient(initialCount = 0): MockClient {
  const state = { count: initialCount as number, error: null as unknown }
  const record: MockClient = {
    client: null,
    selectCalls: 0,
    lastEq: [],
    lastGte: [],
    setCount: (n, error = null) => {
      state.count = n
      state.error = error
    },
  }

  const query: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      record.lastEq.push([col, val])
      return query
    },
    gte: (col: string, val: unknown) => {
      record.lastGte.push([col, val])
      return query
    },
    then: (resolve: (r: { count: number; error: unknown }) => void) =>
      resolve({ count: state.count, error: state.error }),
  }

  record.client = {
    from: () => ({
      select: (_cols: string, _opts: unknown) => {
        record.selectCalls++
        return query
      },
    }),
  }
  return record
}

describe('countByTenant', () => {
  beforeEach(() => {
    invalidateCount() // clear all cached counts
    setGlobalSupabaseClient(null as unknown as object)
    setActiveTenantId('tenant-1')
  })

  it('returns 0 in mock mode (no supabase client) — never blocks', async () => {
    setGlobalSupabaseClient(null as unknown as object)
    expect(await countByTenant('clients')).toBe(0)
  })

  it('returns 0 when no tenant is resolvable', async () => {
    setActiveTenantId(undefined)
    const m = makeClient(5)
    setGlobalSupabaseClient(m.client as object)
    expect(await countByTenant('clients')).toBe(0)
  })

  it('counts tenant-scoped rows via head:true', async () => {
    const m = makeClient(42)
    setGlobalSupabaseClient(m.client as object)
    expect(await countByTenant('clients')).toBe(42)
    expect(m.lastEq).toContainEqual(['tenant_id', 'tenant-1'])
  })

  it('caches within the TTL (second read does not hit the DB)', async () => {
    const m = makeClient(10)
    setGlobalSupabaseClient(m.client as object)
    await countByTenant('clients')
    await countByTenant('clients')
    expect(m.selectCalls).toBe(1)
  })

  it('fresh:true bypasses the cache', async () => {
    const m = makeClient(10)
    setGlobalSupabaseClient(m.client as object)
    await countByTenant('clients')
    await countByTenant('clients', { fresh: true })
    expect(m.selectCalls).toBe(2)
  })

  it('invalidateCount(table) drops the cached value', async () => {
    const m = makeClient(10)
    setGlobalSupabaseClient(m.client as object)
    await countByTenant('clients')
    invalidateCount('clients')
    await countByTenant('clients')
    expect(m.selectCalls).toBe(2)
  })

  it('separate keys (kind/period) are cached independently', async () => {
    const m = makeClient(3)
    setGlobalSupabaseClient(m.client as object)
    await countByTenant('bookings', { period: 'month' })
    await countByTenant('bookings', { period: 'total' })
    expect(m.selectCalls).toBe(2)
  })

  it('applies kind filter and month window', async () => {
    const m = makeClient(7)
    setGlobalSupabaseClient(m.client as object)
    await countByTenant('items', { kind: 'product', period: 'month' })
    expect(m.lastEq).toContainEqual(['kind', 'product'])
    expect(m.lastGte.some(([col]) => col === 'created_at')).toBe(true)
  })

  it('fails open (returns 0) when the query errors', async () => {
    const m = makeClient(0)
    m.setCount(0, new Error('boom'))
    setGlobalSupabaseClient(m.client as object)
    expect(await countByTenant('clients')).toBe(0)
  })
})
