import type { ConversationsProvider } from './types'
import type {
  Conversation,
  Message,
  ListConversationsQuery,
  SendMessageInput,
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

export function createMockConversationsProvider(): ConversationsProvider {
  const { conversations, messages } = seed()
  let counter = 100

  return {
    async listConversations(query?: ListConversationsQuery): Promise<Conversation[]> {
      let list = [...conversations]
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
      return messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.at.localeCompare(b.at))
    },

    async sendMessage(input: SendMessageInput): Promise<Message> {
      const conv = conversations.find((c) => c.id === input.conversationId)
      const created: Message = {
        id: `m${++counter}`,
        conversationId: input.conversationId,
        channel: conv?.channel ?? 'sms',
        direction: 'outbound',
        body: input.body,
        author: 'You',
        at: new Date().toISOString(),
      }
      messages.push(created)
      if (conv) {
        conv.lastMessagePreview = input.body
        conv.lastMessageAt = created.at
        conv.unreadCount = 0
        if (conv.status === 'closed') conv.status = 'open'
      }
      return created
    },

    async markRead(conversationId: string): Promise<void> {
      const conv = conversations.find((c) => c.id === conversationId)
      if (conv) conv.unreadCount = 0
    },

    async setStatus(conversationId: string, status: ConversationStatus): Promise<Conversation> {
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) throw new Error('Conversation not found')
      conv.status = status
      return conv
    },
  }
}
