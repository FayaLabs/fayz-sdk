import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
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
    set({ messages: [], isStreaming: false, conversationId: null, pendingAction: null })
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
}))
