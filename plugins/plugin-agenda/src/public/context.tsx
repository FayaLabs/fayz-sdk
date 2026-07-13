import { createContext, useContext, type ReactNode } from 'react'
import type { PaymentProvider } from '@fayz-ai/core'
import type { AgendaDataProvider } from '../data/types'
import type { PublicService, BookingWindow, PublicBookingLabels, WorkingHours, ResolvedPayment } from './types'

/** Emitted when the customer's phone is verified / identity captured, for the
 *  host to bridge to auth (booking stays decoupled — data-only, optional). */
export type OnIdentityVerified = (identity: { name: string; phone: string; email?: string }) => void

export interface PublicBookingContextValue {
  provider: AgendaDataProvider
  /** The professional/resource bookings are created against (POC: single professional). */
  professionalId: string
  professionalName: string
  services: PublicService[]
  /** Business opening hours, shown on the overview "Sobre" section. */
  businessHours: WorkingHours
  /** Payment step config, or null when the flow ends at confirmation. */
  payment: ResolvedPayment | null
  /** Injected charge provider (Pix). When absent, the payment step self-mocks. */
  paymentProvider: PaymentProvider | null
  /** Fired on phone-verify / details submit so the host can sign the user in. */
  onIdentityVerified: OnIdentityVerified | null
  window: BookingWindow
  labels: PublicBookingLabels
  /** Currency code for price formatting (e.g. 'BRL'). */
  currency: string
  locale: string
}

const PublicBookingContext = createContext<PublicBookingContextValue | null>(null)

export function BookingProvider({ value, children }: { value: PublicBookingContextValue; children: ReactNode }) {
  return <PublicBookingContext.Provider value={value}>{children}</PublicBookingContext.Provider>
}

export function useBooking(): PublicBookingContextValue {
  const ctx = useContext(PublicBookingContext)
  if (!ctx) {
    throw new Error('[plugin-agenda] useBooking must be used within <BookingProvider>.')
  }
  return ctx
}
