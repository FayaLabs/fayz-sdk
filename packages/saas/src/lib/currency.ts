/**
 * Shared currency config + formatter. Every vertical plugin (crm, financial,
 * inventory, orders, menu, marketing) copied this same Intl.NumberFormat wrapper;
 * they now import it from here. Plugins may still re-export it under a local alias
 * (e.g. `export { formatCurrency } from '@fayz-ai/saas'`) to keep call sites short.
 */
export interface CurrencyConfig {
  code: string
  locale: string
  symbol: string
}

export function formatCurrency(value: number, currency: CurrencyConfig): string {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2,
  }).format(value)
}
