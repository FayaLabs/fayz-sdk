type TFunc = (key: string, params?: Record<string, string | number>) => string

// Maps a previous in-module view to the i18n key for its human label, used to
// render a context-aware back link ("Back to {where you came from}") on detail
// pages. Views not listed here (e.g. the edit/detail of the record we're
// returning from, or unknown views) are not meaningful referrers — callers fall
// back to the default parent label.
const REFERRER_LABEL_KEYS: Record<string, string> = {
  summary: 'financial.nav.summary',
  statements: 'financial.nav.statements',
  'cash-registers': 'financial.nav.cashRegisters',
  reconciliation: 'financial.nav.reconciliation',
  commissions: 'financial.nav.commissions',
  cards: 'financial.nav.cards',
  'receivables-list': 'financial.nav.receivables',
  'payables-list': 'financial.nav.payables',
}

/** Human label for the page the user came from, or null when it isn't a meaningful referrer. */
export function referrerLabel(view: string | null | undefined, t: TFunc): string | null {
  if (!view) return null
  const key = REFERRER_LABEL_KEYS[view]
  return key ? t(key) : null
}
