import { create, type StoreApi, type UseBoundStore } from 'zustand'

// ---------------------------------------------------------------------------
// Theme token types
// ---------------------------------------------------------------------------

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

export interface ThemeTokens {
  name: string
  colors: SemanticColors
  perception: UIPerceptionTokens
}

export interface CreateThemeOptions {
  name?: string
  colors?: Partial<SemanticColors>
  /** Dark mode color overrides — applied instead of `colors` when in dark mode */
  darkColors?: Partial<SemanticColors>
  perception?: Partial<UIPerceptionTokens>
  /** Shorthand: single HSL value that auto-derives primary, ring, and accent */
  brand?: string
}

// ---------------------------------------------------------------------------
// Built-in themes
// ---------------------------------------------------------------------------

export const lightTheme: ThemeTokens = {
  name: 'light',
  colors: {
    primary: '0 0% 18.8%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 96.9%',
    secondaryForeground: '0 0% 18.8%',
    accent: '0 0% 94.5%',
    accentForeground: '0 0% 18.8%',
    background: '0 0% 94.5%',
    foreground: '0 0% 18.8%',
    card: '0 0% 100%',
    cardForeground: '0 0% 18.8%',
    muted: '0 0% 96.9%',
    mutedForeground: '0 0% 38%',
    border: '0 0% 89%',
    input: '0 0% 54.1%',
    ring: '214 100% 41.4%',
    popover: '0 0% 100%',
    popoverForeground: '0 0% 18.8%',
    destructive: '354 92% 41%',
    destructiveForeground: '0 0% 100%',
    success: '167 95% 25.1%',
    successForeground: '0 0% 100%',
    warning: '43 100% 50%',
    warningForeground: '0 0% 18.8%',
    sidebar: '0 0% 92.2%',
    sidebarForeground: '0 0% 18.8%',
    sidebarBorder: '0 0% 86.3%',
    sidebarAccent: '0 0% 100%',
    sidebarAccentForeground: '0 0% 18.8%',
    sidebarMuted: '0 0% 38%',
    content: '0 0% 94.5%',
  },
  perception: {
    buttonRadius: '0.5rem',
    cardRadius: '0.5rem',
    inputRadius: '0.5rem',
    modalRadius: '1rem',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
    shadowSm: '0 1px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(26, 26, 26, 0.06), 0 1px 2px -1px rgba(26, 26, 26, 0.06)',
    shadowMd: '0 1px 1px -1px rgba(26, 26, 26, 0.07), 0 4px 8px -2px rgba(26, 26, 26, 0.10)',
    shadowLg: '0 4px 12px -2px rgba(26, 26, 26, 0.15), 0 1px 3px rgba(26, 26, 26, 0.08)',
    shadowButton:
      'inset 0 -1px 0 rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.50), 0 1px 0 rgba(0,0,0,0.05)',
    shadowButtonPrimary:
      'inset 0 -1px 0 rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.20), 0 1px 1.5px rgba(0,0,0,0.20)',
    shadowButtonInset:
      'inset 0 2px 1px -1px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(0,0,0,0.05)',
    surfaceBackdropFilter: 'none',
    buttonBackground: 'hsl(var(--card))',
    buttonBackgroundHover: 'hsl(var(--muted))',
    buttonBorder: 'hsl(var(--border))',
    buttonPrimaryBackground: 'hsl(var(--primary))',
    buttonPrimaryBackgroundHover: 'hsl(var(--primary) / 0.9)',
    buttonPrimaryBorder: 'hsl(var(--primary))',
    buttonBackdropFilter: 'none',
  },
}

export const darkTheme: ThemeTokens = {
  name: 'dark',
  colors: {
    primary: '0 0% 100%',
    primaryForeground: '0 0% 10.2%',
    secondary: '0 0% 18.8%',
    secondaryForeground: '0 0% 89%',
    accent: '0 0% 22.7%',
    accentForeground: '0 0% 100%',
    background: '0 0% 10.2%',
    foreground: '0 0% 89%',
    card: '0 0% 14.9%',
    cardForeground: '0 0% 89%',
    muted: '0 0% 18.8%',
    mutedForeground: '0 0% 64.7%',
    border: '0 0% 22.7%',
    input: '0 0% 32.2%',
    ring: '217 100% 68.4%',
    popover: '0 0% 18.8%',
    popoverForeground: '0 0% 89%',
    destructive: '7 100% 44.9%',
    destructiveForeground: '0 0% 100%',
    success: '156 71% 42.5%',
    successForeground: '0 0% 0%',
    warning: '41 100% 65.1%',
    warningForeground: '0 0% 10.2%',
    sidebar: '0 0% 10.2%',
    sidebarForeground: '0 0% 89%',
    sidebarBorder: '0 0% 16.5%',
    sidebarAccent: '0 0% 18.8%',
    sidebarAccentForeground: '0 0% 100%',
    sidebarMuted: '0 0% 64.7%',
    content: '0 0% 10.2%',
  },
  perception: {
    buttonRadius: '0.5rem',
    cardRadius: '0.5rem',
    inputRadius: '0.5rem',
    modalRadius: '1rem',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
    shadowSm: '0 1px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
    shadowMd: '0 1px 1px -1px rgba(0, 0, 0, 0.5), 0 4px 8px -2px rgba(0, 0, 0, 0.6)',
    shadowLg: '0 4px 12px -2px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)',
    shadowButton:
      'inset 0 -1px 0 rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.30)',
    shadowButtonPrimary:
      'inset 0 -1px 0 rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.40), 0 1px 1.5px rgba(0,0,0,0.40)',
    shadowButtonInset:
      'inset 0 2px 1px -1px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(0,0,0,0.20)',
    surfaceBackdropFilter: 'none',
    buttonBackground: 'hsl(var(--card))',
    buttonBackgroundHover: 'hsl(var(--muted))',
    buttonBorder: 'hsl(var(--border))',
    buttonPrimaryBackground: 'hsl(var(--primary))',
    buttonPrimaryBackgroundHover: 'hsl(var(--primary) / 0.9)',
    buttonPrimaryBorder: 'hsl(var(--primary))',
    buttonBackdropFilter: 'none',
  },
}

// ---------------------------------------------------------------------------
// CSS variable maps
// ---------------------------------------------------------------------------

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

function applyTheme(theme: ThemeTokens, element?: HTMLElement): void {
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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'fayz-ui:theme-mode'

interface ThemeState {
  mode: ThemeMode
  resolvedMode: 'light' | 'dark'
  /** Only the user's partial overrides — NOT a full theme */
  overrides: CreateThemeOptions | null
  setMode: (mode: ThemeMode) => void
  setOverrides: (overrides: CreateThemeOptions | null) => void
  initialize: () => void
  // Keep old API name working
  setCustomTheme: (theme: ThemeTokens | null) => void
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSavedMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'light'
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemPreference() : mode
}

/** Merge base theme (light or dark) with user's partial overrides */
function buildTheme(base: ThemeTokens, overrides: CreateThemeOptions | null): ThemeTokens {
  if (!overrides) return base

  const isDark = base.name === 'dark'
  const colors = { ...base.colors }

  // Brand shorthand: derive primary, ring, accent from single HSL
  if (overrides.brand) {
    colors.primary = overrides.brand
    colors.primaryForeground = '0 0% 100%'
    colors.ring = overrides.brand
    const parts = overrides.brand.split(' ')
    if (parts.length >= 3) {
      const hue = (parseFloat(parts[0]) - 50 + 360) % 360
      colors.accent = `${hue} ${parts[1]} ${parts[2]}`
      colors.accentForeground = '0 0% 100%'
    }
  }

  // Apply explicit color overrides.
  const colorOverrides = isDark && overrides.darkColors
    ? overrides.darkColors
    : overrides.colors

  if (colorOverrides) {
    for (const [key, value] of Object.entries(colorOverrides)) {
      if (value !== undefined) {
        (colors as any)[key] = value
      }
    }
  }

  return {
    name: overrides.name ?? base.name,
    colors,
    perception: {
      ...base.perception,
      ...(overrides.perception ?? {}),
    },
  }
}

const STORE_KEY = '__fayz_ui_theme_store__'

function createThemeStore(): UseBoundStore<StoreApi<ThemeState>> {
  // Window-level singleton to survive linked-package dual-module loading
  if (typeof window !== 'undefined' && (window as any)[STORE_KEY]) {
    return (window as any)[STORE_KEY]
  }

  const store = create<ThemeState>((set, get) => ({
    mode: getSavedMode(),
    resolvedMode: 'light',
    overrides: null,

    setMode: (mode) => {
      const resolved = resolveMode(mode)
      set({ mode, resolvedMode: resolved })

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode)
      }

      const { overrides } = get()
      const baseTheme = resolved === 'dark' ? darkTheme : lightTheme
      const theme = buildTheme(baseTheme, overrides)

      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('theme-transitioning')
        applyTheme(theme)
        document.documentElement.classList.toggle('dark', resolved === 'dark')
        setTimeout(() => {
          document.documentElement.classList.remove('theme-transitioning')
        }, 450)
      } else {
        applyTheme(theme)
      }
    },

    setOverrides: (overrides) => {
      set({ overrides })
      const { resolvedMode } = get()
      const baseTheme = resolvedMode === 'dark' ? darkTheme : lightTheme
      const theme = buildTheme(baseTheme, overrides)
      applyTheme(theme)
    },

    // Legacy compat
    setCustomTheme: (_theme) => {
      // Ignore — callers should use setOverrides now
    },

    initialize: () => {
      const { mode, setMode } = get()
      setMode(mode)

      if (typeof window !== 'undefined') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          const current = get()
          if (current.mode === 'system') {
            current.setMode('system')
          }
        })
      }
    },
  }))

  if (typeof window !== 'undefined') {
    (window as any)[STORE_KEY] = store
  }

  return store
}

export const useThemeStore = createThemeStore()
