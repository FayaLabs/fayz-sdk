import { describe, expect, it, vi } from 'vitest'
import { createFayzClient } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createFayzClient', () => {
  it('normalizes Fayz API requests with app id and bearer token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ user: { id: 'user-1', email: 'vini@fayz.ai' } }))
    const client = createFayzClient({
      baseUrl: 'https://api.fayz.ai/',
      appId: 'app-1',
      token: 'session-token',
      fetcher,
    })

    const user = await client.auth.me()

    expect(user.id).toBe('user-1')
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.fayz.ai/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-App-Id': 'app-1',
          Authorization: 'Bearer session-token',
        }),
      }),
    )
  })

  it('accepts direct user responses for public auth/me compatibility', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'user-2' }))
    const client = createFayzClient({ baseUrl: 'https://api.fayz.ai', fetcher })

    await expect(client.auth.me()).resolves.toEqual({ id: 'user-2' })
  })

  it('lists project table rows through the Fayz data API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      rows: [{ id: 'booking-1' }],
      total: 12,
    }))
    const client = createFayzClient({
      baseUrl: 'https://api.fayz.ai',
      appId: 'app-1',
      token: async () => 'runtime-token',
      fetcher,
    })

    const result = await client.data.listRows<{ id: string }>({
      projectId: 'project 1',
      table: 'v_appointments',
      filters: [
        { column: 'starts_at', operator: 'gte', value: '2026-06-14T00:00:00.000Z' },
        { column: 'status', operator: 'neq', value: 'cancelled' },
      ],
      sortColumn: 'starts_at',
      sortDirection: 'asc',
      limit: 20,
      runtime: true,
    })

    expect(result.rows[0]?.id).toBe('booking-1')
    expect(result.total).toBe(12)

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toContain('https://api.fayz.ai/api/v1/runtime/projects/project%201/database/tables/v_appointments/rows?')
    expect(url).toContain('filters=')
    expect(url).toContain('sortColumn=starts_at')
    expect(url).toContain('sortDirection=asc')
    expect(url).toContain('limit=20')
    expect(init).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        'X-App-Id': 'app-1',
        Authorization: 'Bearer runtime-token',
      }),
    }))
  })

  it('counts table rows using the Fayz data API total', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      rows: [],
      total: 7,
    }))
    const client = createFayzClient({ baseUrl: 'https://api.fayz.ai', fetcher })

    await expect(client.data.countRows({
      projectId: 'project-1',
      table: 'clients',
      filters: [{ column: 'active', operator: 'eq', value: true }],
    })).resolves.toBe(7)

    const [url] = fetcher.mock.calls[0] ?? []
    expect(url).toContain('/api/projects/project-1/database/tables/clients/rows?')
    expect(url).toContain('page=1')
    expect(url).toContain('limit=1')
  })

  it('creates table rows through the Fayz data API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'menu-1', name: 'Burger' }, 201))
    const client = createFayzClient({
      baseUrl: 'https://api.fayz.ai',
      appId: 'app-1',
      token: 'runtime-token',
      fetcher,
    })

    const row = await client.data.createRow<{ id: string; name: string }>({
      projectId: 'project-1',
      table: 'menu_items',
      schema: 'public',
      runtime: true,
      row: { name: 'Burger' },
    })

    expect(row).toEqual({ id: 'menu-1', name: 'Burger' })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api.fayz.ai/api/v1/runtime/projects/project-1/database/tables/menu_items/rows?schema=public')
    expect(init).toEqual(expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Burger' }),
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-App-Id': 'app-1',
        Authorization: 'Bearer runtime-token',
      }),
    }))
  })

  it('updates table rows by primary key through the Fayz data API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'table-1', status: 'occupied' }))
    const client = createFayzClient({ baseUrl: 'https://api.fayz.ai', fetcher })

    const row = await client.data.updateRow<{ id: string; status: string }>({
      projectId: 'project-1',
      table: 'restaurant_tables',
      primaryKeys: { id: 'table-1' },
      row: { status: 'occupied' },
    })

    expect(row.status).toBe('occupied')

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api.fayz.ai/api/projects/project-1/database/tables/restaurant_tables/rows')
    expect(init).toEqual(expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        primaryKeys: { id: 'table-1' },
        data: { status: 'occupied' },
      }),
    }))
  })

  it('deletes table rows through the Fayz data API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ deletedCount: 1 }))
    const client = createFayzClient({ baseUrl: 'https://api.fayz.ai', fetcher })

    await expect(client.data.deleteRows({
      projectId: 'project-1',
      table: 'restaurant_tables',
      rows: [{ id: 'table-1' }],
    })).resolves.toEqual({ deletedCount: 1 })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api.fayz.ai/api/projects/project-1/database/tables/restaurant_tables/rows')
    expect(init).toEqual(expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ rows: [{ id: 'table-1' }] }),
    }))
  })
})
