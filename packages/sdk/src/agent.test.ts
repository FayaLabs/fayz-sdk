import { describe, expect, it, vi } from 'vitest'

import { createFayzAgentClient, FayzAgentError } from './agent'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function client(fetcher: typeof fetch) {
  return createFayzAgentClient({
    baseUrl: 'http://localhost:5173/api',
    projectId: 'project-1',
    publishableKey: 'fayzpk_test',
    fetcher,
  })
}

describe('createFayzAgentClient', () => {
  it('targets the public broker and presents the publishable key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ conversationId: 'conv-1', content: 'Hi', toolCalls: [] }),
    )

    await client(fetcher).chat({ message: 'Hello' })

    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('http://localhost:5173/api/public/projects/project-1/agents/chat')
    expect((init?.headers as Record<string, string>)['x-fayz-agent-key']).toBe('fayzpk_test')
    expect(JSON.parse(init?.body as string)).toEqual({ message: 'Hello' })
  })

  it('forwards the tool catalog and returns the calls the model asked for', async () => {
    const toolCall = { id: 'call-1', name: 'getTeamMembers', arguments: { role: 'staff' } }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ conversationId: 'conv-1', content: '', toolCalls: [toolCall] }),
    )

    const response = await client(fetcher).chat({
      message: "Who's on my team?",
      tools: [
        {
          name: 'getTeamMembers',
          description: 'Lists team members.',
          parameters: { type: 'object', properties: { role: { type: 'string' } } },
        },
      ],
    })

    expect(response.toolCalls).toEqual([toolCall])
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string).tools).toHaveLength(1)
  })

  it('sends tool results with the conversation id and no new message', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ conversationId: 'conv-1', content: 'Ana and Bruno.', toolCalls: [] }),
    )

    const response = await client(fetcher).chat({
      conversationId: 'conv-1',
      toolResults: [{ toolCallId: 'call-1', content: '{"total":2}' }],
    })

    const body = JSON.parse(fetcher.mock.calls[0][1]?.body as string)
    expect(body).toEqual({
      conversationId: 'conv-1',
      toolResults: [{ toolCallId: 'call-1', content: '{"total":2}' }],
    })
    expect(response.content).toBe('Ana and Bruno.')
    expect(response.toolCalls).toEqual([])
  })

  it('tolerates a response that omits toolCalls', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ conversationId: 'conv-1', content: 'Hi' }),
    )

    const response = await client(fetcher).chat({ message: 'Hello' })

    expect(response.toolCalls).toEqual([])
  })

  it('surfaces the broker error message and status', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: 'Invalid agent key' }, 401))

    await expect(client(fetcher).chat({ message: 'Hello' })).rejects.toMatchObject({
      name: 'FayzAgentError',
      status: 401,
      message: 'Invalid agent key',
    })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('gateway down', { status: 502 }))

    await expect(client(fetcher).getInfo()).rejects.toThrow(FayzAgentError)
  })

  it('reads the agent identity from /config', async () => {
    const agent = { id: 'a-1', name: 'Glow', description: null, icon: '💇' }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ agent }))

    expect(await client(fetcher).getInfo()).toEqual(agent)
    expect(fetcher.mock.calls[0][0]).toBe(
      'http://localhost:5173/api/public/projects/project-1/agents/config',
    )
  })
})
