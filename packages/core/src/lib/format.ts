import { getCurrentLocale } from '../i18n'

// Currency inferred from the active locale unless the app sets one explicitly
// via createSaasApp({ locale: { currency: 'BRL' } }).
const CURRENCY_BY_LOCALE: Record<string, string> = {
  'pt-BR': 'BRL',
  'pt-PT': 'EUR',
  en: 'USD',
  'en-US': 'USD',
  'en-GB': 'GBP',
  es: 'EUR',
}

let _defaultCurrency: string | null = null

export function setDefaultCurrency(code: string | undefined): void {
  _defaultCurrency = code ?? null
}

export function getActiveLocale(): string {
  try {
    return getCurrentLocale() || 'en'
  } catch {
    return 'en'
  }
}

export function getDefaultCurrency(): string {
  if (_defaultCurrency) return _defaultCurrency
  return CURRENCY_BY_LOCALE[getActiveLocale()] ?? 'USD'
}

export function formatCurrency(value: unknown, currency?: string): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return String(value ?? '')
  return new Intl.NumberFormat(getActiveLocale(), {
    style: 'currency',
    currency: currency ?? getDefaultCurrency(),
  }).format(num)
}

export function formatDate(value: unknown): string {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(getActiveLocale(), { dateStyle: 'medium' }).format(new Date(value as string))
  } catch {
    return String(value)
  }
}

export function formatDateTime(value: unknown): string {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(getActiveLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value as string))
  } catch {
    return String(value)
  }
}
