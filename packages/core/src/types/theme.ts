export type ThemeBrand = 'blue' | 'violet' | 'green' | 'orange' | 'red' | 'pink' | 'teal' | (string & {})
export type ThemeRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface SaasTheme {
  brand?: ThemeBrand
  radius?: ThemeRadius
  /** Custom primary color as HSL string, e.g. '220 70% 50%' */
  primaryHsl?: string
  /** Custom secondary color as HSL string */
  secondaryHsl?: string
}

export interface ThemeConfig {
  theme?: SaasTheme
  defaultMode?: ThemeMode
}
