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
    runtime: {
      createClient: createFayzRuntimeClient,
    },
  }
}

export const fayz = createFayzClient()
