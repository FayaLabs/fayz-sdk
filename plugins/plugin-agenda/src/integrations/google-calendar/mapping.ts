// Booking ↔ Google Calendar event mapping (pure helpers).
//
// Shared shape used both by the SDK (docs/tests) and mirrored by the edge
// function. Keeping it pure makes the field decisions reviewable in one place.
import type { CalendarBooking } from '../../types'
import type { GCalEvent } from './types'

export interface GCalEventInput {
  summary: string
  description?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
}

/** Build the event title from the booking's services + client. */
export function bookingSummary(b: Pick<CalendarBooking, 'services' | 'clientName'>): string {
  const services = (b.services ?? []).map((s) => s.name).filter(Boolean).join(', ')
  const who = b.clientName ?? ''
  if (services && who) return `${services} — ${who}`
  return services || who || 'Appointment'
}

/** Map a Fayz booking to a Google Calendar event input. Returns null when the booking has no end. */
export function bookingToEvent(b: CalendarBooking, timeZone?: string): GCalEventInput | null {
  if (!b.startsAt || !b.endsAt) return null
  const notes = [b.notes, b.professionalName ? `Pro: ${b.professionalName}` : '', b.locationName ?? '']
    .filter(Boolean).join('\n')
  return {
    summary: bookingSummary(b),
    description: notes || undefined,
    start: { dateTime: b.startsAt, timeZone },
    end: { dateTime: b.endsAt, timeZone },
  }
}

/** Map an inbound Google event change to a partial booking update (reschedule/cancel). */
export function eventToBookingPatch(ev: GCalEvent): { startsAt?: string; endsAt?: string; status?: 'cancelled' } {
  if (ev.status === 'cancelled') return { status: 'cancelled' }
  return {
    startsAt: ev.start?.dateTime,
    endsAt: ev.end?.dateTime,
  }
}
