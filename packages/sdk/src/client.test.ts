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
})
