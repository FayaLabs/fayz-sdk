// ---------------------------------------------------------------------------
// @fayz-ai/plugin-agenda/public — customer-facing booking surface.
//
// Separate entry from the admin plugin so a website host imports only the lean
// booking widget + data seam (no @fayz-ai/saas / calendar admin graph).
// ---------------------------------------------------------------------------

export { createPublicBookingPlugin } from './createPublicBookingPlugin'
export type { PublicBookingOptions, PublicBookingPlugin } from './createPublicBookingPlugin'
export { BookingWidget } from './BookingWidget'
export { BookingProvider, useBooking } from './context'
export type { PublicBookingContextValue } from './context'
export { useServices, useAvailableSlots, useCreateBooking } from './hooks'
export type { UseAvailableSlotsResult, UseCreateBookingResult, CreatePublicBookingInput } from './hooks'
export type { PublicService, ContactInfo, BookingWindow, PublicBookingLabels, WorkingHours } from './types'
