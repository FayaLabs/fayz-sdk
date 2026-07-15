// ---------------------------------------------------------------------------
// Payment provider contract (SDK-level, gateway-agnostic). A booking/checkout
// flow declares "collect X" and calls createCharge; the concrete provider (mock
// Pix now, MercadoPago/Stripe later) decides HOW. Kept in core so any plugin can
// depend on the interface without depending on a payments plugin.
// ---------------------------------------------------------------------------

export type PaymentMethod = 'pix' | (string & {})

export type ChargeStatus = 'pending' | 'paid' | 'expired' | 'failed'

export interface CreateChargeInput {
  /** Amount in the currency's major unit (e.g. 220.00 = R$ 220,00). */
  amount: number
  /** ISO 4217 currency code, e.g. 'BRL'. */
  currency: string
  method: PaymentMethod
  /** Human-readable description (statement/receipt). */
  description?: string
  /** The booking/order this charge settles, for reconciliation. */
  orderId?: string
  /** Payer contact, when known (name/email/phone). */
  customer?: { name?: string; email?: string; phone?: string }
}

export interface PixCharge {
  chargeId: string
  status: ChargeStatus
  amount: number
  currency: string
  /** QR image payload. For Pix this is the BR Code string encoded into the QR. */
  pixQrCode: string
  /** "Copia e cola" — the raw Pix BR Code the payer pastes into their bank app. */
  pixCopyPaste: string
  /** ISO datetime the charge/QR expires. */
  expiresAt: string
}

export interface PaymentProvider {
  /** Create a charge and return its payable artifacts (Pix QR + copia-e-cola). */
  createCharge(input: CreateChargeInput): Promise<PixCharge>
  /** Current status of a charge (polled by the UI, or driven by a webhook later). */
  getChargeStatus(chargeId: string): Promise<ChargeStatus>
}
