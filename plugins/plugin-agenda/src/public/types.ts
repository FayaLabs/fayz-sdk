// ---------------------------------------------------------------------------
// Public (customer-facing) booking types. This surface is deliberately decoupled
// from the admin calendar: it depends only on the AgendaDataProvider interface,
// so mock slots today and real availability (Supabase RPC / ERP / Google
// Calendar) later are a provider swap with no widget change.
// ---------------------------------------------------------------------------

export interface PublicService {
  id: string
  name: string
  durationMinutes: number
  price: number
  description?: string
}

export interface ContactInfo {
  name: string
  email?: string
  phone?: string
  notes?: string
}

export interface WorkingHours {
  /** 0=Sun … 6=Sat. */
  daysOfWeek: number[]
  /** 'HH:MM' */
  start: string
  /** 'HH:MM' */
  end: string
}

export interface BookingWindow {
  /** Earliest lead time before a slot can be booked. */
  minAdvanceHours: number
  /** How many days ahead the date picker offers. */
  maxAdvanceDays: number
  /** Slot granularity in minutes. */
  slotInterval: number
}

export interface PaymentConfig {
  /** Show a Pagamento step as the final stage of the flow. */
  enabled?: boolean
  /** % of the service price charged up-front as a reservation fee (default 100). */
  reservationFeePercent?: number
  /** Payment method (POC ships 'pix'). */
  method?: 'pix'
}

export interface ResolvedPayment {
  reservationFeePercent: number
  method: 'pix'
}

export interface PublicBookingLabels {
  title: string
  serviceStep: string
  dateStep: string
  contactStep: string
  confirmCta: string
  successTitle: string
  successBody: string
}
