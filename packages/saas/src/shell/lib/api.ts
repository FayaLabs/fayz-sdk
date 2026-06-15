type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiOptions {
  baseUrl?: string
  headers?: Record<string, string>
}

interface RequestOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(options: ApiOptions = {}) {
    this.baseUrl = options.baseUrl || ''
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization']
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method,
      headers: { ...this.defaultHeaders, ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new ApiError(response.status, error.message || response.statusText)
    }

    if (response.status === 204) return undefined as T
    return response.json()
  }

  get<T>(path: string, options?: RequestOptions) { return this.request<T>('GET', path, undefined, options) }
  post<T>(path: string, body?: unknown, options?: RequestOptions) { return this.request<T>('POST', path, body, options) }
  put<T>(path: string, body?: unknown, options?: RequestOptions) { return this.request<T>('PUT', path, body, options) }
  patch<T>(path: string, body?: unknown, options?: RequestOptions) { return this.request<T>('PATCH', path, body, options) }
  delete<T>(path: string, options?: RequestOptions) { return this.request<T>('DELETE', path, undefined, options) }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createApiClient(options?: ApiOptions) {
  return new ApiClient(options)
}
