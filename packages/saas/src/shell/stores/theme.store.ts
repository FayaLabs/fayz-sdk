import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { ThemeTokens } from '../config/theme/tokens'
import { lightTheme } from '../config/theme/light'
import { darkTheme } from '../config/theme/dark'
import { applyTheme } from '../config/theme/utils'
import type { CreateThemeOptions } from '../config/theme/utils'

type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'saas-core:theme-mode'

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
  // In dark mode, use darkColors if provided; otherwise skip light-only colors.
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

const STORE_KEY = '__saas_core_theme_store__'

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

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode)
      }

      const { overrides } = get()
      const baseTheme = resolved === 'dark' ? darkTheme : lightTheme
      const theme = buildTheme(baseTheme, overrides)

      if (typeof document !== 'undefined') {
        // Enable color transition before applying changes
        document.documentElement.classList.add('theme-transitioning')

        applyTheme(theme)
        document.documentElement.classList.toggle('dark', resolved === 'dark')

        // Remove transition class after animation completes
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

    // Legacy compat — if someone passes a full ThemeTokens, store it as overrides
    setCustomTheme: (_theme) => {
      // Ignore — callers should use setOverrides now
    },

    initialize: () => {
      const { mode, setMode } = get()
      setMode(mode)

      // Listen for OS theme changes when in 'system' mode
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
