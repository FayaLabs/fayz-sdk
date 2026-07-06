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
import { bookingToEvent, eventToBookingPatch, bookingSummary } from './mapping'
import type { CalendarBooking } from '../../types'

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
