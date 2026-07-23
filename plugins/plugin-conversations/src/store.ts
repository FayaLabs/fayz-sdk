import { createStore, type StoreApi } from 'zustand/vanilla'
import type { ConversationsProvider } from './data/types'
import type {
  Conversation,
  Message,
  Channel,
  ConversationStatus,
  CreateConversationInput,
} from './types'

export interface ConversationsUIState {
  conversations: Conversation[]
  messages: Message[]
  selectedId: string | null
  channelFilter: Channel | 'all'
  search: string
  loading: boolean
  sending: boolean

  load(): Promise<void>
  select(id: string): Promise<void>
  deselect(): void
  setChannelFilter(channel: Channel | 'all'): Promise<void>
  setSearch(search: string): Promise<void>
  create(input: CreateConversationInput): Promise<Conversation>
  send(body: string): Promise<void>
  setStatus(status: ConversationStatus): Promise<void>
}

export function createConversationsStore(
  provider: ConversationsProvider,
): StoreApi<ConversationsUIState> {
  return createStore<ConversationsUIState>((set, get) => ({
    conversations: [],
    messages: [],
    selectedId: null,
    channelFilter: 'all',
    search: '',
    loading: false,
    sending: false,

    async load() {
      set({ loading: true })
      const conversations = await provider.listConversations({
        channel: get().channelFilter,
        search: get().search || undefined,
      })
      const selectedId = get().selectedId ?? conversations[0]?.id ?? null
      set({ conversations, loading: false, selectedId })
      if (selectedId) await get().select(selectedId)
    },

    async select(id: string) {
      set({ selectedId: id })
      const messages = await provider.getMessages(id)
      set({ messages })
      await provider.markRead(id)
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      }))
    },

    deselect() {
      set({ selectedId: null, messages: [] })
    },

    async setChannelFilter(channel) {
      set({ channelFilter: channel })
      await get().load()
    },

    async setSearch(search) {
      set({ search })
      await get().load()
    },

    async create(input) {
      const created = await provider.createConversation(input)
      // The thread EXISTS the moment the insert returns, so resolve on that and
      // show it optimistically. Clear filters that would hide it, prepend it,
      // select it — all local.
      set((s) => ({
        channelFilter: 'all',
        search: '',
        conversations: [created, ...s.conversations.filter((c) => c.id !== created.id)],
        selectedId: created.id,
      }))

      // Reconciliation (authoritative list + the thread's messages) runs in the
      // BACKGROUND. It used to be awaited here, which made the caller — the
      // compose modal — hostage to two extra round-trips: on a slow pool the
      // conversation was already in the database while the modal sat open
      // looking broken, inviting a second click and a duplicate thread.
      // Failures are non-fatal: the optimistic row above already renders.
      void (async () => {
        try {
          const conversations = await provider.listConversations({})
          // Read-after-write guard: a refetch that races the insert may not
          // return the new row yet — keep the local one rather than dropping it.
          const merged = conversations.some((c) => c.id === created.id)
            ? conversations
            : [created, ...conversations]
          set({ conversations: merged })
          await get().select(created.id)
        } catch {
          /* optimistic state stands; the next load() reconciles */
        }
      })()

      return created
    },

    async send(body: string) {
      const id = get().selectedId
      if (!id || !body.trim()) return
      set({ sending: true })
      const created = await provider.sendMessage({ conversationId: id, body: body.trim() })
      set((s) => ({
        sending: false,
        messages: [...s.messages, created],
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, lastMessagePreview: created.body, lastMessageAt: created.at } : c,
        ),
      }))
    },

    async setStatus(status) {
      const id = get().selectedId
      if (!id) return
      const updated = await provider.setStatus(id, status)
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === id ? updated : c)),
      }))
    },
  }))
}
