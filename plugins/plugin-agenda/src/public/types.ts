// ---------------------------------------------------------------------------
// Public (customer-facing) booking types. This surface is deliberately decoupled
// from the admin calendar: it depends only on the narrow PublicBookingDataProvider
// seam (see ./data), so mock slots today and real availability (Supabase RPC /
// ERP / Google Calendar) later are a provider swap with no widget change.
//
// Customization model: hosts personalize via three levers, cheapest first —
//   1. `labels`  — every user-visible string (all defaulted, pt-BR)
//   2. `brand`   — name/logo/tagline/icons/badges/highlights (text + assets)
//   3. `components` — swap whole subcomponents (BookingComponents) when the
//      structure itself must change. Defaults are exported for composition.
// ---------------------------------------------------------------------------

import type { ComponentType, ReactNode } from 'react'

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

// ---------------------------------------------------------------------------
// Phone verification
// ---------------------------------------------------------------------------

/**
 * How the customer's phone number is verified before the details sub-step.
 *
 *  • 'otp'  — show the code modal (POC: the code is the literal '0000'; no
 *             message is actually sent). Use only where a real sender exists.
 *  • 'none' — trust the typed number: the flow goes straight to the details
 *             sub-step and the identity is emitted as-is.
 *
 * Default is 'none': until a real WhatsApp sender is wired, an OTP nobody can
 * receive is a dead end for real customers.
 */
export type PhoneVerificationMode = 'otp' | 'none'

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

/** One icon+text bullet on the overview sidebar. */
export interface BookingHighlight {
  icon?: ComponentType<{ className?: string }>
  text: string
}

/** Brand/text-level personalization — no components needed for these. */
export interface BookingBrand {
  /** e.g. "HempDent · Consulta Canábica". */
  name?: string
  /** Avatar letter; defaults to name.charAt(0). Ignored when logoUrl is set. */
  initials?: string
  logoUrl?: string
  /** Subheader line under the name. `null` hides the row. */
  tagline?: string | null
  /** Icon on service rows. Default: lucide Video. */
  serviceIcon?: ComponentType<{ className?: string }>
  /** Chip after the duration ("Online", "Presencial"…). `null` hides. */
  serviceMeta?: string | null
  /** Badge on the first service. `null` disables. Default 'Mais procurado'. */
  featuredBadge?: string | null
  /** Overview sidebar bullets (replaces the default generic ones). */
  highlights?: BookingHighlight[]
}

export interface ResolvedBookingBrand {
  name: string
  initials: string
  logoUrl?: string
  tagline: string | null
  serviceIcon: ComponentType<{ className?: string }>
  serviceMeta: string | null
  featuredBadge: string | null
  highlights: BookingHighlight[]
}

// ---------------------------------------------------------------------------
// Formatters (shared Intl instances, see ./format)
// ---------------------------------------------------------------------------

export interface BookingFormatters {
  price: Intl.NumberFormat
  time: Intl.DateTimeFormat
  weekday: Intl.DateTimeFormat
  dayNum: Intl.DateTimeFormat
  longDay: Intl.DateTimeFormat
  dateShort: Intl.DateTimeFormat
  month: Intl.DateTimeFormat
}

// ---------------------------------------------------------------------------
// Component override seam
// ---------------------------------------------------------------------------

export type StepState = 'done' | 'active' | 'todo'

export interface BrandHeaderProps {
  brand: ResolvedBookingBrand
}

export interface ServiceCardProps {
  service: PublicService
  featured: boolean
  onSelect: () => void
  fmt: BookingFormatters
  brand: ResolvedBookingBrand
}

export interface SidebarExtrasProps {
  professionalName: string
  brand: ResolvedBookingBrand
  /** Renders the primary CTA — replacements can call it from their own button. */
  onStartBooking: () => void
  labels: PublicBookingLabels
}

export interface SuccessPanelProps {
  service: PublicService | null
  /** ISO datetime of the booked slot. */
  slotStart: string | null
  professionalName: string
  labels: PublicBookingLabels
  fmt: BookingFormatters
}

export interface StepRailItemProps {
  n: number
  label: string
  state: StepState
  children?: ReactNode
}

/**
 * Host-overridable subcomponents. Flow-critical parts (week strip, slot grid,
 * contact forms, payment panel) stay internal — these are the brand-visible
 * seams. Defaults are exported so hosts can wrap instead of rewriting.
 */
export interface BookingComponents {
  BrandHeader: ComponentType<BrandHeaderProps>
  ServiceCard: ComponentType<ServiceCardProps>
  SidebarExtras: ComponentType<SidebarExtrasProps>
  SuccessPanel: ComponentType<SuccessPanelProps>
  StepRailItem: ComponentType<StepRailItemProps>
}

// ---------------------------------------------------------------------------
// Labels — every user-visible string in the flow (all defaulted, pt-BR)
// ---------------------------------------------------------------------------

export interface PublicBookingLabels {
  title: string
  serviceStep: string
  dateStep: string
  contactStep: string
  confirmCta: string
  successTitle: string
  successBody: string
  // overview
  servicesHeading: string
  aboutHeading: string
  openingHoursHeading: string
  closedLabel: string
  bookNowCta: string
  // datetime
  timezoneNote: string
  slotsHeading: string
  noSlots: string
  continueCta: string
  backToServices: string
  back: string
  prevWeek: string
  nextWeek: string
  // contact
  contactIntro: string
  phoneLabel: string
  phoneHint: string
  sendCodeCta: string
  /** Phone hint shown when phoneVerification is 'none' (no code is sent). */
  phoneHintNoVerification: string
  /** Phone CTA shown when phoneVerification is 'none'. */
  phoneContinueCta: string
  codeTitle: string
  codeBody: string
  codeInvalid: string
  codeConfirmCta: string
  codeResendHint: string
  phoneVerified: string
  changePhone: string
  nameLabel: string
  namePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  emailHint: string
  notesLabel: string
  notesPlaceholder: string
  saveAndContinueCta: string
  submitError: string
  noChargeNote: string
  // right rail
  railTitle: string
  railWaitingPayment: string
  railService: string
  railProfessional: string
  railDatetime: string
  railContact: string
  railPayment: string
}
