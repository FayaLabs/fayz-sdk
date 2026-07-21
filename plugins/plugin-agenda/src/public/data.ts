// ---------------------------------------------------------------------------
// PublicBookingDataProvider — the narrow data seam the public booking surface
// depends on. The admin calendar's 15-method AgendaDataProvider is deliberately
// NOT used here: a public page needs exactly three capabilities, and the
// Supabase implementation must be anon-safe (SECURITY DEFINER RPCs + whitelisted
// views) rather than the authenticated table access the admin provider does.
// ---------------------------------------------------------------------------

import type { TimeSlot } from '../types'
import { createMockAgendaProvider, type MockAgendaSeed } from '../data/mock'
import type { PublicService, ContactInfo } from './types'

export interface PublicSlotQuery {
  /** Staff person id; null → any active professional for the tenant. */
  assigneeId: string | null
  /** 'YYYY-MM-DD' local calendar day. */
  date: string
  durationMinutes: number
  slotInterval: number
}

export interface PublicCreateBookingInput {
  serviceId: string
  /** ISO datetime of the chosen slot start. */
  startsAt: string
  /** name required; phone should include the country dial for real backends. */
  contact: ContactInfo
  /**
   * Staff person id the visitor saw availability for. When set, the backend
   * books THAT professional (or fails if their hours don't cover the slot) —
   * never silently reassigns. null/undefined → backend auto-picks.
   */
  assigneeId?: string | null
}

export interface PublicBookingResult {
  bookingId: string
  startsAt: string
  endsAt: string
}

export interface PublicBookingDataProvider {
  /** Bookable catalog. Used when the host doesn't pass static `services`. */
  getServices(): Promise<PublicService[]>
  getAvailableSlots(query: PublicSlotQuery): Promise<TimeSlot[]>
  createBooking(input: PublicCreateBookingInput): Promise<PublicBookingResult>
}

// ---------------------------------------------------------------------------
// Mock implementation — adapter over the admin mock provider (reuses its slot
// algorithm + seed machinery, so mock and live behave identically).
// ---------------------------------------------------------------------------

export interface MockPublicBookingOptions {
  seed: MockAgendaSeed
  services: PublicService[]
  /** The seed professional bookings are created against. */
  professionalId: string
}

export function createMockPublicBookingProvider(options: MockPublicBookingOptions): PublicBookingDataProvider {
  const inner = createMockAgendaProvider({ seed: options.seed })
  const { services, professionalId } = options

  return {
    async getServices() {
      return services
    },
    async getAvailableSlots(query) {
      return inner.getAvailableSlots({
        assigneeId: query.assigneeId ?? professionalId,
        date: query.date,
        durationMinutes: query.durationMinutes,
        slotInterval: query.slotInterval,
      })
    },
    async createBooking(input) {
      const service = services.find((s) => s.id === input.serviceId)
      if (!service) throw new Error('Serviço inválido')
      const booking = await inner.createBooking({
        kind: 'appointment',
        // Mock: the customer is captured as the booking title; the Supabase
        // path upserts a person record server-side instead.
        clientId: 'public-guest',
        professionalId,
        startsAt: input.startsAt,
        title: input.contact.name,
        notes:
          [input.contact.phone, input.contact.email, input.contact.notes].filter(Boolean).join(' · ') || undefined,
        services: [
          {
            serviceId: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            price: service.price,
            assigneeId: professionalId,
          },
        ],
      })
      const endsAt =
        booking.endsAt ?? new Date(new Date(input.startsAt).getTime() + service.durationMinutes * 60_000).toISOString()
      return { bookingId: booking.id, startsAt: booking.startsAt, endsAt }
    },
  }
}
