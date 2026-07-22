import { create } from 'zustand'

/** A record the reply concerns — rendered as a "goto" button under the
 *  bubble. Semantic ref only (id + archetype/kind); the SURFACE resolves the
 *  URL against its own route map (agents.md: a missing link is correct, an
 *  invented one is a dead end). */
export interface ChatRecordLink {
  id: string
  label: string
  archetype?: string
  kind?: string
}

export interface ChatToolCall {
  name: string
  /** Pretty-printed arguments (may be empty). */
  args: string
  /** Result content, truncated for display. */
  result?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** Tool calls this assistant reply made, accumulated across rounds —
   *  rendered as an expandable trace under the bubble. */
  toolCalls?: ChatToolCall[]
  /** Records to offer as navigation buttons under the reply. */
  links?: ChatRecordLink[]
}

/**
 * A write the agent wants to perform, parked until the human decides. The turn
 * loop awaits the promise this action's resolver settles — the chat composer
 * stays frozen behind the card, mirroring the broker's PENDING_CONFIRMATION
 * step for server-plane tools.
 */
export interface PendingAgentAction {
  id: string
  toolName: string
  title: string
  params: Record<string, unknown>
  /** 'client' = executed locally after approval; 'server' = approval is sent
   *  back to the broker as confirmAction. */
  plane: 'client' | 'server'
}

interface ChatState {
  messages: ChatMessage[]
  isOpen: boolean
  isStreaming: boolean
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  addMessage: (message: ChatMessage) => void
  updateLastAssistant: (content: string) => void
  setStreaming: (streaming: boolean) => void
  setConversationId: (id: string | null) => void
  reset: () => void
  /**
   * Server-side thread id when talking to a Fayz agent. History lives in Fayz,
   * so subsequent turns only send the new message plus this id.
   */
  conversationId: string | null
  /** The write awaiting human confirmation (renders the ConfirmActionCard). */
  pendingAction: PendingAgentAction | null
  /** Park an action + register its decision resolver. */
  requestConfirmation: (action: PendingAgentAction) => Promise<boolean>
  /** Card buttons: settle the parked action. */
  resolvePendingAction: (approved: boolean) => void
  /** Tool names executing right now — rendered as live activity chips. */
  activeTools: string[]
  setActiveTools: (names: string[]) => void
  /** Record the tool calls an assistant reply made (expandable per-message trace). */
  appendToolCallsToLastAssistant: (calls: ChatToolCall[]) => void
  /** Attach goto-record buttons to the reply (deduped by id, capped). */
  appendLinksToLastAssistant: (links: ChatRecordLink[]) => void
  /** The signed-in user's threads (history drawer). */
  conversations: Array<{ id: string; title: string | null; updatedAt: string }>
  setConversations: (rows: Array<{ id: string; title: string | null; updatedAt: string }>) => void
  /** Replace the transcript wholesale (resuming a past conversation). */
  setMessages: (messages: ChatMessage[]) => void
}

// Module-level so the resolver never round-trips through React state.
let pendingResolver: ((approved: boolean) => void) | null = null

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: false,
  isStreaming: false,
  conversationId: null,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  updateLastAssistant: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      const lastIdx = msgs.length - 1
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content }
      }
      return { messages: msgs }
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setConversationId: (conversationId) => set({ conversationId }),
  reset: () => {
    pendingResolver?.(false)
    pendingResolver = null
    set({ messages: [], isStreaming: false, conversationId: null, pendingAction: null, activeTools: [] })
  },

  pendingAction: null,
  requestConfirmation: (action) => {
    // A newer request supersedes an unanswered one (treated as declined).
    pendingResolver?.(false)
    return new Promise<boolean>((resolve) => {
      pendingResolver = resolve
      set({ pendingAction: action })
    })
  },
  resolvePendingAction: (approved) => {
    const resolve = pendingResolver
    pendingResolver = null
    set({ pendingAction: null })
    resolve?.(approved)
  },

  activeTools: [],
  setActiveTools: (activeTools) => set({ activeTools }),
  appendToolCallsToLastAssistant: (calls) =>
    set((s) => {
      if (!calls.length) return s
      const msgs = [...s.messages]
      const lastIdx = msgs.length - 1
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], toolCalls: [...(msgs[lastIdx].toolCalls ?? []), ...calls] }
      }
      return { messages: msgs }
    }),
  appendLinksToLastAssistant: (links) =>
    set((s) => {
      if (!links.length) return s
      const msgs = [...s.messages]
      const lastIdx = msgs.length - 1
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        const seen = new Map((msgs[lastIdx].links ?? []).map((l) => [l.id, l]))
        for (const l of links) if (!seen.has(l.id)) seen.set(l.id, l)
        msgs[lastIdx] = { ...msgs[lastIdx], links: Array.from(seen.values()).slice(0, 3) }
      }
      return { messages: msgs }
    }),
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),
}))
