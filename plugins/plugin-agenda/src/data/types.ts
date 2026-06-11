import type {
  CalendarBooking, Professional, Schedule, TimeSlot,
  CreateBookingInput, UpdateBookingInput, SaveScheduleInput,
  BookingQuery, ConflictCheckParams, AvailableSlotsParams,
} from '../types'

export interface AgendaDataProvider {
  // --- Bookings (calendar events) ---
  getBookings(query: BookingQuery): Promise<CalendarBooking[]>
  getBookingById(id: string): Promise<CalendarBooking | null>
  createBooking(input: CreateBookingInput): Promise<CalendarBooking>
  updateBooking(id: string, data: UpdateBookingInput): Promise<CalendarBooking>
  deleteBooking(id: string): Promise<void>
  updateBookingStatus(id: string, status: string): Promise<CalendarBooking>

  // --- Conflict detection ---
  checkConflict(params: ConflictCheckParams): Promise<boolean>
  getAvailableSlots(params: AvailableSlotsParams): Promise<TimeSlot[]>

  // --- Schedules (working hours) ---
  getSchedules(professionalId?: string): Promise<Schedule[]>
  saveSchedule(input: SaveScheduleInput): Promise<Schedule>
  deleteSchedule(id: string): Promise<void>

  // --- Professionals (resources) ---
  getProfessionals(): Promise<Professional[]>

  // --- Locations ---
  getLocations?(): Promise<Array<{ id: string; name: string }>>

  // --- Confirmations ---
  getConfirmationsPending(daysAhead?: number): Promise<CalendarBooking[]>
  sendConfirmation(bookingId: string, channel: string): Promise<void>

  // --- Financial bridge ---
  completeBooking(bookingId: string): Promise<{ booking: CalendarBooking; orderId: string }>
}
