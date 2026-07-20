// Integration contract + capability test for the Google Calendar connector.
//
// TDD anchor: the connector contract, manifest integrity, and the pure
// booking↔event mapping are all proven HERE — before/without the deployed edge
// function. The data-plane behaviors that need a live Google account are written
// as it.todo specs so the intended contract is documented and pending, not
// silently missing. See docs/PLUGIN-PATTERNS.md → integration capability.
import { describe, it, expect } from 'vitest'
import { assertConnectorContract } from '@fayz-ai/core/testing'
import { googleCalendarConnector } from './connector'
import {
  bookingToEvent,
  eventToBookingPatch,
  bookingSummary,
  appointmentRowToEvent,
  eventToAppointmentPatch,
  eventTimes,
  resolveTargetChannel,
  channelRowToChannel,
} from './mapping'
import type { CalendarBooking } from '../../types'
import type { AppointmentRow, CalendarChannel } from './types'

function booking(overrides: Partial<CalendarBooking> = {}): CalendarBooking {
  return {
    id: 'b1', tenantId: 't1', kind: 'appointment',
    startsAt: '2026-06-18T13:00:00-03:00', endsAt: '2026-06-18T14:00:00-03:00',
    status: 'scheduled', notes: null, orderId: 'b1', locationId: null, metadata: {},
    clientId: null, clientName: 'Sarah', clientPhone: null, clientEmail: 'sarah@x.com', clientAvatarUrl: null,
    professionalId: null, professionalName: 'Ana', professionalAvatarUrl: null,
    locationName: 'HQ', orderTotal: null, orderStatus: null,
    services: [{ id: 's1', serviceId: 'svc1', name: 'Haircut', durationMinutes: 60, price: 100, assigneeId: null }] as any,
    totalDurationMinutes: 60, createdAt: '', updatedAt: '',
    ...overrides,
  }
}

describe('google-calendar · connector contract (integrity)', () => {
  it('declares a valid connector descriptor', () => {
    expect(() => assertConnectorContract(googleCalendarConnector)).not.toThrow()
    expect(googleCalendarConnector.capabilities[0].direction).toBe('bidirectional')
  })
})

describe('google-calendar · booking↔event mapping (pure, TDD)', () => {
  it('builds an event title from services + client', () => {
    expect(bookingSummary(booking())).toBe('Haircut — Sarah')
  })

  it('maps a booking to a Google event input with start/end', () => {
    const ev = bookingToEvent(booking())
    expect(ev).not.toBeNull()
    expect(ev!.summary).toBe('Haircut — Sarah')
    expect(ev!.start.dateTime).toBe('2026-06-18T13:00:00-03:00')
    expect(ev!.end.dateTime).toBe('2026-06-18T14:00:00-03:00')
  })

  it('refuses to map a booking with no end time', () => {
    expect(bookingToEvent(booking({ endsAt: null }))).toBeNull()
  })

  it('maps an inbound reschedule to a booking patch', () => {
    const patch = eventToBookingPatch({
      id: 'e1', start: { dateTime: '2026-06-18T15:00:00-03:00' }, end: { dateTime: '2026-06-18T16:00:00-03:00' },
    })
    expect(patch.startsAt).toBe('2026-06-18T15:00:00-03:00')
    expect(patch.endsAt).toBe('2026-06-18T16:00:00-03:00')
  })

  it('maps an inbound cancellation to a cancelled status', () => {
    const patch = eventToBookingPatch({ id: 'e1', status: 'cancelled', start: {}, end: {} })
    expect(patch.status).toBe('cancelled')
  })

  it('reads an all-day event window (date, no dateTime)', () => {
    const t = eventTimes({ id: 'e1', start: { date: '2026-06-18' }, end: { date: '2026-06-19' } })
    expect(t.allDay).toBe(true)
    expect(t.startsAt).toBe('2026-06-18')
    expect(t.endsAt).toBe('2026-06-19')
  })

  it('reads a timed event window as not all-day', () => {
    const t = eventTimes({ id: 'e1', start: { dateTime: '2026-06-18T13:00:00-03:00' }, end: { dateTime: '2026-06-18T14:00:00-03:00' } })
    expect(t.allDay).toBe(false)
    expect(t.startsAt).toBe('2026-06-18T13:00:00-03:00')
  })
})

describe('google-calendar · appointment-row mapping (edge-function shape)', () => {
  function row(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
    return { id: 'a1', tenant_id: 't1', starts_at: '2026-06-18T13:00:00-03:00', ends_at: '2026-06-18T14:00:00-03:00', ...overrides }
  }

  it('maps a minimal row to a Google event input', () => {
    const ev = appointmentRowToEvent(row())
    expect(ev.summary).toBe('Appointment')
    expect(ev.start.dateTime).toBe('2026-06-18T13:00:00-03:00')
    expect(ev.end.dateTime).toBe('2026-06-18T14:00:00-03:00')
  })

  it('builds the title from metadata service + contact names', () => {
    const ev = appointmentRowToEvent(row({ metadata: { serviceNames: 'Cleaning', contactName: 'Sarah' }, notes: 'bring x-rays' }))
    expect(ev.summary).toBe('Cleaning — Sarah')
    expect(ev.description).toBe('bring x-rays')
  })

  it('falls back end→start when the row has no end', () => {
    const ev = appointmentRowToEvent(row({ ends_at: null }))
    expect(ev.end.dateTime).toBe('2026-06-18T13:00:00-03:00')
  })

  it('maps an inbound reschedule to a snake_case appointment patch', () => {
    const patch = eventToAppointmentPatch({
      id: 'e1', summary: 'Moved',
      start: { dateTime: '2026-06-18T15:00:00-03:00' }, end: { dateTime: '2026-06-18T16:00:00-03:00' },
    })
    expect(patch.cancelled).toBe(false)
    expect(patch.starts_at).toBe('2026-06-18T15:00:00-03:00')
    expect(patch.ends_at).toBe('2026-06-18T16:00:00-03:00')
    expect(patch.summary).toBe('Moved')
    expect(patch.allDay).toBe(false)
  })

  it('maps an inbound all-day event to an all-day patch', () => {
    const patch = eventToAppointmentPatch({ id: 'e1', start: { date: '2026-06-18' }, end: { date: '2026-06-19' } })
    expect(patch.allDay).toBe(true)
    expect(patch.starts_at).toBe('2026-06-18')
  })

  it('maps an inbound cancellation to a cancelled patch', () => {
    const patch = eventToAppointmentPatch({ id: 'e1', status: 'cancelled', start: {}, end: {} })
    expect(patch.cancelled).toBe(true)
    expect(patch.starts_at).toBeUndefined()
  })
})

describe('google-calendar · channel resolution (outbound priority, pure)', () => {
  function ch(overrides: Partial<CalendarChannel> = {}): CalendarChannel {
    return {
      id: 'c1', integrationId: 'i1', tenantId: 't1', googleCalendarId: 'cal@group',
      summary: null, color: null, direction: 'bidirectional', targetKind: null, targetId: null,
      importMode: 'appointment', syncToken: null, channelId: null, resourceId: null,
      channelExpiresAt: null, isActive: true, createdAt: '', updatedAt: '',
      ...overrides,
    }
  }

  it('prefers an assignee-targeted channel over service/location/whole-agenda', () => {
    const channels = [
      ch({ id: 'whole', googleCalendarId: 'whole@g', targetKind: null }),
      ch({ id: 'loc', googleCalendarId: 'loc@g', targetKind: 'location', targetId: 'L1' }),
      ch({ id: 'svc', googleCalendarId: 'svc@g', targetKind: 'service', targetId: 'S1' }),
      ch({ id: 'ana', googleCalendarId: 'ana@g', targetKind: 'assignee', targetId: 'A1' }),
    ]
    const match = resolveTargetChannel(channels, { assigneeId: 'A1', serviceIds: ['S1'], locationId: 'L1' })
    expect(match?.id).toBe('ana')
  })

  it('falls through assignee → service → location → whole agenda', () => {
    const svc = ch({ id: 'svc', targetKind: 'service', targetId: 'S9' })
    const loc = ch({ id: 'loc', targetKind: 'location', targetId: 'L9' })
    const whole = ch({ id: 'whole', targetKind: null })
    expect(resolveTargetChannel([svc, loc, whole], { assigneeId: 'nope', serviceIds: ['S9'] })?.id).toBe('svc')
    expect(resolveTargetChannel([loc, whole], { locationId: 'L9' })?.id).toBe('loc')
    expect(resolveTargetChannel([whole], { assigneeId: 'x' })?.id).toBe('whole')
  })

  it('ignores inactive and non-outbound channels', () => {
    const inbound = ch({ id: 'in', targetKind: 'assignee', targetId: 'A1', direction: 'inbound' })
    const off = ch({ id: 'off', targetKind: 'assignee', targetId: 'A1', direction: 'off' })
    const inactive = ch({ id: 'x', targetKind: null, isActive: false })
    expect(resolveTargetChannel([inbound, off, inactive], { assigneeId: 'A1' })).toBeNull()
  })

  it('returns null when nothing matches', () => {
    const svc = ch({ id: 'svc', targetKind: 'service', targetId: 'S1' })
    expect(resolveTargetChannel([svc], { assigneeId: 'A1', serviceIds: ['other'] })).toBeNull()
  })

  it('channelRowToChannel maps snake_case rows with defaults', () => {
    const mapped = channelRowToChannel({
      id: 'c1', integration_id: 'i1', tenant_id: 't1', google_calendar_id: 'cal@g', direction: 'inbound',
    })
    expect(mapped.googleCalendarId).toBe('cal@g')
    expect(mapped.importMode).toBe('appointment')
    expect(mapped.isActive).toBe(true)
    expect(mapped.targetKind).toBeNull()
  })
})

// Data-plane behaviors — require a live Google account + the deployed
// google-calendar-sync edge function. Documented as the pending contract (TDD).
describe('google-calendar · sync data plane (pending — needs edge function)', () => {
  it.todo('push_event: creating a booking creates a Google event and stores its id on bookings.metadata')
  it.todo('push_event: updating a booking patches the linked Google event')
  it.todo('push_event: cancelling a booking deletes the Google event')
  it.todo('pull_events: a Google reschedule updates the linked booking; a cancel cancels it')
  it.todo('pull_events: advances and persists the incremental syncToken')
})
