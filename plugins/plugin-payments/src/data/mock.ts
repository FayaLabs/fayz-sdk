import type { PaymentProvider, CreateChargeInput, PixCharge, ChargeStatus } from '@fayz-ai/core'

/** Mock provider adds a demo-only `markPaid` shortcut on top of the contract. */
export interface MockPaymentProvider extends PaymentProvider {
  /** Force a charge to 'paid' immediately (demo "Já paguei" button). */
  markPaid(chargeId: string): void
}

export interface MockPaymentOptions {
  /** Auto-confirm a pending charge after this many ms (simulates the gateway webhook). Default 6000. */
  autoPayAfterMs?: number
  /** Charge validity window in ms. Default 5 min. */
  expiresAfterMs?: number
}

interface ChargeRecord {
  charge: PixCharge
  createdAt: number
  autoPayAt: number
  expiresAt: number
  paid: boolean
}

let seq = 0

/** Build a realistic-looking (non-functional) Pix BR Code "copia e cola". */
function buildBrCode(amount: number, chargeId: string): string {
  const amt = amount.toFixed(2)
  // Simplified EMV-ish layout — enough to look/scan like a Pix payload in the POC.
  return (
    `00020126850014br.gov.bcb.pix2563qrcode.fayz.dev/pix/v2/${chargeId}` +
    `520400005303986540${amt.length}${amt}5802BR5913HEMPDENT6009SAO PAULO62070503***6304FZ${(seq % 90 + 10)}`
  )
}

export function createMockPaymentProvider(options?: MockPaymentOptions): MockPaymentProvider {
  const autoPayAfterMs = options?.autoPayAfterMs ?? 6000
  const expiresAfterMs = options?.expiresAfterMs ?? 5 * 60_000
  const charges = new Map<string, ChargeRecord>()

  function statusOf(rec: ChargeRecord): ChargeStatus {
    if (rec.paid) return 'paid'
    const now = Date.now()
    if (now >= rec.autoPayAt) return 'paid'
    if (now >= rec.expiresAt) return 'expired'
    return 'pending'
  }

  return {
    async createCharge(input: CreateChargeInput): Promise<PixCharge> {
      const now = Date.now()
      const chargeId = `mockpix-${++seq}-${input.orderId ?? 'na'}`
      const brCode = buildBrCode(input.amount, chargeId)
      const charge: PixCharge = {
        chargeId,
        status: 'pending',
        amount: input.amount,
        currency: input.currency,
        pixQrCode: brCode,
        pixCopyPaste: brCode,
        expiresAt: new Date(now + expiresAfterMs).toISOString(),
      }
      charges.set(chargeId, {
        charge,
        createdAt: now,
        autoPayAt: now + autoPayAfterMs,
        expiresAt: now + expiresAfterMs,
        paid: false,
      })
      return charge
    },

    async getChargeStatus(chargeId: string): Promise<ChargeStatus> {
      const rec = charges.get(chargeId)
      if (!rec) return 'failed'
      return statusOf(rec)
    },

    markPaid(chargeId: string): void {
      const rec = charges.get(chargeId)
      if (rec) rec.paid = true
    },
  }
}
