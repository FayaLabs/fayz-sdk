import type { DataProvider, CrudQuery, CrudResult } from './types'

export interface SupabaseProviderConfig {
  schema?: string
  tenantId?: string | (() => string | undefined)
  tenantIdColumn?: string
  searchColumns?: string[]
  selectColumns?: string
  columnMap?: Record<string, string>
  filters?: Record<string, string>
  defaults?: Record<string, unknown>
  supabaseClient?: unknown
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function mapRow<T>(row: Record<string, unknown>, columnMap?: Record<string, string>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = columnMap?.[key] ?? snakeToCamel(key)
    result[camelKey] = value
  }
  return result as T
}

function mapEntity(entity: Record<string, unknown>, columnMap?: Record<string, string>): Record<string, unknown> {
  const reverseMap: Record<string, string> = {}
  if (columnMap) {
    for (const [snake, camel] of Object.entries(columnMap)) {
      reverseMap[camel] = snake
    }
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(entity)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'tenantId') continue
    const snakeKey = reverseMap[key] ?? camelToSnake(key)
    result[snakeKey] = value
  }
  return result
}

// Global Supabase client registry — set once via createFayzApp
let _globalSupabaseClient: unknown | null = null

export function setGlobalSupabaseClient(client: unknown): void {
  _globalSupabaseClient = client
}

export function getSupabaseClientOptional(): unknown | null {
  return _globalSupabaseClient
}

export function createSupabaseProvider<T extends { id: string }>(
  table: string,
  config?: SupabaseProviderConfig,
): DataProvider<T> {
  const schema = config?.schema ?? 'public'
  const tenantIdCol = config?.tenantIdColumn ?? 'tenant_id'
  const searchCols = config?.searchColumns ?? []
  const selectCols = config?.selectColumns ?? '*'
  const columnMap = config?.columnMap

  function resolveTenantId(): string | undefined {
    if (!config?.tenantId) return undefined
    return typeof config.tenantId === 'function' ? config.tenantId() : config.tenantId
  }

  function getClient() {
    const supabase = (config?.supabaseClient ?? _globalSupabaseClient) as {
      schema: (s: string) => unknown
      from: (t: string) => unknown
    } | null
    if (!supabase) throw new Error(`[@fayz-ai/core] Supabase client not available. Call createFayzApp with a provider first.`)
    return schema === 'public' ? (supabase as { from: (t: string) => unknown }) : (supabase.schema(schema) as { from: (t: string) => unknown })
  }

  return {
    async list(query: CrudQuery): Promise<CrudResult<T>> {
      let q = (getClient().from(table) as { select: (...args: unknown[]) => unknown })
        .select(selectCols, { count: 'exact' }) as Record<string, unknown>

      const tenantId = resolveTenantId()
      if (tenantId) q = (q as { eq: (col: string, val: string) => unknown }).eq(tenantIdCol, tenantId) as Record<string, unknown>

      if (config?.filters) {
        for (const [col, val] of Object.entries(config.filters)) {
          q = (q as { eq: (c: string, v: string) => unknown }).eq(col, val) as Record<string, unknown>
        }
      }

      if (query.search && searchCols.length > 0) {
        const term = `%${query.search}%`
        const orClause = searchCols.map((col) => `${camelToSnake(col)}.ilike.${term}`).join(',')
        q = (q as { or: (c: string) => unknown }).or(orClause) as Record<string, unknown>
      }

      if (query.sortBy) {
        q = (q as { order: (col: string, opts: unknown) => unknown })
          .order(camelToSnake(query.sortBy), { ascending: query.sortDir !== 'desc' }) as Record<string, unknown>
      } else {
        q = (q as { order: (col: string, opts: unknown) => unknown })
          .order('created_at', { ascending: false }) as Record<string, unknown>
      }

      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 50
      const from = (page - 1) * pageSize
      q = (q as { range: (f: number, t: number) => unknown }).range(from, from + pageSize - 1) as Record<string, unknown>

      const { data, error, count } = q as { data: Record<string, unknown>[] | null; error: unknown; count: number | null }
      if (error) throw error

      return {
        data: (data ?? []).map((row) => mapRow<T>(row, columnMap)),
        total: count ?? 0,
      }
    },

    async create(data) {
      const row = mapEntity(data as Record<string, unknown>, columnMap)
      const tenantId = resolveTenantId()
      if (tenantId) row[tenantIdCol] = tenantId
      if (config?.defaults) {
        for (const [col, val] of Object.entries(config.defaults)) {
          if (row[col] === undefined) row[col] = val
        }
      }

      const { data: created, error } = (await (getClient().from(table) as {
        insert: (r: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } }
      }).insert(row).select().single()) as { data: Record<string, unknown> | null; error: unknown }

      if (error) throw error
      return mapRow<T>(created!, columnMap)
    },

    async update(id, data) {
      const row = mapEntity(data as Record<string, unknown>, columnMap)
      const { data: updated, error } = (await (getClient().from(table) as {
        update: (r: unknown) => { eq: (c: string, v: string) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } } }
      }).update(row).eq('id', id).select().single()) as { data: Record<string, unknown> | null; error: unknown }

      if (error) throw error
      return mapRow<T>(updated!, columnMap)
    },

    async remove(id) {
      const { error } = (await (getClient().from(table) as {
        delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> }
      }).delete().eq('id', id)) as { error: unknown }
      if (error) throw error
    },
  }
}
