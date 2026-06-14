export interface FayzRuntimeClientOptions {
  baseUrl: string
  projectId: string
  runtimeToken: string
  fetcher?: typeof fetch
}

export type FayzRuntimeEnvironment = 'preview' | 'production'

export interface PluginOAuthExchangeInput {
  pluginId: string
  environment?: FayzRuntimeEnvironment
  scopes?: string[]
}

export interface RuntimePluginOAuthGrant {
  grantId: string
  provider: string
  scopes: string[]
}

export interface PluginOAuthExchangeResponse {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
  projectId: string
  tenantKey: string
  environment: FayzRuntimeEnvironment
  pluginId: string
  grants: RuntimePluginOAuthGrant[]
}

export interface GoogleCalendarEventTime {
  dateTime: string
  timeZone?: string
}

export interface GoogleCalendarEventInput {
  summary: string
  description?: string
  location?: string
  start: GoogleCalendarEventTime
  end: GoogleCalendarEventTime
  attendees?: Array<{ email: string }>
}

export interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status?: string
  htmlLink?: string
  [key: string]: unknown
}

export interface ListGoogleCalendarEventsInput {
  calendarId: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
  q?: string
}

export class FayzRuntimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody?: unknown,
  ) {
    super(message)
    this.name = 'FayzRuntimeError'
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function assertRequired(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${field} is required`)
  return normalized
}

function runtimePath(projectId: string, suffix: string): string {
  return `/api/v1/runtime/projects/${encodeURIComponent(projectId)}${suffix}`
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const value = search.toString()
  return value ? `?${value}` : ''
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
    const message = typeof body === 'object' && body && 'message' in body
      ? String((body as { message: unknown }).message)
      : `Fayz runtime request failed with status ${response.status}`
    throw new FayzRuntimeError(message, response.status, body)
  }

  return body as T
}

export function createFayzRuntimeClient(options: FayzRuntimeClientOptions) {
  const baseUrl = normalizeBaseUrl(assertRequired(options.baseUrl, 'baseUrl'))
  const projectId = assertRequired(options.projectId, 'projectId')
  const runtimeToken = assertRequired(options.runtimeToken, 'runtimeToken')
  const fetcher = options.fetcher ?? fetch

  async function request<T>(
    path: string,
    token: string,
    init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {},
  ): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    })
    return parseResponse<T>(response)
  }

  async function exchangePluginOAuth(input: PluginOAuthExchangeInput): Promise<PluginOAuthExchangeResponse> {
    return request<PluginOAuthExchangeResponse>(
      runtimePath(projectId, '/oauth/exchange'),
      runtimeToken,
      {
        method: 'POST',
        body: JSON.stringify({
          pluginId: input.pluginId,
          environment: input.environment ?? 'preview',
          ...(input.scopes ? { scopes: input.scopes } : {}),
        }),
      },
    )
  }

  function googleCalendar(pluginOAuthToken: string) {
    const brokerToken = assertRequired(pluginOAuthToken, 'pluginOAuthToken')
    const eventsPath = runtimePath(projectId, '/oauth/google-calendar/events')

    return {
      listEvents(input: ListGoogleCalendarEventsInput) {
        const calendarId = assertRequired(input.calendarId, 'calendarId')
        return request<{
          provider: 'google-calendar'
          calendarId: string
          timeMin: string
          timeMax: string
          events: GoogleCalendarEvent[]
        }>(
          `${eventsPath}${queryString({
            calendarId,
            timeMin: input.timeMin,
            timeMax: input.timeMax,
            maxResults: input.maxResults,
            q: input.q,
          })}`,
          brokerToken,
        )
      },
      createEvent(calendarId: string, event: GoogleCalendarEventInput) {
        return request<{ provider: 'google-calendar'; calendarId: string; event: GoogleCalendarEvent }>(
          `${eventsPath}${queryString({ calendarId: assertRequired(calendarId, 'calendarId') })}`,
          brokerToken,
          { method: 'POST', body: JSON.stringify(event) },
        )
      },
      updateEvent(calendarId: string, eventId: string, updates: Partial<GoogleCalendarEventInput>) {
        return request<{ provider: 'google-calendar'; calendarId: string; event: GoogleCalendarEvent }>(
          `${eventsPath}/${encodeURIComponent(assertRequired(eventId, 'eventId'))}${queryString({ calendarId: assertRequired(calendarId, 'calendarId') })}`,
          brokerToken,
          { method: 'PATCH', body: JSON.stringify(updates) },
        )
      },
      deleteEvent(calendarId: string, eventId: string) {
        return request<void>(
          `${eventsPath}/${encodeURIComponent(assertRequired(eventId, 'eventId'))}${queryString({ calendarId: assertRequired(calendarId, 'calendarId') })}`,
          brokerToken,
          { method: 'DELETE' },
        )
      },
    }
  }

  return {
    exchangePluginOAuth,
    googleCalendar,
  }
}
