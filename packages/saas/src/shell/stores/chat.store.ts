import { create } from 'zustand'
import { isAutoApproved, isDestructiveTool } from '../lib/agent-approvals'
import { clearRecordRefs } from '../lib/record-refs'

/** A record the reply concerns — rendered as a "goto" button under the
 *  bubble. Semantic ref only (id + archetype/kind); the SURFACE resolves the
 *  URL against its own route map (agents.md: a missing link is correct, an
 *  invented one is a dead end). */
export interface ChatRecordLink {
  id: string
  label: string
  archetype?: string
  kind?: string
  /** The route a non-archetype entity has — without it a product resolves to
   *  nothing and the goto button silently disappears. */
  entityKey?: string
}

export interface ChatToolCall {
  name: string
  /** Pretty-printed arguments (may be empty). */
  args: string
  /** Result content, truncated for display. */
  result?: string
  /** The write ran without asking because a standing grant covered it — the
   *  trace says so, so an auto-approved action is never a silent one. */
  autoApproved?: boolean
  /** The user (or a guard) turned this call down. */
  declined?: boolean
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
  /** Human title when the caller has one. A tool's `description` is written
   *  for the model and must never be used here. */
  title?: string
  params: Record<string, unknown>
  /** 'client' = executed locally after approval; 'server' = approval is sent
   *  back to the broker as confirmAction. */
  plane: 'client' | 'server'
  /** Entity this write targets. Auto-approval is remembered per tool+scope, so
   *  "always create clients" never becomes "always create anything". */
  scope?: string
  /** Human label for the remembered rule ("Criar Cliente"). */
  scopeLabel?: string
  /** Removes or voids data — grants for it never outlive the tab. */
  destructive?: boolean
  /** The target entity's declared fields, so the card can let the user correct
   *  what the model guessed and fill what it left out. */
  fields?: PendingActionField[]
}

export interface PendingActionField {
  key: string
  label?: string
  /** The entity's own `FieldType` — the card renders the matching control. */
  type?: string
  required?: boolean
  options?: Array<{ value: string; label?: string }>
  placeholder?: string
  hint?: string
  min?: number
  max?: number
  /** Shown, never edited: computed values, relations needing an option load,
   *  and anything the database fills in on its own. */
  readOnly?: boolean
}

/** What the card sends back: the decision, plus the values as edited. */
export interface PendingActionResult {
  approved: boolean
  values?: Record<string, unknown>
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
  /** Park an action + register its decision resolver. Resolves immediately
   *  when a standing auto-approval already covers it. */
  requestConfirmation: (action: PendingAgentAction) => Promise<PendingActionResult>
  /** Card buttons: settle the parked action, carrying the edited values. */
  resolvePendingAction: (approved: boolean, values?: Record<string, unknown>) => void
  /** Tool names auto-approved during the turn being rendered — the trace marks
   *  them so the user can see what ran unattended. */
  autoApprovedTools: string[]
  /** Speak short confirmations back. Persisted per browser. */
  voiceReplies: boolean
  setVoiceReplies: (enabled: boolean) => void
  /** Text handed to the composer for the user to check, edit and send. A
   *  suggestion fills the field; it never sends on the user's behalf. */
  draft: string
  setDraft: (text: string) => void
  /** Explicit delegation ("resolver com IA"): the user already said go, so the
   *  conversation sends this as soon as it can. Distinct from `draft`, which
   *  never sends on the user's behalf. */
  queuedPrompt: string | null
  queuePrompt: (text: string) => void
  consumeQueuedPrompt: () => string | null
  /** Suggestions panel is pinned open by the user (works mid-conversation). */
  suggestionsOpen: boolean
  setSuggestionsOpen: (open: boolean) => void
  /** "Talk" was tapped outside the panel — the composer starts listening as
   *  soon as it mounts, so one tap goes from anywhere to speaking. */
  voiceStartRequested: boolean
  requestVoiceStart: () => void
  consumeVoiceStart: () => void
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
let pendingResolver: ((result: PendingActionResult) => void) | null = null

const VOICE_REPLIES_KEY = 'fayz.agent.voice-replies'

function readVoiceRepliesPref(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(VOICE_REPLIES_KEY) === '1'
  } catch {
    return false
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
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
    pendingResolver?.({ approved: false })
    pendingResolver = null
    clearRecordRefs()
    set({
      messages: [],
      isStreaming: false,
      conversationId: null,
      pendingAction: null,
      activeTools: [],
      autoApprovedTools: [],
      // suggestionsOpen is a standing preference, not thread state.
    })
  },

  pendingAction: null,
  autoApprovedTools: [],
  requestConfirmation: (action) => {
    const destructive = action.destructive ?? isDestructiveTool(action.toolName)
    // Standing grant covers this exact tool+scope: run it, but record it so
    // the transcript still shows the write happened and on whose authority.
    if (isAutoApproved(action.toolName, action.scope)) {
      set((s) => ({
        autoApprovedTools: s.autoApprovedTools.includes(action.toolName)
          ? s.autoApprovedTools
          : [...s.autoApprovedTools, action.toolName],
      }))
      return Promise.resolve({ approved: true })
    }
    // A newer request supersedes an unanswered one (treated as declined).
    pendingResolver?.({ approved: false })
    return new Promise<PendingActionResult>((resolve) => {
      pendingResolver = resolve
      set({ pendingAction: { ...action, destructive } })
    })
  },
  resolvePendingAction: (approved, values) => {
    const resolve = pendingResolver
    pendingResolver = null
    set({ pendingAction: null })
    resolve?.({ approved, values })
  },

  voiceReplies: readVoiceRepliesPref(),
  setVoiceReplies: (enabled) => {
    try {
      localStorage?.setItem(VOICE_REPLIES_KEY, enabled ? '1' : '0')
    } catch {
      /* preference stays session-only */
    }
    set({ voiceReplies: enabled })
  },
  draft: '',
  setDraft: (draft) => set({ draft }),
  queuedPrompt: null,
  queuePrompt: (queuedPrompt) => set({ queuedPrompt, isOpen: true }),
  consumeQueuedPrompt: () => {
    const prompt = get().queuedPrompt
    if (prompt) set({ queuedPrompt: null })
    return prompt
  },
  // Open to begin with; collapsing sticks for the session.
  suggestionsOpen: true,
  setSuggestionsOpen: (suggestionsOpen) => set({ suggestionsOpen }),
  voiceStartRequested: false,
  requestVoiceStart: () => set({ isOpen: true, voiceStartRequested: true }),
  consumeVoiceStart: () => set({ voiceStartRequested: false }),

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
