import { describe, expect, it, vi } from 'vitest'
import {
  createFayzRuntimeClient,
  FayzRuntimeError,
} from './runtime'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createFayzRuntimeClient', () => {
  it('exchanges runtime-data tokens for broker tokens without sending provider credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      token: 'broker-token',
      tokenType: 'Bearer',
      expiresIn: 300,
      projectId: 'project-1',
      tenantKey: 'tenant-a',
      environment: 'preview',
      pluginId: '@fayz/plugin-agenda',
      grants: [{ grantId: 'grant-1', provider: 'google-calendar', scopes: ['calendar.read'] }],
    }))
    const client = createFayzRuntimeClient({
      baseUrl: 'https://api.fayz.ai/',
      projectId: 'project-1',
      runtimeToken: 'runtime-token',
      fetcher,
    })

    const response = await client.exchangePluginOAuth({
      pluginId: '@fayz/plugin-agenda',
      scopes: ['calendar.read'],
    })

    expect(response.token).toBe('broker-token')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.fayz.ai/api/v1/runtime/projects/project-1/oauth/exchange',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer runtime-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          pluginId: '@fayz/plugin-agenda',
          environment: 'preview',
          scopes: ['calendar.read'],
        }),
      }),
    )
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('clientSecret')
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('refreshToken')
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('accessToken')
  })

  it('calls Google Calendar broker routes with the short-lived plugin OAuth token', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ provider: 'google-calendar', calendarId: 'primary', events: [] }))
      .mockResolvedValueOnce(jsonResponse({ provider: 'google-calendar', calendarId: 'primary', event: { id: 'event-1' } }, 201))
      .mockResolvedValueOnce(jsonResponse({ provider: 'google-calendar', calendarId: 'primary', event: { id: 'event-1' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const client = createFayzRuntimeClient({
      baseUrl: 'https://api.fayz.ai',
      projectId: 'project-1',
      runtimeToken: 'runtime-token',
      fetcher,
    })
    const calendar = client.googleCalendar('broker-token')

    await calendar.listEvents({
      calendarId: 'primary',
      timeMin: '2026-06-14T00:00:00.000Z',
      timeMax: '2026-06-15T00:00:00.000Z',
      maxResults: 25,
    })
    await calendar.createEvent('primary', {
      summary: 'Haircut',
      start: { dateTime: '2026-06-14T09:00:00.000Z' },
      end: { dateTime: '2026-06-14T09:30:00.000Z' },
    })
    await calendar.updateEvent('primary', 'event-1', { summary: 'Updated haircut' })
    await calendar.deleteEvent('primary', 'event-1')

    expect(fetcher.mock.calls[0][0]).toBe(
      'https://api.fayz.ai/api/v1/runtime/projects/project-1/oauth/google-calendar/events?calendarId=primary&timeMin=2026-06-14T00%3A00%3A00.000Z&timeMax=2026-06-15T00%3A00%3A00.000Z&maxResults=25',
    )
    expect(fetcher.mock.calls[1][0]).toBe(
      'https://api.fayz.ai/api/v1/runtime/projects/project-1/oauth/google-calendar/events?calendarId=primary',
    )
    expect(fetcher.mock.calls[2][0]).toBe(
      'https://api.fayz.ai/api/v1/runtime/projects/project-1/oauth/google-calendar/events/event-1?calendarId=primary',
    )
    expect(fetcher.mock.calls[3][0]).toBe(
      'https://api.fayz.ai/api/v1/runtime/projects/project-1/oauth/google-calendar/events/event-1?calendarId=primary',
    )
    expect(fetcher.mock.calls[0][1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer broker-token' }),
    }))
    expect(fetcher.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect(fetcher.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'PATCH' }))
    expect(fetcher.mock.calls[3][1]).toEqual(expect.objectContaining({ method: 'DELETE' }))
  })

  it('keeps non-json upstream errors debuggable', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('upstream unavailable', { status: 502 }))
    const client = createFayzRuntimeClient({
      baseUrl: 'https://api.fayz.ai',
      projectId: 'project-1',
      runtimeToken: 'runtime-token',
      fetcher,
    })

    await expect(client.exchangePluginOAuth({ pluginId: '@fayz/plugin-agenda' }))
      .rejects.toMatchObject({
        name: 'FayzRuntimeError',
        status: 502,
        responseBody: 'upstream unavailable',
      } satisfies Partial<FayzRuntimeError>)
  })
})
