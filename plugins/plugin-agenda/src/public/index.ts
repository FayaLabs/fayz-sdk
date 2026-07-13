// ---------------------------------------------------------------------------
// @fayz-ai/plugin-agenda/public — customer-facing booking surface.
//
// Separate entry from the admin plugin so a website host imports only the lean
// booking widget + data seam (no @fayz-ai/saas / calendar admin graph).
//
// Customization levers (cheapest first): `labels` → `brand` → `components`
// (swap subcomponents; defaults exported below for wrapping/composition).
// Data: PublicBookingDataProvider — mock seed by default, Supabase RPCs when a
// global client is configured (requires `tenantId`).
// ---------------------------------------------------------------------------

export { createPublicBookingPlugin } from './createPublicBookingPlugin'
export type { PublicBookingOptions, PublicBookingPlugin } from './createPublicBookingPlugin'
export { BookingWidget } from './BookingWidget'
export { BookingProvider, useBooking } from './context'
export type { PublicBookingContextValue, OnIdentityVerified } from './context'
export { useServices, usePublicServices, useAvailableSlots, useCreateBooking } from './hooks'
export type {
  UsePublicServicesResult,
  UseAvailableSlotsResult,
  UseCreateBookingResult,
  CreatePublicBookingInput,
} from './hooks'

// Data seam
export type {
  PublicBookingDataProvider,
  PublicSlotQuery,
  PublicCreateBookingInput,
  PublicBookingResult,
  MockPublicBookingOptions,
} from './data'
export { createMockPublicBookingProvider } from './data'
export { createSupabasePublicBookingProvider } from './data.supabase'
export type { SupabasePublicBookingOptions } from './data.supabase'

// Customization seam — default components (wrap or replace via `components`)
export { DEFAULT_BOOKING_COMPONENTS } from './components/defaults'
export { DefaultBrandHeader } from './components/BrandHeader'
export { DefaultServiceCard } from './components/ServiceCard'
export { DefaultSidebarExtras } from './components/SidebarExtras'
export { DefaultStepRailItem } from './components/StepRailItem'
export { DefaultSuccessPanel } from './components/SuccessPanel'

// Formatting helpers (useful inside custom components)
export { useFormatters, formatSlotRange, DAY_NAMES, WEEK_ORDER } from './format'

export type {
  PublicService,
  ContactInfo,
  BookingWindow,
  PublicBookingLabels,
  WorkingHours,
  PaymentConfig,
  ResolvedPayment,
  BookingBrand,
  ResolvedBookingBrand,
  BookingHighlight,
  BookingFormatters,
  BookingComponents,
  BrandHeaderProps,
  ServiceCardProps,
  SidebarExtrasProps,
  SuccessPanelProps,
  StepRailItemProps,
  StepState,
} from './types'
