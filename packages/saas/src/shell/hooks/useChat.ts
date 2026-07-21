import { useCallback, useMemo } from 'react'
import {
  useChatStore,
  type ChatMessage,
  type ChatRecordLink,
  type ChatToolActivity,
} from '../stores/chat.store'
import { useOrganizationStore } from '../stores/organization.store'
// Same specifier AdminShell uses to render the signed-in user, so this reads
// the store AuthProvider actually populates. The shell's own stores/auth.store
// is a legacy shim that nothing fills — reading it sent every turn anonymous.
import { useAuthStore } from '@fayz-ai/auth'
import { usePluginRuntimeOptional } from '../lib/plugins'
import { useRouter } from '../lib/router'
import { useTranslation } from './useTranslation'
import { useAITools } from './useAITools'
import {
  buildAgentToolset,
  buildDataToolIndex,
  executeAITool,
  extractRecordLinks,
  type AIToolExecutionContext,
} from '../lib/ai-tool-handlers'
import { entityToolName, registryToolName } from '../lib/core-ai-tools'
import { getAllEntities } from '@fayz-ai/core'
import {
  getFayzAgentClient,
  resolveFayzAgentConnection,
  type FayzAgentConnectionConfig,
} from '../lib/fayz-agent'
import { FayzAgentError, type FayzAgentToolResult } from '@fayz-ai/sdk/agent'

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
  const { tools, activePluginId } = useAITools()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const members = useOrganizationStore((s) => s.members)
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.isLoading)

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
      const dataTools = buildDataToolIndex({
        registries: runtime?.registries ?? new Map(),
        entities: getAllEntities(),
        registryToolName,
        entityToolName,
      })
      const toolContext: AIToolExecutionContext = {
        currentOrg,
        members,
        currentPath: runtime?.context.currentPath ?? '/',
        routes: (runtime?.navigation ?? []).map((n) => ({ path: n.route, label: n.label })),
        navigate: router.navigate,
        dataTools,
      }
      const toolset = buildAgentToolset(tools, { dataTools, activePluginId })

      const client = getFayzAgentClient(activeConnection)
      let toolResults: FayzAgentToolResult[] | undefined
      let message: string | undefined = content
      let activity: ChatToolActivity[] = []
      const links: ChatRecordLink[] = []

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const response = await client.chat({
          message,
          toolResults,
          // Attribution: an INTERNAL channel rejects turns with no identity, and
          // without this every conversation lands in the owner's dashboard as
          // "Anonymous" even though a signed-in user sent it.
          externalUserId: user?.id,
          externalUserName: user?.fullName || user?.email,
          conversationId: useChatStore.getState().conversationId ?? undefined,
          tools: toolset,
          context: {
            // Temporal grounding. Without an explicit clock the model resolves
            // "tomorrow" against its training cutoff — it booked an appointment
            // in 2023 before this was sent. The browser is the only side that
            // knows the user's actual zone.
            now: new Date().toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
            currentPath: toolContext.currentPath,
            // What this app actually contains. Derived from the live navigation
            // rather than written into each agent, so an assistant knows its own
            // product on day one in any vertical — and can answer "where do I
            // add a professional?" instead of guessing at a generic answer.
            pages: toolContext.routes.map((r) => r.label ?? r.path).join(', '),
            businessName: currentOrg?.name,
            userName: user?.fullName || user?.email,
            ...(options?.systemPrompt ? { appGuidance: options.systemPrompt } : {}),
          },
        })
        store.setConversationId(response.conversationId)

        if (response.content) store.updateLastAssistant(response.content)
        if (response.toolCalls.length === 0) return

        // Show what it is doing while it does it — the same activity the Fayz
        // dashboard shows after the fact, but live.
        store.patchLastAssistant({
          activity: [
            ...activity,
            ...response.toolCalls.map((c) => ({ name: c.name, status: 'running' as const })),
          ],
        })

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

        activity = [...activity, ...response.toolCalls.map((c) => ({ name: c.name, status: 'done' as const }))]
        for (const result of toolResults) {
          for (const link of extractRecordLinks(result.content)) {
            if (!links.some((l) => l.url === link.url)) links.push(link)
          }
        }
        store.patchLastAssistant({ activity, links: links.length ? links : undefined })
        message = undefined
      }
    },
    [store, tools, activePluginId, runtime, router, currentOrg, members, user, options?.systemPrompt],
  )

  const sendMessage = useCallback(
    async (content: string) => {
      // The FAB and the panel each hold their own useChat over one shared
      // store, and callers guard on a value captured at render. Reading the
      // live state here is what actually stops a double submit from posting
      // the same message twice.
      if (useChatStore.getState().isStreaming) return

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      store.addMessage(userMsg)

      // The session is still resolving; an INTERNAL channel would reject a turn
      // that carries no identity yet.
      if (isConfigured && connection && authLoading) {
        store.addMessage({
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: t('chat.signingIn'),
          timestamp: new Date().toISOString(),
        })
        return
      }

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
      } catch (error) {
        // Surface the broker's own reason. Collapsing every failure into
        // "could not connect" hid a configuration error behind a network one.
        store.updateLastAssistant(
          error instanceof FayzAgentError && error.status < 500
            ? error.message
            : 'Sorry, I could not connect. Please try again later.',
        )
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
      authLoading,
      t,
    ],
  )

  // These read the store through getState rather than closing over `store`.
  // `useChatStore()` has no selector, so it returns a fresh object on every
  // state change — depending on it made loadHistory a new function after each
  // setHistory, which re-fired the panel's effect and looped on /conversations.
  /** Past conversations for this end user, so the panel can offer to resume. */
  const loadHistory = useCallback(async () => {
    if (!connection) return
    try {
      const list = await getFayzAgentClient(connection).listConversations(user?.id)
      useChatStore.getState().setHistory(list)
    } catch {
      // History is an affordance, not the feature — a failure here must never
      // block the user from simply typing.
      useChatStore.getState().setHistory([])
    }
  }, [connection, user?.id])

  const openConversation = useCallback(
    async (conversationId: string) => {
      if (!connection) return
      const state = useChatStore.getState()
      state.setStreaming(true)
      try {
        const conv = await getFayzAgentClient(connection).getConversation(conversationId, user?.id)
        state.setMessages(conv.messages)
        state.setConversationId(conv.id)
      } finally {
        useChatStore.getState().setStreaming(false)
      }
    },
    [connection, user?.id],
  )

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      if (!connection) return
      await getFayzAgentClient(connection).renameConversation(conversationId, title, user?.id)
      await loadHistory()
    },
    [connection, user?.id, loadHistory],
  )

  return {
    messages: store.messages,
    history: store.history,
    conversationId: store.conversationId,
    loadHistory,
    openConversation,
    renameConversation,
    startNewConversation: store.startNewConversation,
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
