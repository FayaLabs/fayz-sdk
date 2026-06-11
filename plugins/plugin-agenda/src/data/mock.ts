import type { AgendaDataProvider } from './types'
import type {
  CalendarBooking, Professional, Schedule, TimeSlot,
  CreateBookingInput, UpdateBookingInput, SaveScheduleInput,
  BookingQuery, ConflictCheckParams, AvailableSlotsParams, BookingStatus,
} from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 1
function uid(): string { return `mock-${nextId++}` }
function now(): string { return new Date().toISOString() }

function addMinutes(date: string, minutes: number): string {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_PROFESSIONALS: Professional[] = [
  { id: 'prof-1', name: 'Ana Silva', avatarUrl: null, locationId: 'loc-1', locationName: 'Main Branch', isActive: true },
  { id: 'prof-2', name: 'Carlos Santos', avatarUrl: null, locationId: 'loc-1', locationName: 'Main Branch', isActive: true },
  { id: 'prof-3', name: 'Maria Oliveira', avatarUrl: null, locationId: 'loc-1', locationName: 'Main Branch', isActive: true },
]

function createSampleBookings(): CalendarBooking[] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  function dt(hour: number, minute = 0): string {
    return new Date(year, month, day, hour, minute).toISOString()
  }

  return [
    {
      id: 'bk-1', tenantId: 'mock', kind: 'appointment',
      startsAt: dt(9, 0), endsAt: dt(10, 30), status: 'confirmed',
      notes: null, orderId: 'ord-1', locationId: 'loc-1', metadata: {},
      clientId: 'cl-1', clientName: 'Sarah Johnson', clientPhone: '(11) 99999-1111', clientEmail: 'sarah@email.com', clientAvatarUrl: null,
      professionalId: 'prof-1', professionalName: 'Ana Silva', professionalAvatarUrl: null,
      locationName: 'Main Branch', orderTotal: 250, orderStatus: 'draft',
      services: [{ id: 'bi-1', serviceId: 'svc-1', name: 'Balayage', durationMinutes: 90, price: 250, assigneeId: 'prof-1' }],
      totalDurationMinutes: 90, createdAt: now(), updatedAt: now(),
    },
    {
      id: 'bk-2', tenantId: 'mock', kind: 'appointment',
      startsAt: dt(10, 0), endsAt: dt(11, 0), status: 'scheduled',
      notes: null, orderId: 'ord-2', locationId: 'loc-1', metadata: {},
      clientId: 'cl-2', clientName: 'Emily Carter', clientPhone: '(11) 99999-2222', clientEmail: 'emily@email.com', clientAvatarUrl: null,
      professionalId: 'prof-2', professionalName: 'Carlos Santos', professionalAvatarUrl: null,
      locationName: 'Main Branch', orderTotal: 80, orderStatus: 'draft',
      services: [{ id: 'bi-2', serviceId: 'svc-2', name: 'Haircut', durationMinutes: 60, price: 80, assigneeId: 'prof-2' }],
      totalDurationMinutes: 60, createdAt: now(), updatedAt: now(),
    },
    {
      id: 'bk-3', tenantId: 'mock', kind: 'appointment',
      startsAt: dt(14, 0), endsAt: dt(15, 0), status: 'confirmed',
      notes: 'First visit', orderId: 'ord-3', locationId: 'loc-1', metadata: {},
      clientId: 'cl-3', clientName: 'Rachel Kim', clientPhone: '(11) 99999-3333', clientEmail: null, clientAvatarUrl: null,
      professionalId: 'prof-3', professionalName: 'Maria Oliveira', professionalAvatarUrl: null,
      locationName: 'Main Branch', orderTotal: 120, orderStatus: 'draft',
      services: [{ id: 'bi-3', serviceId: 'svc-3', name: 'Facial Treatment', durationMinutes: 60, price: 120, assigneeId: 'prof-3' }],
      totalDurationMinutes: 60, createdAt: now(), updatedAt: now(),
    },
    {
      id: 'bk-4', tenantId: 'mock', kind: 'appointment',
      startsAt: dt(11, 0), endsAt: dt(12, 0), status: 'scheduled',
      notes: null, orderId: 'ord-4', locationId: 'loc-1', metadata: {},
      clientId: 'cl-4', clientName: 'Jessica Lima', clientPhone: '(11) 99999-4444', clientEmail: null, clientAvatarUrl: null,
      professionalId: 'prof-1', professionalName: 'Ana Silva', professionalAvatarUrl: null,
      locationName: 'Main Branch', orderTotal: 60, orderStatus: 'draft',
      services: [{ id: 'bi-4', serviceId: 'svc-4', name: 'Manicure', durationMinutes: 60, price: 60, assigneeId: 'prof-1' }],
      totalDurationMinutes: 60, createdAt: now(), updatedAt: now(),
    },
    {
      id: 'bk-5', tenantId: 'mock', kind: 'appointment',
      startsAt: dt(15, 30), endsAt: dt(17, 0), status: 'confirmed',
      notes: null, orderId: 'ord-5', locationId: 'loc-1', metadata: {},
      clientId: 'cl-5', clientName: 'Amanda Wright', clientPhone: '(11) 99999-5555', clientEmail: 'amanda@email.com', clientAvatarUrl: null,
      professionalId: 'prof-2', professionalName: 'Carlos Santos', professionalAvatarUrl: null,
      locationName: 'Main Branch', orderTotal: 350, orderStatus: 'draft',
      services: [
        { id: 'bi-5', serviceId: 'svc-1', name: 'Highlights', durationMinutes: 60, price: 200, assigneeId: 'prof-2' },
        { id: 'bi-6', serviceId: 'svc-2', name: 'Haircut', durationMinutes: 30, price: 150, assigneeId: 'prof-2' },
      ],
      totalDurationMinutes: 90, createdAt: now(), updatedAt: now(),
    },
  ]
}

function createSampleSchedules(): Schedule[] {
  const schedules: Schedule[] = []
  for (const prof of SAMPLE_PROFESSIONALS) {
    // Mon-Fri 08:00-12:00, 13:00-18:00
    for (let day = 1; day <= 5; day++) {
      schedules.push({
        id: uid(), tenantId: 'mock', kind: 'working_hours',
        assigneeId: prof.id, locationId: prof.locationId,
        dayOfWeek: day, specificDate: null,
        startsAt: '08:00', endsAt: '12:00', isActive: true, metadata: {},
      })
      schedules.push({
        id: uid(), tenantId: 'mock', kind: 'working_hours',
        assigneeId: prof.id, locationId: prof.locationId,
        dayOfWeek: day, specificDate: null,
        startsAt: '13:00', endsAt: '18:00', isActive: true, metadata: {},
      })
    }
    // Saturday 08:00-14:00
    schedules.push({
      id: uid(), tenantId: 'mock', kind: 'working_hours',
      assigneeId: prof.id, locationId: prof.locationId,
      dayOfWeek: 6, specificDate: null,
      startsAt: '08:00', endsAt: '14:00', isActive: true, metadata: {},
    })
  }
  return schedules
}

// ---------------------------------------------------------------------------
// Mock provider factory
// ---------------------------------------------------------------------------

export function createMockAgendaProvider(): AgendaDataProvider {
  const bookings: CalendarBooking[] = createSampleBookings()
  const schedules: Schedule[] = createSampleSchedules()
  const professionals: Professional[] = [...SAMPLE_PROFESSIONALS]

  return {
    async getBookings(query: BookingQuery): Promise<CalendarBooking[]> {
      return bookings.filter((b) => {
        if (query.kind && b.kind !== query.kind) return false
        if (query.statuses?.length && !query.statuses.includes(b.status)) return false
        if (query.professionalIds?.length && !query.professionalIds.includes(b.professionalId ?? '')) return false
        if (query.locationId && b.locationId !== query.locationId) return false
        if (query.dateRange) {
          if (b.startsAt > query.dateRange.end || (b.endsAt ?? b.startsAt) < query.dateRange.start) return false
        }
        return true
      })
    },

    async getBookingById(id: string): Promise<CalendarBooking | null> {
      return bookings.find((b) => b.id === id) ?? null
    },

    async createBooking(input: CreateBookingInput): Promise<CalendarBooking> {
      const totalDuration = input.services.reduce((sum, s) => sum + s.durationMinutes, 0)
      const totalPrice = input.services.reduce((sum, s) => sum + s.price, 0)
      const booking: CalendarBooking = {
        id: uid(), tenantId: 'mock', kind: input.kind ?? 'appointment',
        startsAt: input.startsAt, endsAt: addMinutes(input.startsAt, totalDuration || 30),
        status: 'scheduled', notes: input.notes ?? null,
        orderId: input.services.length > 0 ? uid() : null, locationId: input.locationId ?? null, metadata: {},
        clientId: input.clientId, clientName: 'New Client', clientPhone: null, clientEmail: null, clientAvatarUrl: null,
        professionalId: input.professionalId,
        professionalName: professionals.find((p) => p.id === input.professionalId)?.name ?? 'Unknown',
        professionalAvatarUrl: null,
        locationName: null, orderTotal: totalPrice, orderStatus: 'draft',
        services: input.services.map((s) => ({
          id: uid(), serviceId: s.serviceId, name: s.name,
          durationMinutes: s.durationMinutes, price: s.price,
          assigneeId: s.assigneeId ?? input.professionalId,
        })),
        totalDurationMinutes: totalDuration, createdAt: now(), updatedAt: now(),
      }
      bookings.push(booking)
      return booking
    },

    async updateBooking(id: string, data: UpdateBookingInput): Promise<CalendarBooking> {
      const idx = bookings.findIndex((b) => b.id === id)
      if (idx === -1) throw new Error('Booking not found')
      const existing = bookings[idx]
      const serviceUpdates: Partial<CalendarBooking> = {}
      if (data.services) {
        serviceUpdates.services = data.services.map((s) => ({
          id: uid(), serviceId: s.serviceId, name: s.name,
          durationMinutes: s.durationMinutes, price: s.price,
          assigneeId: s.assigneeId ?? existing.professionalId ?? '',
        }))
        serviceUpdates.totalDurationMinutes = data.services.reduce((sum, s) => sum + s.durationMinutes, 0)
        serviceUpdates.orderTotal = data.services.reduce((sum, s) => sum + s.price, 0)
      }
      const updated: CalendarBooking = {
        ...existing,
        ...(data.startsAt && { startsAt: data.startsAt }),
        ...(data.endsAt && { endsAt: data.endsAt }),
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.professionalId && { professionalId: data.professionalId }),
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.locationId && { locationId: data.locationId }),
        ...serviceUpdates,
        updatedAt: now(),
      }
      bookings[idx] = updated
      return updated
    },

    async deleteBooking(id: string): Promise<void> {
      const idx = bookings.findIndex((b) => b.id === id)
      if (idx !== -1) bookings.splice(idx, 1)
    },

    async updateBookingStatus(id: string, status: string): Promise<CalendarBooking> {
      const idx = bookings.findIndex((b) => b.id === id)
      if (idx === -1) throw new Error('Booking not found')
      bookings[idx] = { ...bookings[idx], status: status as BookingStatus, updatedAt: now() }
      return bookings[idx]
    },

    async checkConflict(params: ConflictCheckParams): Promise<boolean> {
      return bookings.some((b) => {
        if (params.excludeBookingId && b.id === params.excludeBookingId) return false
        if (b.professionalId !== params.assigneeId) return false
        if (b.status === 'cancelled' || b.status === 'no_show') return false
        return timeOverlaps(b.startsAt, b.endsAt ?? b.startsAt, params.startsAt, params.endsAt)
      })
    },

    async getAvailableSlots(params: AvailableSlotsParams): Promise<TimeSlot[]> {
      const date = new Date(params.date)
      const dayOfWeek = date.getDay()
      const interval = params.slotInterval ?? 30

      // Get working hours for this professional on this day
      const daySchedules = schedules.filter((s) =>
        s.assigneeId === params.assigneeId && s.isActive &&
        (s.dayOfWeek === dayOfWeek || s.specificDate === params.date)
      )

      const slots: TimeSlot[] = []
      for (const sched of daySchedules) {
        const [startH, startM] = sched.startsAt.split(':').map(Number)
        const [endH, endM] = sched.endsAt.split(':').map(Number)
        const schedStart = new Date(date); schedStart.setHours(startH, startM, 0, 0)
        const schedEnd = new Date(date); schedEnd.setHours(endH, endM, 0, 0)

        let slotStart = new Date(schedStart)
        while (true) {
          const slotEnd = new Date(slotStart.getTime() + params.durationMinutes * 60000)
          if (slotEnd > schedEnd) break
          const startIso = slotStart.toISOString()
          const endIso = slotEnd.toISOString()
          const hasConflict = bookings.some((b) => {
            if (b.professionalId !== params.assigneeId) return false
            if (b.status === 'cancelled' || b.status === 'no_show') return false
            return timeOverlaps(b.startsAt, b.endsAt ?? b.startsAt, startIso, endIso)
          })
          if (!hasConflict) {
            slots.push({ start: startIso, end: endIso })
          }
          slotStart = new Date(slotStart.getTime() + interval * 60000)
        }
      }
      return slots
    },

    async getSchedules(professionalId?: string): Promise<Schedule[]> {
      if (professionalId) return schedules.filter((s) => s.assigneeId === professionalId)
      return [...schedules]
    },

    async saveSchedule(input: SaveScheduleInput): Promise<Schedule> {
      const schedule: Schedule = {
        id: uid(), tenantId: 'mock', kind: 'working_hours',
        assigneeId: input.assigneeId, locationId: input.locationId ?? null,
        dayOfWeek: input.dayOfWeek ?? null, specificDate: input.specificDate ?? null,
        startsAt: input.startsAt, endsAt: input.endsAt,
        isActive: input.isActive !== false, metadata: {},
      }
      schedules.push(schedule)
      return schedule
    },

    async deleteSchedule(id: string): Promise<void> {
      const idx = schedules.findIndex((s) => s.id === id)
      if (idx !== -1) schedules.splice(idx, 1)
    },

    async getProfessionals(): Promise<Professional[]> {
      return [...professionals]
    },

    async getConfirmationsPending(daysAhead = 2): Promise<CalendarBooking[]> {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + daysAhead)
      return bookings.filter((b) =>
        b.status === 'scheduled' && new Date(b.startsAt) <= cutoff && new Date(b.startsAt) >= new Date()
      )
    },

    async sendConfirmation(bookingId: string, channel: string): Promise<void> {
      const booking = bookings.find((b) => b.id === bookingId)
      if (!booking) throw new Error('Booking not found')
      const confirmations = (booking.metadata.confirmations as any[] ?? [])
      confirmations.push({ channel, sentAt: now(), status: 'sent' })
      booking.metadata = { ...booking.metadata, confirmations }
    },

    async completeBooking(bookingId: string): Promise<{ booking: CalendarBooking; orderId: string }> {
      const idx = bookings.findIndex((b) => b.id === bookingId)
      if (idx === -1) throw new Error('Booking not found')
      bookings[idx] = { ...bookings[idx], status: 'completed', updatedAt: now() }
      return { booking: bookings[idx], orderId: bookings[idx].orderId ?? '' }
    },
  }
}
