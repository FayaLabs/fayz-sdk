/**
 * Client for the Fayz agent broker — the runtime surface a generated app uses
 * to reach the AI agent configured for its project in Fayz.
 *
 * Mirrors `createFayzShopProvider`: the app holds a publishable key, Fayz holds
 * the model credentials. The key ships in the bundle the same way a Supabase
 * anon key does; it only ever resolves to the one agent its web channel belongs
 * to, and the broker rate-limits per project.
 *
 * Tools are client-plane. The app declares what it can do (`tools`), the model
 * decides what to call, and the app executes the calls against its own session
 * before handing results back. Fayz never needs the app's data credentials.
 */

export interface FayzAgentClientOptions {
  /** Fayz API base, e.g. https://fayz.ai/api */
  baseUrl: string
  projectId: string
  /** Publishable key of the project's WEB agent channel. */
  publishableKey: string
  fetcher?: typeof fetch
}

export interface FayzAgentTool {
  name: string
  description: string
  /** JSON Schema for the tool's arguments. */
  parameters?: Record<string, unknown>
}

export interface FayzAgentToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface FayzAgentToolResult {
  toolCallId: string
  content: string
}

export interface FayzAgentChatInput {
  /** New end-user message. Omit when replying with tool results. */
  message?: string
  conversationId?: string
  /** Identity of the end user, required by channels with an INTERNAL audience. */
  externalUserId?: string
  /** Human label for that user, so the owner's dashboard shows a name. */
  externalUserName?: string
  tools?: FayzAgentTool[]
  toolResults?: FayzAgentToolResult[]
  /** Runtime context the agent should know about (page, locale, tenant). */
  context?: Record<string, unknown>
  signal?: AbortSignal
}

export interface FayzAgentChatResponse {
  conversationId: string
  content: string
  toolCalls: FayzAgentToolCall[]
}

export interface FayzAgentInfo {
  id: string
  name: string
  description: string | null
  icon: string | null
}

export class FayzAgentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'FayzAgentError'
  }
}

export interface FayzAgentClient {
  /** Identity of the agent behind the key, for rendering its name/icon. */
  getInfo(signal?: AbortSignal): Promise<FayzAgentInfo>
  chat(input: FayzAgentChatInput): Promise<FayzAgentChatResponse>
}

export function createFayzAgentClient(options: FayzAgentClientOptions): FayzAgentClient {
  const fetcher = options.fetcher ?? globalThis.fetch
  const base = `${options.baseUrl.replace(/\/+$/, '')}/public/projects/${options.projectId}/agents`
  const headers = {
    'Content-Type': 'application/json',
    'x-fayz-agent-key': options.publishableKey,
  }

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetcher(`${base}${path}`, { ...init, headers })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      throw new FayzAgentError(body?.error ?? `Agent request failed (${response.status})`, response.status)
    }
    return (await response.json()) as T
  }

  return {
    async getInfo(signal) {
      const body = await request<{ agent: FayzAgentInfo }>('/config', { method: 'GET', signal })
      return body.agent
    },

    async chat({ signal, ...input }) {
      const body = await request<Partial<FayzAgentChatResponse>>('/chat', {
        method: 'POST',
        body: JSON.stringify(input),
        signal,
      })
      return {
        conversationId: body.conversationId ?? '',
        content: body.content ?? '',
        toolCalls: body.toolCalls ?? [],
      }
    },
  }
}
