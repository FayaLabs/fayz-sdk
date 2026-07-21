// ---------------------------------------------------------------------------
// @fayz-ai/plugin-conversations — domain types for the unified omni-channel
// inbox (the GoHighLevel "Conversations" equivalent). Provider-agnostic.
// ---------------------------------------------------------------------------

export type Channel = 'sms' | 'whatsapp' | 'instagram' | 'email' | 'webchat'

export type ConversationStatus = 'open' | 'snoozed' | 'closed'

export type MessageDirection = 'inbound' | 'outbound'

export interface Conversation {
  id: string
  contactName: string
  /** Phone, @handle, or email depending on channel */
  contactHandle: string
  channel: Channel
  lastMessagePreview: string
  lastMessageAt: string
  unreadCount: number
  status: ConversationStatus
  assignedTo?: string
  /** Tailwind-ish accent for the avatar bubble */
  accent: string
  tags: string[]
  // Optional context shown in the contact panel.
  location?: string
  note?: string
}

export interface Message {
  id: string
  conversationId: string
  channel: Channel
  direction: MessageDirection
  body: string
  at: string
  author: string
}

export interface ListConversationsQuery {
  channel?: Channel | 'all'
  status?: ConversationStatus | 'all'
  search?: string
}

export interface SendMessageInput {
  conversationId: string
  body: string
}

export interface CreateConversationInput {
  contactName: string
  /** Phone, @handle, or email depending on channel. */
  contactHandle?: string
  channel: Channel
  /** Optional first outbound message; stamps preview + last_message_at. */
  firstMessage?: string
  /** Optional free-text note surfaced in the contact panel. */
  note?: string
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Email',
  webchat: 'Web Chat',
}
