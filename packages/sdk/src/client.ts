import { appParams } from './app-params'
import { createFayzRuntimeClient } from './runtime'
import type { FayzAuthMeResponse, FayzUser } from './types'

export interface FayzClientOptions {
  baseUrl?: string
  token?: string | (() => string | undefined | Promise<string | undefined>)
  appId?: string
  fetcher?: typeof fetch
}

export interface FayzRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  token?: string
}

export type FayzTableFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is_null'
  | 'is_not_null'

export interface FayzTableFilter {
  column: string
  operator: FayzTableFilterOperator
  value?: unknown
}

export interface FayzTableListOptions {
  projectId?: string
  table: string
  schema?: string
  filters?: FayzTableFilter[]
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  page?: number
  limit?: number
  runtime?: boolean
}

export interface FayzTableListResponse<T> {
  rows: T[]
  total: number
}

export interface FayzTableMutationOptions {
  projectId?: string
  table: string
  schema?: string
  runtime?: boolean
}

export interface FayzTableCreateOptions<T = Record<string, unknown>> extends FayzTableMutationOptions {
  row: T
}

export interface FayzTableUpdateOptions<T = Record<string, unknown>> extends FayzTableMutationOptions {
  primaryKeys: Record<string, unknown>
  row: Partial<T>
}

export interface FayzTableDeleteOptions extends FayzTableMutationOptions {
  rows: Record<string, unknown>[]
}

export interface FayzTableDeleteResponse {
  deletedCount: number
}

export class FayzApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: unknown,
  ) {
    super(message)
    this.name = 'FayzApiError'
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function apiPath(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.startsWith('/api/') ? normalized : `/api${normalized}`
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const text = await response.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    body = text
  }

  if (!response.ok) {
    const message = typeof body === 'object' && body
      ? String((body as { message?: unknown; error?: unknown }).message ?? (body as { error?: unknown }).error ?? `Fayz API request failed with status ${response.status}`)
      : `Fayz API request failed with status ${response.status}`
    throw new FayzApiError(message, response.status, body)
  }

  return body as T
}

async function resolveToken(token: FayzClientOptions['token']): Promise<string | undefined> {
  return typeof token === 'function' ? token() : token
}

function unwrapUser(body: FayzUser | FayzAuthMeResponse): FayzUser {
  return typeof body === 'object' && body && 'user' in body
    ? (body as FayzAuthMeResponse).user
    : body as FayzUser
}

function tableRowsPath(options: FayzTableListOptions): string {
  const route = tableRowsRoute(options)
  const params = new URLSearchParams()

  if (options.schema) params.set('schema', options.schema)
  if (options.filters?.length) params.set('filters', JSON.stringify(options.filters))
  if (options.sortColumn) params.set('sortColumn', options.sortColumn)
  if (options.sortDirection) params.set('sortDirection', options.sortDirection)
  if (options.page != null) params.set('page', String(options.page))
  if (options.limit != null) params.set('limit', String(options.limit))

  const query = params.toString()
  return query ? `${route}?${query}` : route
}

function tableRowsRoute(options: FayzTableMutationOptions): string {
  const projectId = encodeURIComponent(options.projectId ?? appParams.projectId ?? 'current')
  const table = encodeURIComponent(options.table)
  return options.runtime
    ? `/api/v1/runtime/projects/${projectId}/database/tables/${table}/rows`
    : `/api/projects/${projectId}/database/tables/${table}/rows`
}

function mutationRowsPath(options: FayzTableMutationOptions): string {
  const route = tableRowsRoute(options)
  const params = new URLSearchParams()

  if (options.schema) params.set('schema', options.schema)

  const query = params.toString()
  return query ? `${route}?${query}` : route
}

export function createFayzClient(options: FayzClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? appParams.apiBaseUrl)
  const fetcher = options.fetcher ?? fetch
  const appId = options.appId ?? appParams.appId
  const token = options.token ?? appParams.token

  async function request<T>(path: string, init: FayzRequestOptions = {}): Promise<T> {
    const requestToken = init.token ?? await resolveToken(token)
    const headers: Record<string, string> = {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(appId ? { 'X-App-Id': appId } : {}),
      ...init.headers,
      ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
    }
    const response = await fetcher(`${baseUrl}${apiPath(path)}`, {
      ...init,
      headers,
    })
    return parseResponse<T>(response)
  }

  return {
    request,
    auth: {
      async me(): Promise<FayzUser> {
        return unwrapUser(await request<FayzUser | FayzAuthMeResponse>('/auth/me'))
      },
    },
    data: {
      async listRows<T = Record<string, unknown>>(options: FayzTableListOptions): Promise<FayzTableListResponse<T>> {
        return request<FayzTableListResponse<T>>(tableRowsPath(options))
      },
      async countRows(options: FayzTableListOptions): Promise<number> {
        const response = await request<FayzTableListResponse<unknown>>(tableRowsPath({
          ...options,
          page: options.page ?? 1,
          limit: 1,
        }))
        return response.total
      },
      async createRow<T = Record<string, unknown>>(options: FayzTableCreateOptions<Partial<T>>): Promise<T> {
        return request<T>(mutationRowsPath(options), {
          method: 'POST',
          body: JSON.stringify(options.row),
        })
      },
      async updateRow<T = Record<string, unknown>>(options: FayzTableUpdateOptions<T>): Promise<T> {
        return request<T>(mutationRowsPath(options), {
          method: 'PATCH',
          body: JSON.stringify({
            primaryKeys: options.primaryKeys,
            data: options.row,
          }),
        })
      },
      async deleteRows(options: FayzTableDeleteOptions): Promise<FayzTableDeleteResponse> {
        return request<FayzTableDeleteResponse>(mutationRowsPath(options), {
          method: 'DELETE',
          body: JSON.stringify({ rows: options.rows }),
        })
      },
    },
    runtime: {
      createClient: createFayzRuntimeClient,
    },
  }
}

export const fayz = createFayzClient()
