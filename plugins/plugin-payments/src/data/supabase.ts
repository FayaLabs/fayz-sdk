import type { PaymentProvider, CreateChargeInput, PixCharge, ChargeStatus } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Supabase/gateway-backed payment provider — STUB (deferred).
//
// Later: a real MercadoPago (or other PSP) Pix integration via a Supabase edge
// function (credentials server-side; actions create_charge | get_status |
// webhook), mirroring the plugbank-sync edge function. Swapping this in is a
// pure provider change — the booking widget and hooks are untouched because they
// depend only on the core PaymentProvider interface.
// ---------------------------------------------------------------------------

export function createSupabasePaymentProvider(): PaymentProvider {
  const notImplemented = (): never => {
    throw new Error(
      '[plugin-payments] Supabase/MercadoPago provider not implemented yet — deferred. ' +
        'Run on the mock provider (no gateway configured) for now.',
    )
  }
  return {
    createCharge: (_input: CreateChargeInput): Promise<PixCharge> => notImplemented(),
    getChargeStatus: (_chargeId: string): Promise<ChargeStatus> => notImplemented(),
  }
}
