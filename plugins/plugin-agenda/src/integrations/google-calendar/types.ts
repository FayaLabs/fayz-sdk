// Google Calendar integration — shared types.

export interface CalendarIntegration {
  id: string
  provider: string
  calendarId: string
  active: boolean
  connected: boolean
  lastSyncAt?: string
}

export interface CalendarSyncLogEntry {
  id: string
  direction: string
  trigger?: string
  status: string
  fetched: number
  written: number
  error?: string
  createdAt: string
}

/** Minimal Google Calendar event shape we read/write (subset of the API). */
export interface GCalEvent {
  id: string
  summary?: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status?: string
}
