import { CalendarCheck, Check, Copy, CreditCard, Loader2, Plus, QrCode, ShieldCheck } from 'lucide-react'
import type { PixCharge } from '@fayz-ai/core'
import type { BookingFormatters, PublicService, ResolvedPayment } from '../types'

// Static, realistic-looking Pix payload for the POC copia-e-cola fallback
// (used only when no payment provider is injected).
const PIX_PAYLOAD =
  '00020126840014br.gov.bcb.pix2562qrcode.fayz.ai/pix/v2/9d8f7a6b-agendamento5204000053039865802BR5904FAYZ6009SAO PAULO62070503***6304AB12'

/** Deterministic QR-looking placeholder rendered from a payload (POC visual). */
function QrPlaceholder({ data }: { data: string }) {
  const size = 25
  // Seed the data-cell pattern from the payload so different charges look different.
  let seed = 0
  for (let i = 0; i < data.length; i++) seed = (seed * 31 + data.charCodeAt(i)) % 100000
  const cells: { x: number; y: number }[] = []
  const isFinder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7
    return inBox(0, 0) || inBox(size - 7, 0) || inBox(0, size - 7)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFinder(x, y)) {
        const corner = x < 7 && y < 7 ? { bx: 0, by: 0 } : x >= size - 7 && y < 7 ? { bx: size - 7, by: 0 } : { bx: 0, by: size - 7 }
        const lx = x - corner.bx
        const ly = y - corner.by
        const outer = lx === 0 || lx === 6 || ly === 0 || ly === 6
        const inner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
        if (outer || inner) cells.push({ x, y })
      } else if ((x * 31 + y * 17 + x * y + seed) % 3 === 0) {
        cells.push({ x, y })
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40" role="img" aria-label="QR Code Pix (demonstração)">
      <rect width={size} height={size} fill="white" />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="currentColor" className="text-foreground" />
      ))}
    </svg>
  )
}

interface PaymentStepProps {
  service: PublicService
  payment: ResolvedPayment
  paymentStep: 'choose' | 'pix'
  charge: PixCharge | null
  busy: boolean
  error: Error | null
  copied: boolean
  fmt: BookingFormatters
  onPayWithPix: (fee: number) => void
  onCopy: () => void
  onSimulatePaid: () => void
}

/** Payment step: order summary + Pix method → QR/copia-e-cola while polling. */
export function PaymentStep({
  service, payment, paymentStep, charge, busy, error, copied, fmt, onPayWithPix, onCopy, onSimulatePaid,
}: PaymentStepProps) {
  const feePct = payment.reservationFeePercent
  const fee = Math.round(service.price * feePct) / 100
  const remaining = Math.round((service.price - fee) * 100) / 100

  if (paymentStep === 'choose') {
    return (
      <div>
        {/* Order summary */}
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>{service.name}</span>
            <span className="tabular-nums">{fmt.price.format(service.price)}</span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between text-foreground">
              <span className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>
                Taxa de reserva <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{feePct}%</span>
              </span>
              <span className="tabular-nums">{fmt.price.format(fee)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-border" /> Valor restante
              </span>
              <span className="tabular-nums">{remaining <= 0 ? 'Grátis' : fmt.price.format(remaining)}</span>
            </div>
            <button type="button" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Adicionar cupom
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3 font-semibold text-foreground">
            <span>Valor total</span>
            <span className="tabular-nums">{fmt.price.format(service.price)}</span>
          </div>
        </div>

        {/* Method */}
        <div className="mt-6 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-foreground">Escolha como pagar</h3>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro</span>
        </div>
        <div className="mt-3 rounded-2xl border-2 border-primary bg-accent/20 p-4">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>
            Pix
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Check, t: 'Finalize o agendamento clicando em "Pagar com Pix".' },
              { icon: QrCode, t: 'Mostraremos um QR Code e o Pix copia-e-cola.' },
              { icon: CalendarCheck, t: 'Após o pagamento, seu agendamento é reservado.' },
            ].map((s, i) => (
              <div key={i} className="text-sm text-muted-foreground">
                <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary"><s.icon className="h-4 w-4" /></span>
                <span className="font-semibold text-foreground">{i + 1}.</span> {s.t}
              </div>
            ))}
          </div>
        </div>

        {error ? <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível iniciar o pagamento. Tente novamente.</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => onPayWithPix(fee)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Pagar {fmt.price.format(fee)} com Pix
        </button>
      </div>
    )
  }

  // Pix QR — aguardando pagamento
  return (
    <div>
      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-950/30">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Realize o pagamento para finalizar
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Este código Pix é válido por somente 5 minutos. Não feche esta página até receber a confirmação do pagamento.
        </p>
      </div>
      <h3 className="mt-6 font-heading text-lg font-bold text-foreground">Escaneie ou copie este código para pagar</h3>
      <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li>1. Acesse o app do seu banco, pagamentos ou Internet Banking.</li>
        <li>2. Escolha pagar via Pix.</li>
        <li>3. Escaneie o QR Code ou use o Pix copia-e-cola:</li>
      </ol>
      <div className="mt-4 w-fit rounded-xl border border-border bg-white p-3">
        <QrPlaceholder data={charge?.pixQrCode ?? PIX_PAYLOAD} />
      </div>
      <div className="mt-4 flex max-w-md items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">{charge?.pixCopyPaste ?? PIX_PAYLOAD}</code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {/* POC shortcut — the mock provider also auto-confirms via polling after a few seconds. */}
      <button
        type="button"
        onClick={onSimulatePaid}
        className="mt-6 w-full rounded-xl border border-primary py-3 font-semibold text-primary transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Já paguei — confirmar (simulação)
      </button>
    </div>
  )
}

export { PIX_PAYLOAD }
