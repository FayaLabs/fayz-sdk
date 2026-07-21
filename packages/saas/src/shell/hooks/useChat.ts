import { useCallback, useMemo } from 'react'
import { useChatStore, type ChatMessage } from '../stores/chat.store'
import { useOrganizationStore } from '../stores/organization.store'
// The REAL auth store — @fayz-ai/auth is what AuthProvider hydrates (and the
// same specifier AdminShell uses). shell/stores/auth.store is a legacy shim
// nothing fills; reading it here sent EVERY turn anonymous, which an INTERNAL
// channel rejects with AGENT_IDENTITY_REQUIRED (documented gotcha in
// fayz/docs/architecture/platform/agents.md — the fix had only landed in the
// retired -qa checkout).
import { useAuthStore } from '@fayz-ai/auth'
import { usePluginRuntimeOptional } from '../lib/plugins'
import { useRouter } from '../lib/router'
import { useTranslation } from './useTranslation'
import { useAITools } from './useAITools'
import {
  buildAgentToolset,
  buildDataToolIndex,
  executeAITool,
  type AIToolExecutionContext,
} from '../lib/ai-tool-handlers'
import { entityToolName, registryToolName } from '../lib/core-ai-tools'
import { getAllEntities, useManifest, type PluginAITool } from '@fayz-ai/core'
import { checkAccess, guardLimit } from '../../access/headless'
import { invalidateLimit } from '../../access/limits-registry'
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
  const { tools, activePluginId } = useAITools()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const members = useOrganizationStore((s) => s.members)
  const user = useAuthStore((s) => s.user)

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
  const manifest = useManifest()
  const serverPlane = manifest?.agent?.executionPlane === 'server'

  /**
   * Client-plane guard around a persist tool, mirroring the broker's
   * server-plane order: role→plan (checkAccess) → cap (guardLimit) → human
   * confirmation → execute → invalidate the consumed limit. A denial comes
   * back to the model as the structured AgentDenial, so the paywall/permission
   * explanation happens IN the conversation — never a silent failure
   * (docs/ENTITLEMENTS.md § agentes).
   */
  const executeGuarded = useCallback(
    async (
      call: { id: string; name: string; arguments: Record<string, unknown> },
      def: PluginAITool | undefined,
      toolContext: AIToolExecutionContext,
    ): Promise<string> => {
      if (def?.mode === 'persist') {
        if (def.permission) {
          const access = checkAccess(def.permission.feature, def.permission.action)
          if (!access.allowed) return JSON.stringify(access)
        }
        if (def.limitKey) {
          const limit = await guardLimit(def.limitKey)
          if (!limit.allowed) return JSON.stringify(limit)
        }
        if (def.requiresConfirmation !== false) {
          const approved = await useChatStore.getState().requestConfirmation({
            id: call.id,
            toolName: call.name,
            title: def.description,
            params: call.arguments,
            plane: 'client',
          })
          if (!approved) {
            return JSON.stringify({ ok: false, cancelled: true, reason: 'user_declined' })
          }
        }
      }
      const result = await executeAITool(call.name, call.arguments, toolContext)
      if (def?.mode === 'persist' && def.limitKey && result.ok) invalidateLimit(def.limitKey)
      return result.content
    },
    [],
  )

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
      // Server-plane flip (manifest agent.executionPlane): data/RPC tools stop
      // shipping from the surface — the broker executes them from the synced
      // contract; only genuinely client-plane tools still go up per request.
      const clientTools = serverPlane
        ? tools.filter((t) => t.execution?.plane !== 'server')
        : tools
      const toolset = buildAgentToolset(clientTools, { dataTools, activePluginId })
      const toolByName = new Map(tools.map((t) => [t.name, t]))

      const client = getFayzAgentClient(activeConnection)
      let toolResults: FayzAgentToolResult[] | undefined
      let confirmAction: { id: string; approved: boolean } | undefined
      let message: string | undefined = content

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const response = await client.chat({
          message,
          toolResults,
          confirmAction,
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

        // Server-parked write: the broker executed nothing and is waiting for a
        // human decision. Surface the card, send the decision back, continue.
        if (response.pendingAction) {
          const approved = await useChatStore.getState().requestConfirmation({
            id: response.pendingAction.id,
            toolName: response.pendingAction.toolName,
            title: response.pendingAction.title ?? response.pendingAction.toolName,
            params: response.pendingAction.params ?? {},
            plane: 'server',
          })
          confirmAction = { id: response.pendingAction.id, approved }
          message = undefined
          toolResults = undefined
          continue
        }
        confirmAction = undefined

        if (response.toolCalls.length === 0) return

        // Last allowed round still asked for tools — stop looping and let
        // whatever prose came back stand.
        if (round === MAX_TOOL_ROUNDS) {
          if (!response.content) {
            store.updateLastAssistant('That took too many steps. Could you narrow the question?')
          }
          return
        }

        // Live activity: surface WHICH tools are running while they run — the
        // agent's work should be visible, not a silent pause.
        const toolNames = response.toolCalls.map((c) => c.name)
        useChatStore.getState().setActiveTools(toolNames)
        useChatStore.getState().appendToolsToLastAssistant(toolNames)
        try {
          toolResults = await Promise.all(
            response.toolCalls.map(async (call) => ({
              toolCallId: call.id,
              content: await executeGuarded(call, toolByName.get(call.name), toolContext),
            })),
          )
        } finally {
          useChatStore.getState().setActiveTools([])
        }
        message = undefined
      }
    },
    [store, tools, serverPlane, executeGuarded, activePluginId, runtime, router, currentOrg, members, user, options?.systemPrompt],
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

  /** Refresh the signed-in user's thread list (history drawer). */
  const loadConversations = useCallback(async () => {
    if (!connection) return
    try {
      const rows = await getFayzAgentClient(connection).listConversations(user?.id)
      useChatStore.getState().setConversations(rows)
    } catch {
      // History is an enhancement — a failed load never breaks the chat.
    }
  }, [connection, user?.id])

  /** Resume a past thread: hydrate its transcript + continue under its id. */
  const resumeConversation = useCallback(
    async (conversationId: string) => {
      if (!connection) return
      try {
        const detail = await getFayzAgentClient(connection).getConversation(conversationId, user?.id)
        const messages: ChatMessage[] = detail.messages
          .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT' || m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            id: m.id,
            role: m.role.toLowerCase() === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.content,
            timestamp: m.createdAt,
          }))
        const s = useChatStore.getState()
        s.setMessages(messages)
        s.setConversationId(detail.id)
      } catch {
        // Thread gone (archived / another device cleaned it) — start fresh.
        useChatStore.getState().reset()
      }
    },
    [connection, user?.id],
  )

  /** Fresh thread: clear the transcript, next turn creates a new conversation. */
  const startNewConversation = useCallback(() => {
    store.reset()
  }, [store])

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
    /** Write awaiting human confirmation (render the ConfirmActionCard; the
     *  composer should stay disabled while set). */
    pendingAction: store.pendingAction,
    /** Card decision: true executes/approves, false declines. */
    resolvePendingAction: store.resolvePendingAction,
    /** Tool names executing right now (live activity chips). */
    activeTools: store.activeTools,
    /** History drawer data + actions. */
    conversations: store.conversations,
    loadConversations,
    resumeConversation,
    startNewConversation,
  }
}
