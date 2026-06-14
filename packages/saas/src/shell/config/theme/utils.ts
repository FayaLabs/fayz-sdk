import type {
  ThemeTokens,
  SemanticColors,
  UIPerceptionTokens,
  SaasTheme,
  ThemeRadius,
  ThemeShadow,
  ThemeFont,
} from './tokens'
import { lightTheme } from './light'
import { createFayzTheme } from '@fayz-ai/ui'

export interface CreateThemeOptions {
  name?: string
  colors?: Partial<SemanticColors>
  /** Dark mode color overrides — applied instead of `colors` when in dark mode */
  darkColors?: Partial<SemanticColors>
  perception?: Partial<UIPerceptionTokens>
  /** Shorthand: single HSL value that auto-derives primary, ring, and accent */
  brand?: string
}

// --- Friendly preset maps ---

const RADIUS_MAP: Record<ThemeRadius, { button: string; card: string; input: string; modal: string }> = {
  sharp:  { button: '0.25rem', card: '0.375rem', input: '0.25rem', modal: '0.5rem' },
  soft:   { button: '0.5rem',  card: '0.75rem',  input: '0.5rem',  modal: '0.75rem' },
  round:  { button: '9999px',  card: '1rem',     input: '0.75rem', modal: '1.25rem' },
}

const SHADOW_MAP: Record<ThemeShadow, { sm: string; md: string; lg: string }> = {
  none:   { sm: 'none', md: 'none', lg: 'none' },
  subtle: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)', md: '0 2px 4px -1px rgb(0 0 0 / 0.06)', lg: '0 4px 6px -2px rgb(0 0 0 / 0.05)' },
  medium: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  bold:   { sm: '0 1px 3px 0 rgb(0 0 0 / 0.1)', md: '0 4px 8px -1px rgb(0 0 0 / 0.15), 0 2px 4px -1px rgb(0 0 0 / 0.1)', lg: '0 12px 24px -4px rgb(0 0 0 / 0.15), 0 4px 8px -2px rgb(0 0 0 / 0.1)' },
}

const FONT_MAP: Record<ThemeFont, string> = {
  'system':       'ui-sans-serif, system-ui, -apple-system, sans-serif',
  'inter':        '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'dm-sans':      '"DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'poppins':      '"Poppins", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'geist':        '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'plus-jakarta': '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'outfit':       '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  'nunito':       '"Nunito", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'source-sans':  '"Source Sans 3", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'raleway':      '"Raleway", ui-sans-serif, system-ui, -apple-system, sans-serif',
  'manrope':      '"Manrope", ui-sans-serif, system-ui, -apple-system, sans-serif',
}

/**
 * Resolve a SaasTheme (friendly format) into CreateThemeOptions (internal format).
 * This is the main API for vertical themes.
 *
 * Light-only colors (content bg, card, border, etc.) go into `colors`.
 * Dark-mode overrides go into `darkColors` so the dark base theme isn't broken.
 * Sidebar colors are always applied (same in both modes — the sidebar has its own palette).
 */
export function resolveTheme(theme: SaasTheme): CreateThemeOptions {
  const presetId = theme.preset ?? 'classic_admin'
  const preset = createFayzTheme(presetId)
  const radius = theme.radius ? RADIUS_MAP[theme.radius] : presetId === 'classic_admin' ? RADIUS_MAP.soft : undefined
  const shadow = theme.shadow ? SHADOW_MAP[theme.shadow] : presetId === 'classic_admin' ? SHADOW_MAP.medium : undefined
  const font = theme.font ? FONT_MAP[theme.font] : presetId === 'classic_admin' ? FONT_MAP.inter : undefined

  // --- Light mode colors ---
  const colors: Partial<SemanticColors> = { ...theme.colors }

  // Content background (light mode only)
  if (theme.content) {
    colors.content = theme.content.background
  }

  // Sidebar colors apply in both modes (sidebar has its own palette)
  if (theme.sidebar) {
    colors.sidebar = theme.sidebar.background
    colors.sidebarForeground = theme.sidebar.foreground
    colors.sidebarAccent = theme.sidebar.accent
    colors.sidebarAccentForeground = theme.sidebar.accentForeground
    if (theme.sidebar.border) colors.sidebarBorder = theme.sidebar.border
    if (theme.sidebar.muted) colors.sidebarMuted = theme.sidebar.muted
  }

  // --- Dark mode colors (only sidebar + brand — let darkTheme handle the rest) ---
  const darkColors: Partial<SemanticColors> = {}

  // Sidebar keeps same palette in dark mode
  if (theme.sidebar) {
    darkColors.sidebar = theme.sidebar.background
    darkColors.sidebarForeground = theme.sidebar.foreground
    darkColors.sidebarAccent = theme.sidebar.accent
    darkColors.sidebarAccentForeground = theme.sidebar.accentForeground
    if (theme.sidebar.border) darkColors.sidebarBorder = theme.sidebar.border
    if (theme.sidebar.muted) darkColors.sidebarMuted = theme.sidebar.muted
  }

  return {
    ...preset,
    name: theme.name,
    brand: theme.brand,
    colors: {
      ...(preset.colors ?? {}),
      ...colors,
    },
    darkColors: {
      ...(preset.darkColors ?? {}),
      ...darkColors,
    },
    perception: {
      ...(preset.perception ?? {}),
      fontFamilyMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      ...(radius
        ? {
            buttonRadius: radius.button,
            cardRadius: radius.card,
            inputRadius: radius.input,
            modalRadius: radius.modal,
          }
        : {}),
      ...(font ? { fontFamily: font } : {}),
      ...(shadow
        ? {
            shadowSm: shadow.sm,
            shadowMd: shadow.md,
            shadowLg: shadow.lg,
          }
        : {}),
    },
  }
}

export function createTheme(overrides: CreateThemeOptions): ThemeTokens {
  const colors = { ...lightTheme.colors, ...overrides.colors }

  // Brand shorthand: auto-derive primary, ring, accent from single HSL
  if (overrides.brand) {
    colors.primary = overrides.brand
    colors.primaryForeground = '0 0% 100%'
    colors.ring = overrides.brand
    // Derive accent by shifting hue ~50 degrees
    const parts = overrides.brand.split(' ')
    if (parts.length >= 3) {
      const hue = (parseFloat(parts[0]) - 50 + 360) % 360
      colors.accent = `${hue} ${parts[1]} ${parts[2]}`
      colors.accentForeground = '0 0% 100%'
    }
  }

  return {
    name: overrides.name ?? lightTheme.name,
    colors,
    perception: {
      ...lightTheme.perception,
      ...overrides.perception,
    },
  }
}

const colorVarMap: Record<string, string> = {
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  warning: '--warning',
  warningForeground: '--warning-foreground',
  // Layout surfaces
  sidebar: '--sidebar',
  sidebarForeground: '--sidebar-foreground',
  sidebarBorder: '--sidebar-border',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarMuted: '--sidebar-muted',
  content: '--content',
}

const perceptionVarMap: Record<string, string> = {
  buttonRadius: '--button-radius',
  cardRadius: '--card-radius',
  inputRadius: '--input-radius',
  modalRadius: '--modal-radius',
  fontFamily: '--font-family',
  fontFamilyMono: '--font-family-mono',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  shadowButton: '--shadow-button',
  shadowButtonPrimary: '--shadow-button-primary',
  shadowButtonInset: '--shadow-button-inset',
  surfaceBackdropFilter: '--surface-backdrop-filter',
  modalBackground: '--modal-bg',
  modalBorder: '--modal-border',
  modalOverlayBackground: '--modal-overlay-bg',
  modalOverlayBackdropFilter: '--modal-overlay-backdrop-filter',
  modalShadow: '--modal-shadow',
  glassEdgeGradient: '--glass-edge-gradient',
  glassPrimaryEdgeGradient: '--glass-primary-edge-gradient',
  glassInnerHighlight: '--glass-inner-highlight',
  fieldBackground: '--field-bg',
  fieldBorder: '--field-border',
  fieldShadow: '--field-shadow',
  buttonBackground: '--button-bg',
  buttonBackgroundHover: '--button-hover-bg',
  buttonBorder: '--button-border',
  buttonPrimaryBackground: '--button-primary-bg',
  buttonPrimaryBackgroundHover: '--button-primary-hover-bg',
  buttonPrimaryBorder: '--button-primary-border',
  buttonBackdropFilter: '--button-backdrop-filter',
}

export function applyTheme(theme: ThemeTokens, element?: HTMLElement): void {
  const target = element ?? document.documentElement

  for (const [key, cssVar] of Object.entries(colorVarMap)) {
    const value = theme.colors[key as keyof typeof theme.colors]
    if (value) {
      target.style.setProperty(cssVar, value)
    }
  }

  for (const [key, cssVar] of Object.entries(perceptionVarMap)) {
    const value = theme.perception[key as keyof typeof theme.perception]
    if (value) {
      target.style.setProperty(cssVar, value)
    }
  }
}

export function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
