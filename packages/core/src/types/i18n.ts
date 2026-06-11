export interface LocaleConfig {
  default: string
  supported: string[]
  translations?: Record<string, Record<string, string>>
}
