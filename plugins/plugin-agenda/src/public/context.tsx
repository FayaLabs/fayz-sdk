import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PaymentProvider } from '@fayz-ai/core'
import type { PublicBookingDataProvider } from './data'
import type {
  BookingComponents,
  BookingWindow,
  PhoneVerificationMode,
  PublicBookingLabels,
  PublicService,
  ResolvedBookingBrand,
  ResolvedPayment,
  WorkingHours,
} from './types'

/** Emitted when the customer's phone is verified / identity captured, for the
 *  host to bridge to auth (booking stays decoupled — data-only, optional). */
export type OnIdentityVerified = (identity: { name: string; phone: string; email?: string }) => void

export interface PublicBookingContextValue {
  provider: PublicBookingDataProvider
  /** The professional/resource bookings are created against; null → any. */
  professionalId: string | null
  professionalName: string
  /** Resolved catalog: static `services` option, or fetched from the provider. */
  services: PublicService[]
  servicesLoading: boolean
  /** Business opening hours, shown on the overview "Sobre" section. */
  businessHours: WorkingHours
  /** 'otp' shows the code modal; 'none' trusts the typed number (default). */
  phoneVerification: PhoneVerificationMode
  /** Payment step config, or null when the flow ends at confirmation. */
  payment: ResolvedPayment | null
  /** Injected charge provider (Pix). When absent, the payment step self-mocks. */
  paymentProvider: PaymentProvider | null
  /** Fired on phone-verify / details submit so the host can sign the user in. */
  onIdentityVerified: OnIdentityVerified | null
  window: BookingWindow
  labels: PublicBookingLabels
  /** Brand personalization (resolved with defaults). */
  brand: ResolvedBookingBrand
  /** Host-overridable subcomponents (resolved with defaults). */
  components: BookingComponents
  /** Currency code for price formatting (e.g. 'BRL'). */
  currency: string
  locale: string
}

const PublicBookingContext = createContext<PublicBookingContextValue | null>(null)

export interface BookingProviderProps {
  /** Everything but the (possibly async) service catalog. */
  base: Omit<PublicBookingContextValue, 'services' | 'servicesLoading'>
  /** Static catalog from options — wins over the provider fetch when present. */
  staticServices: PublicService[] | null
  children: ReactNode
}

/**
 * Owns the service-catalog resolution: static services pass through untouched;
 * otherwise the provider is queried once (e.g. Supabase v_public_services).
 */
export function BookingProvider({ base, staticServices, children }: BookingProviderProps) {
  const [fetched, setFetched] = useState<PublicService[] | null>(null)
  const [loading, setLoading] = useState(staticServices === null)

  useEffect(() => {
    if (staticServices !== null) return
    let active = true
    setLoading(true)
    base.provider
      .getServices()
      .then((result) => {
        if (active) setFetched(result)
      })
      .catch((err) => {
        // Surface in dev; the overview renders its empty state.
        console.error('[plugin-agenda/public] failed to load services:', err)
        if (active) setFetched([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // base.provider is stable (created once by the plugin factory).
  }, [base.provider, staticServices])

  const value = useMemo<PublicBookingContextValue>(
    () => ({ ...base, services: staticServices ?? fetched ?? [], servicesLoading: loading }),
    [base, staticServices, fetched, loading],
  )

  return <PublicBookingContext.Provider value={value}>{children}</PublicBookingContext.Provider>
}

export function useBooking(): PublicBookingContextValue {
  const ctx = useContext(PublicBookingContext)
  if (!ctx) {
    throw new Error('[plugin-agenda] useBooking must be used within <BookingProvider>.')
  }
  return ctx
}
