import type { ConversationsProvider } from './types'
import { CHANNEL_ACCENT_HEX } from './accents'
import type {
  Conversation,
  Message,
  ListConversationsQuery,
  SendMessageInput,
  CreateConversationInput,
  ConversationStatus,
} from '../types'

// Deterministic relative timestamps (no Date.now at module init for stable seeds).
function minutesAgo(base: number, mins: number): string {
  return new Date(base - mins * 60_000).toISOString()
}

function seed(): { conversations: Conversation[]; messages: Message[] } {
  const base = new Date('2026-06-16T14:00:00Z').getTime()

  const conversations: Conversation[] = [
    {
      id: 'c1', contactName: 'Marina Alves', contactHandle: '+55 11 99876-1020', channel: 'whatsapp',
      lastMessagePreview: 'Perfect, can we book for Friday at 3pm?', lastMessageAt: minutesAgo(base, 4),
      unreadCount: 2, status: 'open', assignedTo: 'You', accent: '#22c55e', tags: ['Hot lead'],
      location: 'São Paulo, BR', note: 'Referred by Instagram ad — interested in full color + cut.',
    },
    {
      id: 'c2', contactName: 'Jordan Pierce', contactHandle: '+1 (415) 555-0142', channel: 'sms',
      lastMessagePreview: 'Got it — sending the deposit now.', lastMessageAt: minutesAgo(base, 22),
      unreadCount: 0, status: 'open', assignedTo: 'You', accent: '#6366f1', tags: ['Customer'],
      location: 'San Francisco, US',
    },
    {
      id: 'c3', contactName: '@thehairloft', contactHandle: 'thehairloft', channel: 'instagram',
      lastMessagePreview: 'Do you offer balayage on weekends?', lastMessageAt: minutesAgo(base, 51),
      unreadCount: 1, status: 'open', accent: '#ec4899', tags: ['New'],
    },
    {
      id: 'c4', contactName: 'David Whitman', contactHandle: 'david@whitman.co', channel: 'email',
      lastMessagePreview: 'Re: Proposal — looks great, one question on pricing…', lastMessageAt: minutesAgo(base, 95),
      unreadCount: 0, status: 'open', assignedTo: 'Sofia', accent: '#0ea5e9', tags: ['Proposal'],
      location: 'Austin, US', note: 'Evaluating the retainer tier. Decision expected this week.',
    },
    {
      id: 'c5', contactName: 'Website visitor', contactHandle: 'live chat · acme.com', channel: 'webchat',
      lastMessagePreview: 'Is anyone available to chat?', lastMessageAt: minutesAgo(base, 140),
      unreadCount: 0, status: 'snoozed', accent: '#f59e0b', tags: [],
    },
    {
      id: 'c6', contactName: 'Priya Nair', contactHandle: '+44 7700 900123', channel: 'whatsapp',
      lastMessagePreview: 'Thank you! See you next week 🙌', lastMessageAt: minutesAgo(base, 1440),
      unreadCount: 0, status: 'closed', assignedTo: 'You', accent: '#14b8a6', tags: ['Customer'],
      location: 'London, UK',
    },
  ]

  const messages: Message[] = [
    msg('m1', 'c1', 'whatsapp', 'inbound', 'Hi! I saw your ad — do you have availability this week?', 'Marina Alves', minutesAgo(base, 18)),
    msg('m2', 'c1', 'whatsapp', 'outbound', 'Hi Marina! Yes, we do. What service are you interested in?', 'You', minutesAgo(base, 15)),
    msg('m3', 'c1', 'whatsapp', 'inbound', 'A full color + cut.', 'Marina Alves', minutesAgo(base, 9)),
    msg('m4', 'c1', 'whatsapp', 'inbound', 'Perfect, can we book for Friday at 3pm?', 'Marina Alves', minutesAgo(base, 4)),

    msg('m5', 'c2', 'sms', 'outbound', 'Your appointment is confirmed for tomorrow at 10am.', 'You', minutesAgo(base, 40)),
    msg('m6', 'c2', 'sms', 'inbound', 'Got it — sending the deposit now.', 'Jordan Pierce', minutesAgo(base, 22)),

    msg('m7', 'c3', 'instagram', 'inbound', 'Do you offer balayage on weekends?', '@thehairloft', minutesAgo(base, 51)),

    msg('m8', 'c4', 'email', 'inbound', 'Re: Proposal — looks great, one question on pricing for the retainer tier.', 'David Whitman', minutesAgo(base, 95)),
    msg('m9', 'c4', 'email', 'outbound', 'Happy to walk you through it — are you free for a quick call tomorrow?', 'Sofia', minutesAgo(base, 80)),

    msg('m10', 'c5', 'webchat', 'inbound', 'Is anyone available to chat?', 'Website visitor', minutesAgo(base, 140)),

    msg('m11', 'c6', 'whatsapp', 'outbound', 'You are all set for next Tuesday. Anything else?', 'You', minutesAgo(base, 1500)),
    msg('m12', 'c6', 'whatsapp', 'inbound', 'Thank you! See you next week 🙌', 'Priya Nair', minutesAgo(base, 1440)),
  ]

  return { conversations, messages }
}

function msg(
  id: string, conversationId: string, channel: Message['channel'],
  direction: Message['direction'], body: string, author: string, at: string,
): Message {
  return { id, conversationId, channel, direction, body, author, at }
}

export interface MockConversationsConfig {
  /** Tenant id (value or getter) used to namespace the localStorage snapshot. */
  tenantId?: string | (() => string | undefined)
  /** Display name stamped as the author of outbound messages. */
  selfAuthor?: string
}

interface Snapshot {
  conversations: Conversation[]
  messages: Message[]
  counter: number
}

// ---------------------------------------------------------------------------
// In-memory mock inbox with best-effort localStorage persistence, so a browser
// reload keeps whatever the demo created/sent within the session. The store is
// namespaced per tenant; SSR / no-window environments degrade to pure memory.
// ---------------------------------------------------------------------------
export function createMockConversationsProvider(
  config?: MockConversationsConfig,
): ConversationsProvider {
  const selfAuthor = config?.selfAuthor ?? 'You'

  function resolveTenant(): string {
    const raw = typeof config?.tenantId === 'function' ? config.tenantId() : config?.tenantId
    return raw || 'default'
  }

  const storageKey = () => `saas:mock:conversations:${resolveTenant()}`

  function hasStorage(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage
    } catch {
      return false
    }
  }

  function load(): Snapshot {
    if (hasStorage()) {
      try {
        const raw = window.localStorage.getItem(storageKey())
        if (raw) {
          const parsed = JSON.parse(raw) as Snapshot
          if (Array.isArray(parsed.conversations) && Array.isArray(parsed.messages)) {
            return {
              conversations: parsed.conversations,
              messages: parsed.messages,
              counter: parsed.counter ?? 100,
            }
          }
        }
      } catch {
        // Corrupt snapshot — fall through to a fresh seed.
      }
    }
    const seeded = seed()
    return { conversations: seeded.conversations, messages: seeded.messages, counter: 100 }
  }

  const state = load()

  function persist(): void {
    if (!hasStorage()) return
    try {
      window.localStorage.setItem(
        storageKey(),
        JSON.stringify({
          conversations: state.conversations,
          messages: state.messages,
          counter: state.counter,
        } satisfies Snapshot),
      )
    } catch {
      // Quota / privacy mode — keep working in memory only.
    }
  }

  // Persist the initial seed so a first reload is already stable.
  persist()

  return {
    async listConversations(query?: ListConversationsQuery): Promise<Conversation[]> {
      let list = [...state.conversations]
      if (query?.channel && query.channel !== 'all') list = list.filter((c) => c.channel === query.channel)
      if (query?.status && query.status !== 'all') list = list.filter((c) => c.status === query.status)
      if (query?.search) {
        const q = query.search.toLowerCase()
        list = list.filter(
          (c) => c.contactName.toLowerCase().includes(q) || c.lastMessagePreview.toLowerCase().includes(q),
        )
      }
      return list.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    },

    async getMessages(conversationId: string): Promise<Message[]> {
      return state.messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.at.localeCompare(b.at))
    },

    async createConversation(input: CreateConversationInput): Promise<Conversation> {
      const now = new Date().toISOString()
      const firstMessage = input.firstMessage?.trim()
      const id = `c${++state.counter}`
      const conversation: Conversation = {
        id,
        contactName: input.contactName.trim(),
        contactPersonId: input.contactPersonId,
        contactHandle: input.contactHandle?.trim() ?? '',
        channel: input.channel,
        lastMessagePreview: firstMessage ?? '',
        lastMessageAt: now,
        unreadCount: 0,
        status: 'open',
        assignedTo: selfAuthor,
        accent: CHANNEL_ACCENT_HEX[input.channel],
        tags: [],
        note: input.note?.trim() || undefined,
      }
      state.conversations.unshift(conversation)
      if (firstMessage) {
        state.messages.push({
          id: `m${++state.counter}`,
          conversationId: id,
          channel: input.channel,
          direction: 'outbound',
          body: firstMessage,
          author: selfAuthor,
          at: now,
        })
      }
      persist()
      return conversation
    },

    async sendMessage(input: SendMessageInput): Promise<Message> {
      const conv = state.conversations.find((c) => c.id === input.conversationId)
      const created: Message = {
        id: `m${++state.counter}`,
        conversationId: input.conversationId,
        channel: conv?.channel ?? 'sms',
        direction: 'outbound',
        body: input.body,
        author: selfAuthor,
        at: new Date().toISOString(),
      }
      state.messages.push(created)
      if (conv) {
        conv.lastMessagePreview = input.body
        conv.lastMessageAt = created.at
        conv.unreadCount = 0
        if (conv.status === 'closed') conv.status = 'open'
      }
      persist()
      return created
    },

    async markRead(conversationId: string): Promise<void> {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (conv && conv.unreadCount !== 0) {
        conv.unreadCount = 0
        persist()
      }
    },

    async setStatus(conversationId: string, status: ConversationStatus): Promise<Conversation> {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) throw new Error('Conversation not found')
      conv.status = status
      persist()
      return conv
    },
  }
}
