// Google Calendar integration (control plane) — Supabase client.
//
// Thin client. Split of responsibilities:
//   • anything that needs the OAuth client secret or a Google API call goes
//     through the google-calendar-sync edge function (invoke);
//   • plain tenant-scoped reads/writes (integration row, channels, log) hit the
//     tables directly under RLS.
import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { channelRowToChannel } from '../mapping'
import { GCAL_TABLES } from './tables'
import type {
  CalendarIntegration,
  CalendarSyncLogEntry,
  CalendarChannel,
  ExternalEventPreview,
  GoogleCalendarListEntry,
  ImportEventsResult,
} from '../types'

const FUNCTION = 'google-calendar-sync'

function sb() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return supabase
}

/** Snake_case patch for plg_calendar_channels writes (RLS-scoped). */
export interface CalendarChannelInput {
  id?: string
  integrationId?: string
  googleCalendarId: string
  summary?: string | null
  color?: string | null
  direction?: CalendarChannel['direction']
  targetKind?: CalendarChannel['targetKind']
  targetId?: string | null
  importMode?: CalendarChannel['importMode']
  isActive?: boolean
}

export interface GoogleCalendarProvider {
  getIntegration(): Promise<CalendarIntegration | null>
  /** Start the OAuth connect flow — returns the Google consent URL to redirect to. */
  getConnectUrl(redirectTo?: string): Promise<string>
  setCalendar(calendarId: string): Promise<void>
  disconnect(): Promise<void>
  /** Manually pull external changes now (inbound). */
  syncNow(): Promise<{ fetched: number; written: number; discovered?: number }>
  getSyncLog(): Promise<CalendarSyncLogEntry[]>
  // --- smart sync: multi-calendar channels + import wizard ---
  /** List the user's Google calendars for the de-para picker (needs the API → function). */
  listGoogleCalendars(): Promise<GoogleCalendarListEntry[]>
  /** Read this tenant's channels (RLS). */
  listChannels(): Promise<CalendarChannel[]>
  /** Create/update a channel (RLS upsert on integration_id + google_calendar_id). */
  saveChannel(input: CalendarChannelInput): Promise<void>
  /** Delete a channel by id (RLS). */
  deleteChannel(id: string): Promise<void>
  /** Preview future events not yet linked to an appointment (import wizard). */
  listExternalEvents(params?: { channelId?: string; timeMin?: string }): Promise<ExternalEventPreview[]>
  /** Import selected external events as appointments. */
  importEvents(items: { channelId: string; eventId: string }[]): Promise<ImportEventsResult>
}

export function createGoogleCalendarProvider(): GoogleCalendarProvider {
  return {
    async getIntegration() {
      const { data } = await sb().from(GCAL_TABLES.integrations).select('*').eq('provider', 'google').limit(1).maybeSingle()
      if (!data) return null
      return {
        id: data.id,
        provider: data.provider,
        calendarId: data.calendar_id ?? 'primary',
        active: data.active ?? true,
        connected: !!data.oauth_refresh_token,
        lastSyncAt: data.last_sync_at ?? undefined,
      }
    },

    async getConnectUrl(redirectTo) {
      const { data, error } = await sb().functions.invoke(FUNCTION, {
        body: { action: 'oauth_start', tenantId: getActiveTenantId(), redirectTo: redirectTo ?? window.location.href },
      })
      if (error) throw new Error(error.message)
      return (data as { url: string }).url
    },

    async setCalendar(calendarId) {
      await sb().from(GCAL_TABLES.integrations).update({ calendar_id: calendarId, updated_at: new Date().toISOString() }).eq('provider', 'google')
    },

    async disconnect() {
      await sb().from(GCAL_TABLES.integrations).update({ active: false, oauth_refresh_token: null, oauth_access_token: null }).eq('provider', 'google')
    },

    async syncNow() {
      const { data, error } = await sb().functions.invoke(FUNCTION, { body: { action: 'pull_events', tenantId: getActiveTenantId(), trigger: 'manual' } })
      if (error) throw new Error(error.message)
      return data as { fetched: number; written: number; discovered?: number }
    },

    async getSyncLog() {
      const { data } = await sb().from(GCAL_TABLES.syncLog).select('*').order('created_at', { ascending: false }).limit(20)
      return (data ?? []).map((r: any) => ({
        id: r.id, direction: r.direction, trigger: r.trigger ?? undefined,
        status: r.status, fetched: r.fetched ?? 0, written: r.written ?? 0,
        error: r.error ?? undefined, createdAt: r.created_at,
      }))
    },

    async listGoogleCalendars() {
      const { data, error } = await sb().functions.invoke(FUNCTION, { body: { action: 'list_calendars', tenantId: getActiveTenantId() } })
      if (error) throw new Error(error.message)
      return (data as { calendars: GoogleCalendarListEntry[] }).calendars ?? []
    },

    async listChannels() {
      const { data } = await sb().from(GCAL_TABLES.channels).select('*').order('created_at', { ascending: true })
      return (data ?? []).map(channelRowToChannel)
    },

    async saveChannel(input) {
      const tenantId = getActiveTenantId()
      // Resolve the integration id when the caller didn't pass one.
      let integrationId = input.integrationId
      if (!integrationId) {
        const { data } = await sb().from(GCAL_TABLES.integrations).select('id').eq('provider', 'google').limit(1).maybeSingle()
        integrationId = data?.id
      }
      const row: Record<string, unknown> = {
        integration_id: integrationId,
        tenant_id: tenantId,
        google_calendar_id: input.googleCalendarId,
        updated_at: new Date().toISOString(),
      }
      if (input.id !== undefined) row.id = input.id
      if (input.summary !== undefined) row.summary = input.summary
      if (input.color !== undefined) row.color = input.color
      if (input.direction !== undefined) row.direction = input.direction
      if (input.targetKind !== undefined) row.target_kind = input.targetKind
      if (input.targetId !== undefined) row.target_id = input.targetId
      if (input.importMode !== undefined) row.import_mode = input.importMode
      if (input.isActive !== undefined) row.is_active = input.isActive
      const { error } = await sb().from(GCAL_TABLES.channels).upsert(row, { onConflict: 'integration_id,google_calendar_id' })
      if (error) throw new Error(error.message)
    },

    async deleteChannel(id) {
      const { error } = await sb().from(GCAL_TABLES.channels).delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    async listExternalEvents(params) {
      const { data, error } = await sb().functions.invoke(FUNCTION, {
        body: { action: 'list_external_events', tenantId: getActiveTenantId(), channelId: params?.channelId, timeMin: params?.timeMin },
      })
      if (error) throw new Error(error.message)
      return (data as { events: ExternalEventPreview[] }).events ?? []
    },

    async importEvents(items) {
      const { data, error } = await sb().functions.invoke(FUNCTION, {
        body: { action: 'import_events', tenantId: getActiveTenantId(), items },
      })
      if (error) throw new Error(error.message)
      return data as ImportEventsResult
    },
  }
}
