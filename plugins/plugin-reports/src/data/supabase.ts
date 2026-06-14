import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { ReportDef, ReportQueryState } from '../types'
import type { ReportDataProvider, ReportResult } from './types'

// ---------------------------------------------------------------------------
// Case conversion
// ---------------------------------------------------------------------------

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function mapRow(row: Record<string, unknown>, columnMap?: Record<string, string>): Record<string, any> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = columnMap?.[key] ?? snakeToCamel(key)
    result[camelKey] = value
  }
  return result
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export interface SupabaseReportProviderConfig {
  tenantId: string | (() => string | undefined)
  tenantIdColumn?: string
  schema?: string
}

export function createSupabaseReportProvider(config: SupabaseReportProviderConfig): ReportDataProvider {
  const schema = config.schema ?? 'public'
  const tenantIdCol = config.tenantIdColumn ?? 'tenant_id'

  function resolveTenantId(): string | undefined {
    return typeof config.tenantId === 'function' ? config.tenantId() : config.tenantId
  }

  function getClient() {
    const supabase = getSupabaseClientOptional() as any
    if (!supabase) throw new Error('Supabase client not available')
    return schema === 'public' ? supabase : supabase.schema(schema)
  }

  return {
    async fetch(reportDef: ReportDef, query: ReportQueryState): Promise<ReportResult> {
      const { dataSource } = reportDef
      const columnMap = dataSource.columnMap

      if (dataSource.kind === 'rpc') {
        return fetchViaRpc(reportDef, query, getClient, resolveTenantId, columnMap)
      }

      return fetchViaView(reportDef, query, getClient, resolveTenantId, tenantIdCol, columnMap)
    },
  }
}

// ---------------------------------------------------------------------------
// View-based fetch
// ---------------------------------------------------------------------------

async function fetchViaView(
  reportDef: ReportDef,
  query: ReportQueryState,
  getClient: () => any,
  resolveTenantId: () => string | undefined,
  tenantIdCol: string,
  columnMap?: Record<string, string>,
): Promise<ReportResult> {
  const { dataSource } = reportDef
  let q = getClient().from(dataSource.name).select('*', { count: 'exact' })

  // Tenant scoping
  const tenantId = resolveTenantId()
  if (tenantId) {
    q = q.eq(tenantIdCol, tenantId)
  }

  // Date range
  const dateCol = dataSource.dateColumn ?? 'created_at'
  if (query.dateRange.from) {
    q = q.gte(dateCol, query.dateRange.from)
  }
  if (query.dateRange.to) {
    // For date-type columns, plain date string is sufficient.
    // For timestamptz columns, extend to end of day.
    const toValue = dateCol === 'created_at' || dateCol.endsWith('_at')
      ? query.dateRange.to + 'T23:59:59'
      : query.dateRange.to
    q = q.lte(dateCol, toValue)
  }

  // Custom filters
  for (const [key, value] of Object.entries(query.filters)) {
    if (value == null || value === '') continue
    const col = camelToSnake(key)
    if (Array.isArray(value)) {
      q = q.in(col, value)
    } else {
      q = q.eq(col, value)
    }
  }

  // Search
  if (query.search) {
    const searchableCols = reportDef.columns
      .filter((c) => c.type === 'text' || c.type === 'email')
      .map((c: any) => camelToSnake(c.key))
    if (searchableCols.length > 0) {
      const term = `%${query.search}%`
      const orClause = searchableCols.map((col) => `${col}.ilike.${term}`).join(',')
      q = q.or(orClause)
    }
  }

  // Sort
  const sortCol = query.sortBy
    ? camelToSnake(query.sortBy)
    : dataSource.defaultSort
      ? camelToSnake(dataSource.defaultSort)
      : dateCol
  const ascending = query.sortDir
    ? query.sortDir === 'asc'
    : dataSource.defaultSortDir
      ? dataSource.defaultSortDir === 'asc'
      : false
  q = q.order(sortCol, { ascending })

  // Pagination
  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1
  q = q.range(from, to)

  const { data, error, count } = await q

  if (error) throw error

  return {
    data: (data ?? []).map((row: any) => mapRow(row, columnMap)),
    total: count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// RPC-based fetch
// ---------------------------------------------------------------------------

async function fetchViaRpc(
  reportDef: ReportDef,
  query: ReportQueryState,
  getClient: () => any,
  resolveTenantId: () => string | undefined,
  columnMap?: Record<string, string>,
): Promise<ReportResult> {
  const { dataSource } = reportDef
  const tenantId = resolveTenantId()

  const params: Record<string, any> = {
    p_tenant_id: tenantId,
    p_from: query.dateRange.from,
    p_to: query.dateRange.to,
    p_page: query.page,
    p_page_size: query.pageSize,
  }

  // Custom filters
  for (const [key, value] of Object.entries(query.filters)) {
    if (value == null || value === '') continue
    params[`p_${camelToSnake(key)}`] = value
  }

  if (query.sortBy) {
    params.p_sort_by = camelToSnake(query.sortBy)
    params.p_sort_dir = query.sortDir ?? 'desc'
  }

  const { data, error } = await getClient().rpc(dataSource.name, params)
  if (error) throw error

  // RPC expected to return { data: [...], total: number }
  if (data && typeof data === 'object' && 'data' in data) {
    return {
      data: (data.data ?? []).map((row: any) => mapRow(row, columnMap)),
      total: data.total ?? 0,
    }
  }

  // Fallback: RPC returns a plain array
  const rows = Array.isArray(data) ? data : []
  return {
    data: rows.map((row: any) => mapRow(row, columnMap)),
    total: rows.length,
  }
}
