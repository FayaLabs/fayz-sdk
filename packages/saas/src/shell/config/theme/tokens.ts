import type { FayzThemePresetId } from '@fayz-ai/ui'

export interface ThemeTokens {
  name: string
  colors: SemanticColors
  perception: UIPerceptionTokens
}

export interface SemanticColors {
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  muted: string
  mutedForeground: string
  border: string
  input: string
  ring: string
  popover: string
  popoverForeground: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string

  // Layout surface colors
  sidebar: string
  sidebarForeground: string
  sidebarBorder: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarMuted: string
  content: string
}

export interface UIPerceptionTokens {
  buttonRadius: string
  cardRadius: string
  inputRadius: string
  modalRadius: string
  fontFamily: string
  fontFamilyMono: string
  shadowSm: string
  shadowMd: string
  shadowLg: string
  shadowButton?: string
  shadowButtonPrimary?: string
  shadowButtonInset?: string
  surfaceBackdropFilter?: string
  modalBackground?: string
  modalBorder?: string
  modalOverlayBackground?: string
  modalOverlayBackdropFilter?: string
  modalShadow?: string
  glassEdgeGradient?: string
  glassPrimaryEdgeGradient?: string
  glassInnerHighlight?: string
  fieldBackground?: string
  fieldBorder?: string
  fieldShadow?: string
  buttonBackground?: string
  buttonBackgroundHover?: string
  buttonBorder?: string
  buttonPrimaryBackground?: string
  buttonPrimaryBackgroundHover?: string
  buttonPrimaryBorder?: string
  buttonBackdropFilter?: string
}

// --- Friendly theme presets (non-technical) ---

export type ThemeRadius = 'sharp' | 'soft' | 'round'
export type ThemeDensity = 'compact' | 'comfortable' | 'spacious'
export type ThemeShadow = 'none' | 'subtle' | 'medium' | 'bold'
export type ThemeFont = 'system' | 'inter' | 'dm-sans' | 'poppins' | 'geist' | 'plus-jakarta' | 'outfit' | 'nunito' | 'source-sans' | 'raleway' | 'manrope'

export interface SaasTheme {
  name: string
  preset?: FayzThemePresetId
  brand: string
  radius?: ThemeRadius
  density?: ThemeDensity
  shadow?: ThemeShadow
  font?: ThemeFont
  sidebar?: {
    background: string
    foreground: string
    border?: string
    accent: string
    accentForeground: string
    muted?: string
  }
  content?: {
    background: string
  }
  colors?: Partial<SemanticColors>
}
