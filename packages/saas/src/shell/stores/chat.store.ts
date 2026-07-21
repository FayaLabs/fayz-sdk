import { create } from 'zustand'

export interface ChatConversationSummary {
  id: string
  title: string | null
  lastMessageAt: string
}

/** A tool the agent ran while producing an answer, shown inline as activity. */
export interface ChatToolActivity {
  name: string
  status: 'running' | 'done'
}

export interface ChatRecordLink {
  label: string
  url: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** What the agent did to answer, surfaced live as it happens. */
  activity?: ChatToolActivity[]
  /** Records the answer refers to, rendered as links the user can follow. */
  links?: ChatRecordLink[]
}

interface ChatState {
  messages: ChatMessage[]
  isOpen: boolean
  isStreaming: boolean
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  addMessage: (message: ChatMessage) => void
  updateLastAssistant: (content: string) => void
  /** Merge fields into the trailing assistant message (activity, links). */
  patchLastAssistant: (patch: Partial<ChatMessage>) => void
  setStreaming: (streaming: boolean) => void
  setConversationId: (id: string | null) => void
  setMessages: (messages: ChatMessage[]) => void
  setHistory: (history: ChatConversationSummary[]) => void
  /** Clears the transcript and detaches from the server thread. */
  startNewConversation: () => void
  reset: () => void
  /**
   * Server-side thread id when talking to a Fayz agent. History lives in Fayz,
   * so subsequent turns only send the new message plus this id.
   */
  conversationId: string | null
  /** The end user's past conversations, newest first. */
  history: ChatConversationSummary[]
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: false,
  isStreaming: false,
  conversationId: null,
  history: [],

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

  patchLastAssistant: (patch) =>
    set((s) => {
      const msgs = [...s.messages]
      const lastIdx = msgs.length - 1
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], ...patch }
      }
      return { messages: msgs }
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setConversationId: (conversationId) => set({ conversationId }),
  setMessages: (messages) => set({ messages }),
  setHistory: (history) => set({ history }),
  startNewConversation: () => set({ messages: [], conversationId: null, isStreaming: false }),
  reset: () => set({ messages: [], isStreaming: false, conversationId: null }),
}))
