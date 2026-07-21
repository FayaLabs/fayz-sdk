import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { ConversationsProvider } from './types'
import { T } from './tables'
import { CHANNEL_ACCENT_HEX } from './accents'
import type {
  Conversation,
  Message,
  ListConversationsQuery,
  SendMessageInput,
  CreateConversationInput,
  ConversationStatus,
} from '../types'

// ---------------------------------------------------------------------------
// Supabase-backed conversations provider — reads/writes the project's
// `conversations` + `conversation_messages` tables (tenant-scoped via RLS +
// an explicit tenant filter from the active-org context). Mirrors the inline
// client-casting style of @fayz-ai/core's createSupabaseProvider; the global
// client is `unknown`-typed so each call narrows the shape it needs.
//
// Real channel connectors (Twilio, WhatsApp Cloud, Meta, IMAP) deliver inbound
// rows into these tables out-of-band; this provider is the read/compose surface.
// ---------------------------------------------------------------------------

export interface SupabaseConversationsConfig {
  /** Supabase client; defaults to the global one registered by createFayzApp. */
  supabaseClient?: unknown
  /** Active tenant id (value or getter) used to scope reads and stamp writes. */
  tenantId?: string | (() => string | undefined)
  /** Display name stamped as the author of outbound messages. */
  selfAuthor?: string
}

type Row = Record<string, unknown>

function mapConversation(r: Row): Conversation {
  return {
    id: String(r.id),
    contactName: (r.contact_name as string) ?? '',
    contactHandle: (r.contact_handle as string) ?? '',
    channel: (r.channel as Conversation['channel']) ?? 'sms',
    lastMessagePreview: (r.last_message_preview as string) ?? '',
    lastMessageAt: (r.last_message_at as string) ?? '',
    unreadCount: Number(r.unread_count ?? 0),
    status: (r.status as ConversationStatus) ?? 'open',
    assignedTo: (r.assigned_to as string | null) ?? undefined,
    accent: (r.accent as string) ?? '#6366f1',
    tags: (r.tags as string[] | null) ?? [],
    location: (r.location as string | null) ?? undefined,
    note: (r.note as string | null) ?? undefined,
  }
}

function mapMessage(r: Row): Message {
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    channel: (r.channel as Message['channel']) ?? 'sms',
    direction: (r.direction as Message['direction']) ?? 'inbound',
    body: (r.body as string) ?? '',
    at: (r.at as string) ?? '',
    author: (r.author as string) ?? '',
  }
}

export function createSupabaseConversationsProvider(
  config?: SupabaseConversationsConfig,
): ConversationsProvider {
  const selfAuthor = config?.selfAuthor ?? 'You'

  function resolveTenantId(): string | undefined {
    if (!config?.tenantId) return undefined
    return typeof config.tenantId === 'function' ? config.tenantId() : config.tenantId
  }

  function client(): { from: (t: string) => Row } {
    const supabase = (config?.supabaseClient ?? getSupabaseClientOptional()) as
      | { from: (t: string) => Row }
      | null
    if (!supabase) {
      throw new Error(
        '[plugin-conversations] Supabase client not available. Pass supabaseClient or register the global client via createFayzApp.',
      )
    }
    return supabase
  }

  return {
    async listConversations(query?: ListConversationsQuery): Promise<Conversation[]> {
      let q = (client().from(T.conversations) as { select: (s: string) => Row }).select('*')

      const tenantId = resolveTenantId()
      if (tenantId) q = (q as { eq: (c: string, v: string) => Row }).eq('tenant_id', tenantId)
      if (query?.channel && query.channel !== 'all') {
        q = (q as { eq: (c: string, v: string) => Row }).eq('channel', query.channel)
      }
      if (query?.status && query.status !== 'all') {
        q = (q as { eq: (c: string, v: string) => Row }).eq('status', query.status)
      }
      if (query?.search) {
        const term = `%${query.search}%`
        q = (q as { or: (c: string) => Row }).or(
          `contact_name.ilike.${term},last_message_preview.ilike.${term}`,
        )
      }
      q = (q as { order: (c: string, o: unknown) => Row }).order('last_message_at', {
        ascending: false,
      })

      const { data, error } = (await q) as { data: Row[] | null; error: unknown }
      if (error) throw error
      return (data ?? []).map(mapConversation)
    },

    async getMessages(conversationId: string): Promise<Message[]> {
      const selected = (
        client().from(T.messages) as { select: (s: string) => Row }
      ).select('*')
      const filtered = (selected as { eq: (c: string, v: string) => Row }).eq(
        'conversation_id',
        conversationId,
      )
      const ordered = (filtered as { order: (c: string, o: unknown) => Row }).order('at', {
        ascending: true,
      })
      const { data, error } = (await ordered) as { data: Row[] | null; error: unknown }
      if (error) throw error
      return (data ?? []).map(mapMessage)
    },

    async createConversation(input: CreateConversationInput): Promise<Conversation> {
      const tenantId = resolveTenantId()
      const now = new Date().toISOString()
      const firstMessage = input.firstMessage?.trim()

      const convRow: Row = {
        contact_name: input.contactName.trim(),
        contact_handle: input.contactHandle?.trim() || null,
        channel: input.channel,
        last_message_preview: firstMessage || null,
        last_message_at: now,
        unread_count: 0,
        status: 'open',
        assigned_to: selfAuthor,
        accent: CHANNEL_ACCENT_HEX[input.channel],
        tags: [],
        note: input.note?.trim() || null,
      }
      if (tenantId) convRow.tenant_id = tenantId

      const { data: created, error } = (await (
        (client().from(T.conversations) as { insert: (r: Row) => Row }).insert(convRow) as {
          select: () => { single: () => Promise<{ data: Row | null; error: unknown }> }
        }
      )
        .select()
        .single()) as { data: Row | null; error: unknown }
      if (error) throw error
      if (!created) throw new Error('Conversation not created')

      // Seed the thread with the first outbound message when provided.
      if (firstMessage) {
        const msgRow: Row = {
          conversation_id: String(created.id),
          channel: input.channel,
          direction: 'outbound',
          body: firstMessage,
          author: selfAuthor,
          at: now,
        }
        if (tenantId) msgRow.tenant_id = tenantId
        await (client().from(T.messages) as { insert: (r: Row) => Promise<unknown> }).insert(msgRow)
      }

      return mapConversation(created)
    },

    async sendMessage(input: SendMessageInput): Promise<Message> {
      const tenantId = resolveTenantId()

      // Resolve the channel from the parent conversation so the message matches.
      const convSelected = (client().from(T.conversations) as { select: (s: string) => Row }).select(
        'channel',
      )
      const convFiltered = (convSelected as { eq: (c: string, v: string) => Row }).eq(
        'id',
        input.conversationId,
      )
      const { data: conv } = (await (
        convFiltered as { maybeSingle: () => Promise<{ data: Row | null }> }
      ).maybeSingle()) as { data: Row | null }
      const channel = (conv?.channel as Message['channel']) ?? 'sms'

      const at = new Date().toISOString()
      const row: Row = {
        conversation_id: input.conversationId,
        channel,
        direction: 'outbound',
        body: input.body,
        author: selfAuthor,
        at,
      }
      if (tenantId) row.tenant_id = tenantId

      const { data: created, error } = (await (
        (client().from(T.messages) as { insert: (r: Row) => Row }).insert(row) as {
          select: () => { single: () => Promise<{ data: Row | null; error: unknown }> }
        }
      )
        .select()
        .single()) as { data: Row | null; error: unknown }
      if (error) throw error

      // Roll the parent conversation forward (preview / timestamp / unread / reopen).
      await (
        (client().from(T.conversations) as {
          update: (r: Row) => Row
        }).update({
          last_message_preview: input.body,
          last_message_at: at,
          unread_count: 0,
          status: 'open',
        }) as { eq: (c: string, v: string) => Promise<unknown> }
      ).eq('id', input.conversationId)

      return mapMessage(created ?? row)
    },

    async markRead(conversationId: string): Promise<void> {
      const { error } = (await (
        (client().from(T.conversations) as { update: (r: Row) => Row }).update({
          unread_count: 0,
        }) as { eq: (c: string, v: string) => Promise<{ error: unknown }> }
      ).eq('id', conversationId)) as { error: unknown }
      if (error) throw error
    },

    async setStatus(conversationId: string, status: ConversationStatus): Promise<Conversation> {
      const updated = (client().from(T.conversations) as { update: (r: Row) => Row }).update({
        status,
      })
      const filtered = (updated as { eq: (c: string, v: string) => Row }).eq('id', conversationId)
      const selected = (filtered as { select: () => Row }).select()
      const { data, error } = (await (
        selected as { single: () => Promise<{ data: Row | null; error: unknown }> }
      ).single()) as { data: Row | null; error: unknown }
      if (error) throw error
      if (!data) throw new Error('Conversation not found')
      return mapConversation(data)
    },
  }
}
