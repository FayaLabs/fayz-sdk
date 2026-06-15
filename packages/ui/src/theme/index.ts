import * as React from 'react'
import { useThemeStore, type CreateThemeOptions, type ThemeTokens, lightTheme, darkTheme } from '../stores/theme.store'

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  children: React.ReactNode
  /** Initial theme overrides to apply on mount */
  overrides?: CreateThemeOptions | null
  /** Default mode. Defaults to 'light'. */
  defaultMode?: 'light' | 'dark' | 'system'
}

export function ThemeProvider({ children, overrides, defaultMode }: ThemeProviderProps) {
  const initialize = useThemeStore((s) => s.initialize)
  const setMode = useThemeStore((s) => s.setMode)
  const setOverrides = useThemeStore((s) => s.setOverrides)

  React.useEffect(() => {
    if (defaultMode) {
      setMode(defaultMode)
    }
    if (overrides !== undefined) {
      setOverrides(overrides)
    }
    initialize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return children as React.ReactElement
}

// ---------------------------------------------------------------------------
// useTheme
// ---------------------------------------------------------------------------

export function useTheme() {
  const mode = useThemeStore((s) => s.mode)
  const resolvedMode = useThemeStore((s) => s.resolvedMode)
  const overrides = useThemeStore((s) => s.overrides)
  const setMode = useThemeStore((s) => s.setMode)
  const setOverrides = useThemeStore((s) => s.setOverrides)

  return {
    mode,
    resolvedMode,
    isDark: resolvedMode === 'dark',
    overrides,
    setMode,
    setOverrides,
  }
}

// ---------------------------------------------------------------------------
// createTheme — build a ThemeTokens object from partial overrides
// ---------------------------------------------------------------------------

export function createTheme(overrides: CreateThemeOptions): ThemeTokens {
  const colors = { ...lightTheme.colors, ...overrides.colors }

  // Brand shorthand: auto-derive primary, ring, accent from single HSL
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

  return {
    name: overrides.name ?? lightTheme.name,
    colors,
    perception: {
      ...lightTheme.perception,
      ...overrides.perception,
    },
  }
}

// Re-export types for convenience
export type { CreateThemeOptions, ThemeTokens }
export { lightTheme, darkTheme }
export { fayzUiPreset } from './preset'
export { createFayzTheme, fayzThemePresets } from './presets'
export type { FayzThemePresetId } from './presets'
