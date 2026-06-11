export interface LocaleConfig {
  default: string
  supported: string[]
  translations?: Record<string, Record<string, string>>
  /** ISO 4217 currency code for money formatting (e.g. 'BRL', 'USD'). */
  currency?: string
}
