import { createSafeDataProvider } from '@fayz-ai/core'
import type { PaymentProvider } from '@fayz-ai/core'
import { createMockPaymentProvider, type MockPaymentOptions } from './data/mock'
import { createSupabasePaymentProvider } from './data/supabase'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-payments — gateway-agnostic charge provider (Pix today).
// Bookkeeping (invoices/movements/reconciliation) stays in plugin-financial;
// this plugin OWNS money-in initiation (create a charge → payable artifacts →
// status). Mirrors createSafeFinancialProvider.
// ---------------------------------------------------------------------------

/** Supabase/gateway when configured, else the mock provider. */
export function createSafePaymentProvider(mockOptions?: MockPaymentOptions): PaymentProvider {
  return createSafeDataProvider(
    () => createSupabasePaymentProvider(),
    () => createMockPaymentProvider(mockOptions),
  )
}

export { createMockPaymentProvider, createSupabasePaymentProvider } from './data'
export type { MockPaymentProvider, MockPaymentOptions } from './data'
export type {
  PaymentProvider, PaymentMethod, ChargeStatus, CreateChargeInput, PixCharge,
} from '@fayz-ai/core'
