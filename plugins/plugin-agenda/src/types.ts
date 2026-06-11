// ---------------------------------------------------------------------------
// Agenda Plugin — Pure TypeScript types
// Zero dependencies. Maps to saas_core archetype tables.
// ---------------------------------------------------------------------------

// ============================================================
// ENUMS / LITERALS
// ============================================================

/** Booking status lifecycle */
export type BookingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

/** Confirmation outreach status */
export type ConfirmationStatus = 'pending' | 'sent' | 'confirmed' | 'declined'

/** Booking type identifier — extensible via string literal union */
export type BookingTypeId = 'appointment' | 'task' | 'out_of_office' | 'block' | (string & {})

/** Configuration for a booking type (event type) */
export interface BookingTypeConfig {
  id: BookingTypeId
  label: string
  icon: string
  color: string
  fields: {
    client: boolean
    professional: boolean
    services: boolean
    location: boolean
    status: boolean
  }
  requiresServices: boolean
  requiresClient: boolean
}

// ============================================================
// CORE ENTITIES
// ============================================================

/** A booking service line item (from saas_core.booking_items) */
export interface BookingService {
  id: string
  serviceId: string | null
  name: string
  durationMinutes: number
  price: number
  assigneeId: string | null
}

/** Calendar booking — the main entity rendered on the calendar (from v_bookings view on orders) */
export interface CalendarBooking {
  id: string
  tenantId: string
  kind: string
  /** Lifecycle stage: booked, invoiced, paid, etc. */
  stage?: string
  /** Financial direction: credit, debit, null */
  direction?: string | null
  startsAt: string
  endsAt: string | null
  status: BookingStatus
  notes: string | null
  /** In unified model, orderId === id (the booking IS the order) */
  orderId: string | null
  locationId: string | null
  metadata: Record<string, unknown>

  // Client (party)
  clientId: string | null
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
  clientAvatarUrl: string | null

  // Professional (assignee)
  professionalId: string | null
  professionalName: string | null
  professionalAvatarUrl: string | null

  // Location
  locationName: string | null

  // Order totals
  orderTotal: number | null
  orderStatus: string | null
  /** Payment status from financial bridge (enriched at runtime) */
  paymentStatus?: import('./financial-bridge').BookingPaymentStatus

  // Aggregated services
  services: BookingService[] | null
  totalDurationMinutes: number | null

  createdAt: string
  updatedAt: string
}

/** Professional / staff resource for the calendar */
export interface Professional {
  id: string
  name: string
  avatarUrl: string | null
  locationId: string | null
  locationName: string | null
  isActive: boolean
}

/** Working hours schedule (from saas_core.schedules) */
export interface Schedule {
  id: string
  tenantId: string
  kind: string
  assigneeId: string | null
  locationId: string | null
  dayOfWeek: number | null
  specificDate: string | null
  startsAt: string
  endsAt: string
  isActive: boolean
  metadata: Record<string, unknown>
}

/** Available time slot */
export interface TimeSlot {
  start: string
  end: string
}

/** Confirmation record stored in booking metadata */
export interface ConfirmationRecord {
  channel: string
  sentAt: string
  status: ConfirmationStatus
  confirmedAt?: string
}

// ============================================================
// STATUS CONFIGURATION
// ============================================================

/**
 * When a status is available for selection relative to the booking date.
 * - 'always'        — any date (e.g. scheduled, confirmed, cancelled)
 * - 'today_or_past' — booking is today or earlier (e.g. completed, no_show)
 * - 'today_only'    — booking is today (e.g. in_progress)
 */
export type StatusAvailability = 'always' | 'today_or_past' | 'today_only'

export interface StatusConfig {
  value: string
  label: string
  color: string
  /** When this status can be selected (default: 'always') */
  availableWhen?: StatusAvailability
}

/** Check if a status is available for a given booking date */
export function isStatusAvailable(status: StatusConfig, bookingStartsAt: string): boolean {
  const when = status.availableWhen ?? 'always'
  if (when === 'always') return true
  const bookingDate = bookingStartsAt.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  if (when === 'today_or_past') return bookingDate <= today
  if (when === 'today_only') return bookingDate === today
  return true
}

// ============================================================
// MODAL TAB EXTENSION
// ============================================================

/** Props passed to every booking modal tab component */
export interface BookingModalTabProps {
  bookingId?: string
  clientId: string
  orderId: string | null
  services: Array<{ name: string; price: number; durationMinutes: number }>
  formatCurrency: (amount: number) => string
  onDataChange?: () => void
}

/** A tab registered in the booking edit modal */
export interface BookingModalTab {
  id: string
  label: string
  icon: string
  order: number
  component: React.ComponentType<BookingModalTabProps>
  visible?: (ctx: { mode: 'create' | 'edit'; clientId?: string; orderId?: string }) => boolean
}

// ============================================================
// INPUT TYPES (create / mutate)
// ============================================================

export interface CreateBookingInput {
  kind?: BookingTypeId
  clientId: string
  professionalId: string
  locationId?: string
  startsAt: string
  notes?: string
  services: CreateBookingServiceInput[]
}

export interface CreateBookingServiceInput {
  serviceId: string
  name: string
  durationMinutes: number
  price: number
  assigneeId?: string
}

export interface UpdateBookingInput {
  clientId?: string
  professionalId?: string
  locationId?: string
  startsAt?: string
  endsAt?: string
  status?: BookingStatus
  notes?: string
  services?: CreateBookingServiceInput[]
}

export interface SaveScheduleInput {
  assigneeId: string
  locationId?: string
  dayOfWeek?: number
  specificDate?: string
  startsAt: string
  endsAt: string
  isActive?: boolean
}

// ============================================================
// QUERY / FILTER TYPES
// ============================================================

export interface BookingQuery {
  dateRange: { start: string; end: string }
  professionalIds?: string[]
  locationId?: string
  statuses?: string[]
  kind?: string
}

export interface ConflictCheckParams {
  assigneeId: string
  startsAt: string
  endsAt: string
  excludeBookingId?: string
}

export interface AvailableSlotsParams {
  assigneeId: string
  date: string
  durationMinutes: number
  slotInterval?: number
}
