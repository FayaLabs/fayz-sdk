import type { FinancialStatus } from '@fayz-ai/shop/types'

type Tone = 'positive' | 'pending' | 'negative'

const FINANCIAL: Record<FinancialStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pendente', tone: 'pending' },
  paid: { label: 'Pago', tone: 'positive' },
  partially_paid: { label: 'Parcialmente pago', tone: 'pending' },
  partially_refunded: { label: 'Parcialmente reembolsado', tone: 'negative' },
  refunded: { label: 'Reembolsado', tone: 'negative' },
  voided: { label: 'Cancelado', tone: 'negative' },
}

const TONE_CLASS: Record<Tone, string> = {
  positive: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  negative: 'bg-rose-100 text-rose-800',
}

/** One source of truth for a financial-status pill — label + color by status,
 *  so a pending or refunded order never renders inside a green "success" pill. */
export function financialStatusBadge(status: FinancialStatus): { label: string; className: string } {
  const entry = FINANCIAL[status] ?? { label: status, tone: 'pending' as Tone }
  return { label: entry.label, className: TONE_CLASS[entry.tone] }
}

export function isPaid(status: FinancialStatus): boolean {
  return status === 'paid' || status === 'partially_paid'
}

export function isRefunded(status: FinancialStatus): boolean {
  return status === 'refunded' || status === 'partially_refunded'
}
