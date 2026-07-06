import { createStore, type StoreApi } from 'zustand/vanilla'
import { dedup } from '@fayz-ai/saas'
import { toast } from '@fayz-ai/ui'
import { getScheduleBlockConfig, setScheduleBlockConfig } from '@fayz-ai/saas'
import type { AgendaDataProvider } from './data/types'
import type { AgendaFinancialBridge } from './financial-bridge'
import type { ExternalBookingSource } from './config'
import type {
  CalendarBooking, Professional, Schedule,
  CreateBookingInput, UpdateBookingInput, BookingQuery,
} from './types'

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

export interface AgendaUIState {
  // Calendar data
  bookings: CalendarBooking[]
  bookingsLoading: boolean
  dateRange: { start: string; end: string }
  currentView: string
  selectedDate: string

  // Resources
  professionals: Professional[]
  professionalsLoading: boolean

  // Filters
  selectedProfessionalIds: string[]
  selectedLocationId: string | null
  selectedStatuses: string[]

  // Locations
  locations: Array<{ id: string; name: string }>

  // Schedules
  schedules: Schedule[]
  schedulesLoading: boolean

  // Confirmations
  pendingConfirmations: CalendarBooking[]
  confirmationsLoading: boolean

  // Modal state
  appointmentModal: {
    open: boolean
    mode: 'create' | 'edit'
    bookingId?: string
    prefill?: Partial<CreateBookingInput> & { endsAt?: string }
    initialTab?: string
    externalSource?: ExternalBookingSource
  }

  // Actions
  fetchBookings(range: { start: string; end: string }): Promise<void>
  fetchProfessionals(): Promise<void>
  fetchLocations(): Promise<void>
  fetchSchedules(professionalId?: string): Promise<void>
  fetchConfirmations(): Promise<void>
  createBooking(input: CreateBookingInput): Promise<CalendarBooking>
  updateBooking(id: string, data: UpdateBookingInput): Promise<CalendarBooking>
  deleteBooking(id: string): Promise<void>
  updateBookingStatus(id: string, status: string): Promise<void>
  rescheduleBooking(id: string, newStart: string, newEnd: string, newProfessionalId?: string): Promise<void>
  setFilters(filters: Partial<{ professionalIds: string[]; locationId: string | null; statuses: string[] }>): void
  setView(view: string): void
  setSelectedDate(date: string): void
  openAppointmentModal(mode: 'create' | 'edit', options?: { bookingId?: string; prefill?: Partial<CreateBookingInput> & { endsAt?: string }; initialTab?: string; externalSource?: ExternalBookingSource }): void
  closeAppointmentModal(): void
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

function getCurrentBookingQuery(state: AgendaUIState, dateRange = state.dateRange): BookingQuery {
  return {
    dateRange,
    professionalIds: state.selectedProfessionalIds.length ? state.selectedProfessionalIds : undefined,
    locationId: state.selectedLocationId ?? undefined,
    statuses: state.selectedStatuses.length ? state.selectedStatuses : undefined,
  }
}

export function createAgendaStore(provider: AgendaDataProvider, financialBridge?: AgendaFinancialBridge): StoreApi<AgendaUIState> {
  return createStore<AgendaUIState>((set, get) => ({
    bookings: [],
    bookingsLoading: false,
    dateRange: { start: '', end: '' },
    currentView: 'resourceTimeGridDay',
    selectedDate: new Date().toISOString().slice(0, 10),

    professionals: [],
    professionalsLoading: false,

    selectedProfessionalIds: [],
    selectedLocationId: null,
    selectedStatuses: ['scheduled', 'confirmed', 'in_progress', 'completed'],

    locations: [],

    schedules: [],
    schedulesLoading: false,

    pendingConfirmations: [],
    confirmationsLoading: false,

    appointmentModal: { open: false, mode: 'create' },

    async fetchBookings(range) {
      const key = `agenda:bookings:${range.start}:${range.end}`
      return dedup(key, async () => {
        set({ bookingsLoading: true, dateRange: range })
        const state = get()
        const query = getCurrentBookingQuery(state, range)
        let bookings = await provider.getBookings(query)

        // Enrich with payment status if financial bridge is available
        if (financialBridge) {
          const orderIds = bookings.map((b) => b.orderId).filter((id): id is string => !!id)
          if (orderIds.length > 0) {
            try {
              const statuses = await financialBridge.resolvePaymentStatuses(orderIds)
              bookings = bookings.map((b) => {
                if (!b.orderId) return b
                const summary = statuses.get(b.orderId)
                return summary ? { ...b, paymentStatus: summary.status } : b
              })
            } catch { /* non-blocking */ }
          }
        }

        set({ bookings, bookingsLoading: false })
      })
    },

    async fetchProfessionals() {
      return dedup('agenda:professionals', async () => {
        set({ professionalsLoading: true })
        const professionals = await provider.getProfessionals()
        set({ professionals, professionalsLoading: false })
      })
    },

    async fetchLocations() {
      return dedup('agenda:locations', async () => {
        if (!provider.getLocations) return
        const locations = await provider.getLocations()
        set({ locations })
        // Update global schedule block config so ScheduleEditor picks up locations
        const current = getScheduleBlockConfig()
        if (current) {
          setScheduleBlockConfig({ ...current, locations })
        }
      })
    },

    async fetchSchedules(professionalId) {
      return dedup('agenda:schedules:' + (professionalId ?? 'all'), async () => {
        set({ schedulesLoading: true })
        const schedules = await provider.getSchedules(professionalId)
        set({ schedules, schedulesLoading: false })
      })
    },

    async fetchConfirmations() {
      return dedup('agenda:confirmations', async () => {
        set({ confirmationsLoading: true })
        const pendingConfirmations = await provider.getConfirmationsPending()
        set({ pendingConfirmations, confirmationsLoading: false })
      })
    },

    async createBooking(input) {
      try {
        const booking = await provider.createBooking(input)
        // Refresh bookings for current range
        const state = get()
        if (state.dateRange.start && state.dateRange.end) {
          const bookings = await provider.getBookings(getCurrentBookingQuery(state))
          set({ bookings })
        }
        toast.success('Appointment created')
        return booking
      } catch (err: any) {
        toast.error('Failed to create appointment', { description: err?.message })
        throw err
      }
    },

    async updateBooking(id, data) {
      try {
        const booking = await provider.updateBooking(id, data)
        const state = get()
        if (state.dateRange.start && state.dateRange.end) {
          const bookings = await provider.getBookings(getCurrentBookingQuery(state))
          set({ bookings })
        }
        toast.success('Appointment updated')
        return booking
      } catch (err: any) {
        toast.error('Failed to update appointment', { description: err?.message })
        throw err
      }
    },

    async deleteBooking(id) {
      try {
        await provider.deleteBooking(id)
        const state = get()
        if (state.dateRange.start && state.dateRange.end) {
          const bookings = await provider.getBookings(getCurrentBookingQuery(state))
          set({ bookings })
        }
        toast.success('Appointment deleted')
      } catch (err: any) {
        toast.error('Failed to delete appointment', { description: err?.message })
        throw err
      }
    },

    async updateBookingStatus(id, status) {
      // Optimistic update — change color immediately
      const prev = get().bookings
      set({ bookings: prev.map((b) => b.id === id ? { ...b, status: status as any } : b) })
      try {
        await provider.updateBookingStatus(id, status)
        // Refresh from server to get full data
        const state = get()
        if (state.dateRange.start && state.dateRange.end) {
          const bookings = await provider.getBookings(getCurrentBookingQuery(state))
          set({ bookings })
        }
        toast.success('Status updated')
      } catch (err: any) {
        // Rollback on failure
        set({ bookings: prev })
        toast.error('Failed to update status', { description: err?.message })
        throw err
      }
    },

    async rescheduleBooking(id, newStart, newEnd, newProfessionalId) {
      try {
        // Check for conflicts
        const existing = get().bookings.find((b) => b.id === id)
        const assigneeId = newProfessionalId ?? existing?.professionalId
        if (assigneeId) {
          const hasConflict = await provider.checkConflict({
            assigneeId,
            startsAt: newStart,
            endsAt: newEnd,
            excludeBookingId: id,
          })
          if (hasConflict) {
            toast.error('Time conflict detected', { description: 'This professional already has an appointment at this time.' })
            throw new Error('Time conflict')
          }
        }
        await provider.updateBooking(id, {
          startsAt: newStart,
          endsAt: newEnd,
          ...(newProfessionalId && { professionalId: newProfessionalId }),
        })
        const state = get()
        if (state.dateRange.start && state.dateRange.end) {
          const bookings = await provider.getBookings(getCurrentBookingQuery(state))
          set({ bookings })
        }
        toast.success('Appointment rescheduled')
      } catch (err: any) {
        if (err?.message !== 'Time conflict') {
          toast.error('Failed to reschedule', { description: err?.message })
        }
        throw err
      }
    },

    setFilters(filters) {
      set({
        ...(filters.professionalIds !== undefined && { selectedProfessionalIds: filters.professionalIds }),
        ...(filters.locationId !== undefined && { selectedLocationId: filters.locationId }),
        ...(filters.statuses !== undefined && { selectedStatuses: filters.statuses }),
      })
      // Re-fetch with new filters
      const { dateRange } = get()
      if (dateRange.start && dateRange.end) {
        get().fetchBookings(dateRange)
      }
    },

    setView(view) { set({ currentView: view }) },
    setSelectedDate(date) { set({ selectedDate: date }) },

    openAppointmentModal(mode, options) {
      set({ appointmentModal: { open: true, mode, bookingId: options?.bookingId, prefill: options?.prefill, initialTab: options?.initialTab, externalSource: options?.externalSource } })
    },

    closeAppointmentModal() {
      // Only toggle open — keep mode/bookingId/prefill intact so layout
      // doesn't shift during the close animation
      set((state) => ({ appointmentModal: { ...state.appointmentModal, open: false } }))
    },
  }))
}
