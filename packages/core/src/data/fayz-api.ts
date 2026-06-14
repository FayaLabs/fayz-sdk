import type { CrudQuery, CrudResult, DataProvider } from './types'

type FayzApiFilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'is_null' | 'is_not_null'

interface FayzApiTableFilter {
  column: string
  operator: FayzApiFilterOperator
  value?: unknown
}

export interface FayzApiProviderConfig {
  baseUrl?: string
  projectId?: string
  tenantId?: string | (() => string | undefined)
  tenantIdColumn?: string | false
  entityKey?: string
  table?: string
  schema?: string
  idColumn?: string
  searchColumns?: string[]
  runtimeToken?: string | (() => string | undefined | Promise<string | undefined>)
  headers?: () => HeadersInit | Promise<HeadersInit>
  fetcher?: typeof fetch
}

function resolveTenantId(config?: FayzApiProviderConfig): string | undefined {
  const tenantId = config?.tenantId
  return typeof tenantId === 'function' ? tenantId() : tenantId
}

async function resolveRuntimeToken(config?: FayzApiProviderConfig): Promise<string | undefined> {
  const runtimeToken = config?.runtimeToken
  return typeof runtimeToken === 'function' ? runtimeToken() : runtimeToken
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function appendQuery(
  url: URL,
  query: CrudQuery,
  tenantId?: string,
  tenantIdColumn = 'tenant_id',
  searchColumns: string[] = [],
): void {
  const filters = normalizeFilters(query.filters)
  if (query.search && searchColumns[0]) {
    filters.push({ column: searchColumns[0], operator: 'ilike', value: `%${query.search}%` })
  }
  if (query.sortBy) url.searchParams.set('sortColumn', query.sortBy)
  if (query.sortDir) url.searchParams.set('sortDirection', query.sortDir)
  if (query.page != null) url.searchParams.set('page', String(query.page))
  if (query.pageSize != null) url.searchParams.set('limit', String(query.pageSize))
  if (tenantId) filters.push({ column: tenantIdColumn, operator: 'eq', value: tenantId })
  if (filters.length > 0) url.searchParams.set('filters', JSON.stringify(filters))
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`[@fayz/core] Fayz API request failed (${response.status}): ${text || response.statusText}`)
  }
  return response.json() as Promise<T>
}

function isFilterOperator(value: unknown): value is FayzApiFilterOperator {
  return typeof value === 'string' && [
    'eq',
    'neq',
    'gt',
    'lt',
    'gte',
    'lte',
    'like',
    'ilike',
    'is_null',
    'is_not_null',
  ].includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeFilters(filters?: Record<string, unknown>): FayzApiTableFilter[] {
  if (!filters) return []
  return Object.entries(filters).map(([column, raw]) => {
    if (isRecord(raw) && isFilterOperator(raw.operator)) {
      return { column, operator: raw.operator, value: raw.value }
    }
    return { column, operator: 'eq', value: raw }
  })
}

export function createFayzApiProvider<T extends { id: string }>(
  entityOrTable: string,
  config: FayzApiProviderConfig = {},
): DataProvider<T> {
  const fetcher = config.fetcher ?? fetch
  const baseUrl = trimTrailingSlash(config.baseUrl ?? '')
  const projectId = config.projectId
  const table = config.table ?? entityOrTable
  const idColumn = config.idColumn ?? 'id'

  async function headers(runtimeToken?: string): Promise<HeadersInit> {
    return {
      'Content-Type': 'application/json',
      ...(config.headers ? await config.headers() : {}),
      ...(runtimeToken ? { Authorization: `Bearer ${runtimeToken}` } : {}),
    }
  }

  function tableRowsUrl(runtime = false): URL {
    const prefix = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const encodedProjectId = encodeURIComponent(projectId ?? 'current')
    const encodedTable = encodeURIComponent(table)
    const route = runtime
      ? `/api/v1/runtime/projects/${encodedProjectId}/database/tables/${encodedTable}/rows`
      : `/api/projects/${encodedProjectId}/database/tables/${encodedTable}/rows`
    const url = new URL(route, prefix)
    if (config.schema) url.searchParams.set('schema', config.schema)
    return url
  }

  function withTenant(data: Record<string, unknown>, runtime = false): Record<string, unknown> {
    if (runtime) return data
    const tenantId = resolveTenantId(config)
    if (!tenantId || config.tenantIdColumn === false) return data
    return { ...data, [config.tenantIdColumn ?? 'tenant_id']: tenantId }
  }

  function primaryKeys(id: string): Record<string, unknown> {
    return { [idColumn]: id }
  }

  async function listRows(query: CrudQuery): Promise<CrudResult<T>> {
    const runtimeToken = await resolveRuntimeToken(config)
    const runtime = Boolean(runtimeToken)
    const url = tableRowsUrl(runtime)
    appendQuery(
      url,
      query,
      runtime || config.tenantIdColumn === false ? undefined : resolveTenantId(config),
      config.tenantIdColumn || undefined,
      config.searchColumns,
    )
    const result = await parseResponse<{ rows: T[]; total: number }>(await fetcher(url, { headers: await headers(runtimeToken) }))
    return { data: result.rows, total: result.total }
  }

  async function assertTenantScopedRowExists(id: string, runtime = false): Promise<void> {
    if (runtime) return
    const tenantId = config.tenantIdColumn === false ? undefined : resolveTenantId(config)
    if (!tenantId) return

    const result = await listRows({ filters: { [idColumn]: id }, page: 1, pageSize: 1 })
    if (result.data.length === 0) {
      throw new Error(`[@fayz/core] Row "${id}" was not found for the active tenant.`)
    }
  }

  return {
    async list(query: CrudQuery): Promise<CrudResult<T>> {
      return listRows(query)
    },

    async create(data) {
      const runtimeToken = await resolveRuntimeToken(config)
      const runtime = Boolean(runtimeToken)
      return parseResponse<T>(await fetcher(tableRowsUrl(runtime), {
        method: 'POST',
        headers: await headers(runtimeToken),
        body: JSON.stringify(withTenant(data as Record<string, unknown>, runtime)),
      }))
    },

    async update(id, data) {
      const runtimeToken = await resolveRuntimeToken(config)
      const runtime = Boolean(runtimeToken)
      await assertTenantScopedRowExists(id, runtime)
      return parseResponse<T>(await fetcher(tableRowsUrl(runtime), {
        method: 'PATCH',
        headers: await headers(runtimeToken),
        body: JSON.stringify({ primaryKeys: primaryKeys(id), data }),
      }))
    },

    async remove(id) {
      const runtimeToken = await resolveRuntimeToken(config)
      const runtime = Boolean(runtimeToken)
      await assertTenantScopedRowExists(id, runtime)
      await parseResponse<{ deletedCount: number }>(await fetcher(tableRowsUrl(runtime), {
        method: 'DELETE',
        headers: await headers(runtimeToken),
        body: JSON.stringify({ rows: [primaryKeys(id)] }),
      }))
    },
  }
}
