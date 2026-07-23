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
  /** Decision for a server-parked write (broker PENDING_CONFIRMATION step). */
  confirmAction?: { id: string; approved: boolean }
  /** Runtime context the agent should know about (page, locale, tenant). */
  context?: Record<string, unknown>
  signal?: AbortSignal
}

/** A server-plane write the broker parked pending human confirmation. */
export interface FayzAgentPendingAction {
  id: string
  toolName: string
  title?: string
  params?: Record<string, unknown>
}

export interface FayzAgentChatResponse {
  conversationId: string
  content: string
  toolCalls: FayzAgentToolCall[]
  /** Present when the broker is waiting on a confirmAction for this write. */
  pendingAction?: FayzAgentPendingAction
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

export interface FayzAgentConversationSummary {
  id: string
  title: string | null
  /** Last activity — the field the list is ordered by. */
  updatedAt: string
}

export interface FayzAgentConversationMessage {
  id: string
  role: string
  content: string
  createdAt: string
  /** Tool calls this reply made, with their results — so a resumed thread shows
   *  the same trace and record links it showed live. */
  toolCalls?: Array<{
    name: string
    arguments?: Record<string, unknown>
    result?: string
  }>
}

export interface FayzAgentConversationDetail {
  id: string
  title: string | null
  messages: FayzAgentConversationMessage[]
}

export interface FayzAgentClient {
  /** Identity of the agent behind the key, for rendering its name/icon. */
  getInfo(signal?: AbortSignal): Promise<FayzAgentInfo>
  chat(input: FayzAgentChatInput): Promise<FayzAgentChatResponse>
  /** The signed-in user's own threads, most-recently-active first. */
  listConversations(externalUserId?: string, signal?: AbortSignal): Promise<FayzAgentConversationSummary[]>
  /** One thread with its transcript — 404s on another user's thread. */
  getConversation(
    conversationId: string,
    externalUserId?: string,
    signal?: AbortSignal,
  ): Promise<FayzAgentConversationDetail>
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
        ...(body.pendingAction ? { pendingAction: body.pendingAction } : {}),
      }
    },

    async listConversations(externalUserId, signal) {
      const query = externalUserId ? `?externalUserId=${encodeURIComponent(externalUserId)}` : ''
      const body = await request<{ conversations?: FayzAgentConversationSummary[] }>(
        `/conversations${query}`,
        { method: 'GET', signal },
      )
      return body.conversations ?? []
    },

    async getConversation(conversationId, externalUserId, signal) {
      const query = externalUserId ? `?externalUserId=${encodeURIComponent(externalUserId)}` : ''
      const body = await request<{ conversation: FayzAgentConversationDetail }>(
        `/conversations/${encodeURIComponent(conversationId)}${query}`,
        { method: 'GET', signal },
      )
      return body.conversation
    },
  }
}
