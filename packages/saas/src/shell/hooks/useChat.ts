import { useCallback, useMemo } from 'react'
import { useChatStore, type ChatMessage } from '../stores/chat.store'
import { useOrganizationStore } from '../stores/organization.store'
import { usePluginRuntimeOptional } from '../lib/plugins'
import { useRouter } from '../lib/router'
import { useTranslation } from './useTranslation'
import { useAITools } from './useAITools'
import {
  executeAITool,
  toAgentTools,
  type AIToolExecutionContext,
} from '../lib/ai-tool-handlers'
import {
  getFayzAgentClient,
  resolveFayzAgentConnection,
  type FayzAgentConnectionConfig,
} from '../lib/fayz-agent'
import type { FayzAgentToolResult } from '@fayz-ai/sdk/agent'

/**
 * Caps how many times the model may call tools before it must answer in prose.
 * Each round is a network turn, so a runaway loop is both slow and expensive.
 */
const MAX_TOOL_ROUNDS = 4

interface UseChatOptions {
  /** Bring-your-own backend. Takes precedence over the Fayz agent connection. */
  apiEndpoint?: string
  systemPrompt?: string
  /** Fayz agent overrides; defaults to the env the container injects. */
  agent?: FayzAgentConnectionConfig | false
}

export function useChat(options?: UseChatOptions) {
  const store = useChatStore()
  const runtime = usePluginRuntimeOptional()
  const router = useRouter()
  const { t } = useTranslation()
  const { tools } = useAITools()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const members = useOrganizationStore((s) => s.members)

  // The project's Fayz agent, resolved from the env the container injects. An
  // app-supplied apiEndpoint wins — that is an explicit opt-out.
  const connection = useMemo(
    () => (options?.apiEndpoint ? null : resolveFayzAgentConnection(options?.agent)),
    [options?.apiEndpoint, options?.agent],
  )

  // The assistant is only "real" when something backs it. Without a backend we
  // never fake a canned demo reply — the panel disables free-text input and, if
  // a suggestion chip is clicked anyway, we answer with a clear notice.
  const isConfigured = !!connection || !!options?.apiEndpoint

  /**
   * Run the agent turn loop against the project's Fayz agent.
   *
   * This is the follow-up the transport-only version of this hook described:
   * the tool catalog plugins declare (useAITools) is already JSON-Schema shaped,
   * so it forwards verbatim. Execution stays *client-plane* — the browser runs
   * each call against the session that is already open and hands results back —
   * because that is the only side that can touch the running UI (navigateTo) or
   * the tenant's own data session, and it keeps Fayz free of app credentials.
   * Server-plane tools (AgentTool grants) execute inside Fayz and never surface
   * here.
   */
  const runFayzAgentTurn = useCallback(
    async (content: string, activeConnection: NonNullable<typeof connection>) => {
      const toolContext: AIToolExecutionContext = {
        currentOrg,
        members,
        currentPath: runtime?.context.currentPath ?? '/',
        routes: (runtime?.navigation ?? []).map((n) => ({ path: n.route, label: n.label })),
        navigate: router.navigate,
      }

      const client = getFayzAgentClient(activeConnection)
      let toolResults: FayzAgentToolResult[] | undefined
      let message: string | undefined = content

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const response = await client.chat({
          message,
          toolResults,
          conversationId: useChatStore.getState().conversationId ?? undefined,
          tools: toAgentTools(tools),
          context: {
            currentPath: toolContext.currentPath,
            businessName: currentOrg?.name,
            ...(options?.systemPrompt ? { appGuidance: options.systemPrompt } : {}),
          },
        })
        store.setConversationId(response.conversationId)

        if (response.content) store.updateLastAssistant(response.content)
        if (response.toolCalls.length === 0) return

        // Last allowed round still asked for tools — stop looping and let
        // whatever prose came back stand.
        if (round === MAX_TOOL_ROUNDS) {
          if (!response.content) {
            store.updateLastAssistant('That took too many steps. Could you narrow the question?')
          }
          return
        }

        toolResults = await Promise.all(
          response.toolCalls.map(async (call) => ({
            toolCallId: call.id,
            content: (await executeAITool(call.name, call.arguments, toolContext)).content,
          })),
        )
        message = undefined
      }
    },
    [store, tools, runtime, router, currentOrg, members, options?.systemPrompt],
  )

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      store.addMessage(userMsg)

      if (!isConfigured) {
        // Honest non-configured state — no fake "demo response".
        store.addMessage({
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: t('chat.notConfigured'),
          timestamp: new Date().toISOString(),
        })
        return
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }
      store.addMessage(assistantMsg)
      store.setStreaming(true)

      try {
        if (connection) {
          await runFayzAgentTurn(content, connection)
          return
        }

        const response = await fetch(options!.apiEndpoint!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              ...(options?.systemPrompt
                ? [{ role: 'system', content: options.systemPrompt }]
                : []),
              ...store.messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content },
            ],
          }),
        })

        if (!response.ok) {
          store.updateLastAssistant('Sorry, something went wrong. Please try again.')
          return
        }

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content ?? data.content ?? 'No response.'
        store.updateLastAssistant(text)
      } catch {
        store.updateLastAssistant('Sorry, I could not connect. Please try again later.')
      } finally {
        store.setStreaming(false)
      }
    },
    [
      store,
      isConfigured,
      connection,
      runFayzAgentTurn,
      options?.apiEndpoint,
      options?.systemPrompt,
      t,
    ],
  )

  return {
    messages: store.messages,
    isOpen: store.isOpen,
    isStreaming: store.isStreaming,
    /** True when a real backend is wired — the project's Fayz agent or a custom endpoint. */
    isConfigured,
    sendMessage,
    toggleOpen: store.toggleOpen,
    setOpen: store.setOpen,
    reset: store.reset,
  }
}
