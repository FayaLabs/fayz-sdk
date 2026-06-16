export interface MarketingCurrency {
  code: string
  locale: string
  symbol: string
}

export const DEFAULT_CURRENCY: MarketingCurrency = { code: 'USD', locale: 'en-US', symbol: '$' }

export function formatCurrency(value: number, currency: MarketingCurrency): string {
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value)
  } catch {
    return `${currency.symbol}${Math.round(value).toLocaleString()}`
  }
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString()
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

/** Compact form for big reach numbers (12.4k). */
export function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return String(Math.round(value))
}

/** Percentage-point delta vs a previous value, signed. */
export function trendDelta(current: number, previous: number): { pct: number; dir: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, dir: current > 0 ? 'up' : 'neutral' }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'neutral' }
}
