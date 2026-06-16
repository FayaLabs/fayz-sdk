import * as React from 'react'
import type { DashboardLayoutConfig, DashboardSurface } from '@fayz-ai/core'

export interface DashboardPreferencesState {
  /** User-level layout overrides for this surface (null when none saved). */
  prefs: DashboardLayoutConfig | null
  /** Persist updated overrides. */
  save: (next: DashboardLayoutConfig) => void
  /** Toggle a single widget's visibility and persist. */
  setVisible: (widgetId: string, visible: boolean) => void
  /** Clear all overrides (reset to registration + app defaults). */
  reset: () => void
}

const KEY = (surface: DashboardSurface, scope: string) => `fayz.dashboard.prefs.${scope}.${surface}`

function read(key: string): DashboardLayoutConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as DashboardLayoutConfig) : null
  } catch {
    return null
  }
}

/**
 * Per-user dashboard preferences, persisted to localStorage.
 *
 * `scope` lets a plugin-home keep its own prefs separate from the global home
 * (pass the domain). A future pass can swap the storage for the tenant/plugin
 * binding store without touching callers — `resolveDashboardLayout` already
 * consumes whatever this returns as the `userPrefs` layer.
 */
export function useDashboardPreferences(surface: DashboardSurface, scope = 'home'): DashboardPreferencesState {
  const key = KEY(surface, scope)
  const [prefs, setPrefs] = React.useState<DashboardLayoutConfig | null>(() => read(key))

  // Re-read when the target surface/scope changes.
  React.useEffect(() => { setPrefs(read(key)) }, [key])

  const save = React.useCallback((next: DashboardLayoutConfig) => {
    setPrefs(next)
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore quota/availability */ }
    }
  }, [key])

  const setVisible = React.useCallback((widgetId: string, visible: boolean) => {
    setPrefs((cur) => {
      const widgets = [...(cur?.widgets ?? [])]
      const i = widgets.findIndex((w) => w.id === widgetId)
      if (i >= 0) widgets[i] = { ...widgets[i]!, visible }
      else widgets.push({ id: widgetId, visible })
      const next = { ...cur, widgets }
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
      }
      return next
    })
  }, [key])

  const reset = React.useCallback(() => {
    setPrefs(null)
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(key) } catch { /* ignore */ }
    }
  }, [key])

  return { prefs, save, setVisible, reset }
}
