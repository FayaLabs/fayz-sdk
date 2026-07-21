import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { getActiveTenantId, getSupabaseClientOptional, registerTranslations } from '@fayz-ai/core'
import { ConversationsPage } from './ConversationsPage'
import type { ConversationsProvider } from './data/types'
import { createMockConversationsProvider } from './data/mock'
import { createSupabaseConversationsProvider } from './data/supabase'
import { createConversationsStore } from './store'
import { conversationsLocales } from './locales'
import { MIGRATION_001_CONVERSATIONS } from './migrations'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-conversations — the GoHighLevel "Conversations" equivalent:
// one omni-channel inbox (SMS / WhatsApp / Instagram / Email / Web chat).
// Universal plugin — reusable by any vertical (beauty, resto, agency…).
//
// Supabase-backed (plg_conversations / plg_conversation_messages, tenant-scoped
// via RLS) when a client is registered; a persisted mock inbox otherwise. Real
// channel connectors (Twilio, WhatsApp Cloud, Meta, IMAP) deliver inbound rows
// out-of-band; this plugin is the read/compose surface.
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
  // Real data when a Supabase client is registered; mock inbox otherwise.
  // Resolution is LAZY (per call): createConversationsPlugin runs at module
  // scope in the app config, BEFORE the Supabase client is registered — an
  // eager check here would capture the mock forever even on live backends.
  let real: ConversationsProvider | null = null
  let mock: ConversationsProvider | null = null
  const resolve = (): ConversationsProvider => {
    if (getSupabaseClientOptional()) {
      real ??= createSupabaseConversationsProvider({ tenantId: () => getActiveTenantId() })
      return real
    }
    mock ??= createMockConversationsProvider({ tenantId: () => getActiveTenantId() })
    return mock
  }
  return {
    listConversations: (...a) => resolve().listConversations(...a),
    getMessages: (...a) => resolve().getMessages(...a),
    sendMessage: (...a) => resolve().sendMessage(...a),
    markRead: (...a) => resolve().markRead(...a),
    setStatus: (...a) => resolve().setStatus(...a),
    createConversation: (...a) => resolve().createConversation(...a),
  }
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
    // Recurring monthly quota — counts conversation threads created this month.
    declaredLimits: [
      { key: 'conversations_month', label: 'Conversations this month', table: 'plg_conversations', period: 'month' },
    ],
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
    migrations: [
      {
        id: 'conversations-001-base-tables',
        version: '1.0.0',
        sql: MIGRATION_001_CONVERSATIONS,
        description: 'Create plg_conversations and plg_conversation_messages (tenant-scoped RLS)',
      },
    ],
    locales: conversationsLocales,
  }
}

export type { ConversationsProvider } from './data/types'
export type { Conversation, Message, Channel, CreateConversationInput } from './types'
export { createMockConversationsProvider, type MockConversationsConfig } from './data/mock'
export {
  createSupabaseConversationsProvider,
  type SupabaseConversationsConfig,
} from './data/supabase'
