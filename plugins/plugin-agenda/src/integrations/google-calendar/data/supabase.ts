// Google Calendar integration (control plane) — Supabase client.
//
// Thin client: reads/writes the calendar_integrations row and invokes the
// google-calendar-sync edge function for OAuth connect + manual sync. The
// function holds the OAuth client secret and does the Calendar API work.
import { getSupabaseClientOptional } from '@fayz-ai/core'
import type { CalendarIntegration, CalendarSyncLogEntry } from '../types'

const FUNCTION = 'google-calendar-sync'

function sb() {
  const supabase = getSupabaseClientOptional() as any
  if (!supabase) throw new Error('Supabase not initialized')
  return supabase
}

export interface GoogleCalendarProvider {
  getIntegration(): Promise<CalendarIntegration | null>
  /** Start the OAuth connect flow — returns the Google consent URL to redirect to. */
  getConnectUrl(redirectTo?: string): Promise<string>
  setCalendar(calendarId: string): Promise<void>
  disconnect(): Promise<void>
  /** Manually pull external changes now (inbound). */
  syncNow(): Promise<{ fetched: number; written: number }>
  getSyncLog(): Promise<CalendarSyncLogEntry[]>
}

export function createGoogleCalendarProvider(): GoogleCalendarProvider {
  return {
    async getIntegration() {
      const { data } = await sb().from('calendar_integrations').select('*').eq('provider', 'google').limit(1).maybeSingle()
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
        body: { action: 'oauth_start', redirectTo: redirectTo ?? window.location.href },
      })
      if (error) throw new Error(error.message)
      return (data as { url: string }).url
    },

    async setCalendar(calendarId) {
      await sb().from('calendar_integrations').update({ calendar_id: calendarId, updated_at: new Date().toISOString() }).eq('provider', 'google')
    },

    async disconnect() {
      await sb().from('calendar_integrations').update({ active: false, oauth_refresh_token: null, oauth_access_token: null }).eq('provider', 'google')
    },

    async syncNow() {
      const { data, error } = await sb().functions.invoke(FUNCTION, { body: { action: 'pull_events', trigger: 'manual' } })
      if (error) throw new Error(error.message)
      return data as { fetched: number; written: number }
    },

    async getSyncLog() {
      const { data } = await sb().from('calendar_sync_log').select('*').order('created_at', { ascending: false }).limit(20)
      return (data ?? []).map((r: any) => ({
        id: r.id, direction: r.direction, trigger: r.trigger ?? undefined,
        status: r.status, fetched: r.fetched ?? 0, written: r.written ?? 0,
        error: r.error ?? undefined, createdAt: r.created_at,
      }))
    },
  }
}
