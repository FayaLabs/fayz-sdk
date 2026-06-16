import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { getSupabaseClientOptional, registerTranslations } from '@fayz-ai/core'
import { ConversationsPage } from './ConversationsPage'
import type { ConversationsProvider } from './data/types'
import { createMockConversationsProvider } from './data/mock'
import { createConversationsStore } from './store'
import { conversationsLocales } from './locales'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-conversations — the GoHighLevel "Conversations" equivalent:
// one omni-channel inbox (SMS / WhatsApp / Instagram / Email / Web chat).
// Universal plugin — reusable by any vertical (beauty, resto, agency…).
//
// M1 ships a full mock inbox. Real channel connectors (Twilio, WhatsApp Cloud,
// Meta, IMAP) + Supabase-backed threads land in a later milestone.
// ---------------------------------------------------------------------------

export interface ConversationsPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: ConversationsProvider
}

function createSafeProvider(): ConversationsProvider {
  // Supabase-backed provider lands in a later milestone; until then the mock
  // provider powers the inbox regardless of backend.
  void getSupabaseClientOptional()
  return createMockConversationsProvider()
}

export function createConversationsPlugin(options?: ConversationsPluginOptions): PluginManifest {
  registerTranslations(conversationsLocales)
  const provider = options?.dataProvider ?? createSafeProvider()
  const store = createConversationsStore(provider)

  const PageComponent: React.ComponentType<unknown> = () =>
    React.createElement(ConversationsPage, { store })
  PageComponent.displayName = 'ConversationsPage'

  return {
    id: 'conversations',
    name: options?.navLabel ?? 'Conversations',
    icon: 'MessageCircle',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [{ id: 'conversations', label: 'Conversations', group: 'Engage' }],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 1,
        label: options?.navLabel ?? 'Conversations',
        route: '/conversations',
        icon: 'MessageCircle',
        permission: { feature: 'conversations', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/conversations',
        component: PageComponent,
        fullBleed: true,
        permission: { feature: 'conversations', action: 'read' as const },
      },
    ],
    widgets: [],
    events: [
      { name: 'conversations.message.received', description: 'An inbound message arrived on any channel' },
      { name: 'conversations.message.sent', description: 'An outbound message was sent' },
    ],
    aiTools: [
      {
        id: 'conversations.list-threads',
        name: 'listConversations',
        description: 'Lists open conversations across all channels, optionally filtered by channel.',
        icon: 'MessageCircle',
        mode: 'read' as const,
        category: 'Conversations',
        parameters: {
          type: 'object' as const,
          properties: {
            channel: {
              type: 'string' as const,
              enum: ['all', 'sms', 'whatsapp', 'instagram', 'email', 'webchat'],
            },
          },
        },
        suggestions: [
          { label: 'Show unread conversations' },
          { label: 'Any new WhatsApp messages?' },
        ],
        permission: { feature: 'conversations', action: 'read' as const },
      },
      {
        id: 'conversations.send-message',
        name: 'sendMessage',
        description: 'Sends a reply in a conversation thread.',
        icon: 'Send',
        mode: 'persist' as const,
        category: 'Conversations',
        parameters: {
          type: 'object' as const,
          properties: {
            conversationId: { type: 'string' as const, description: 'Conversation id' },
            body: { type: 'string' as const, description: 'Message body' },
          },
          required: ['conversationId', 'body'],
        },
        permission: { feature: 'conversations', action: 'create' as const },
      },
    ],
    locales: conversationsLocales,
  }
}

export type { ConversationsProvider } from './data/types'
export type { Conversation, Message, Channel } from './types'
export { createMockConversationsProvider } from './data/mock'
