import { useState, useCallback, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Plugin Preferences — localStorage-backed per-plugin user preferences
//
// Usage:
//   const prefs = usePluginPrefs('agenda', { calendarView: 'timeGridWeek', slotDuration: 30 })
//   prefs.get('calendarView')             // 'timeGridWeek'
//   prefs.set('calendarView', 'dayGridMonth')
//   prefs.getAll()                         // { calendarView: 'dayGridMonth', slotDuration: 30 }
//   prefs.reset()                          // back to defaults
//
// Keys are namespaced: `saas:prefs:{pluginId}` in localStorage.
// Each plugin gets its own isolated namespace.
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'saas:prefs:'

function readStore<T extends Record<string, unknown>>(pluginId: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + pluginId)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

function writeStore<T extends Record<string, unknown>>(pluginId: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + pluginId, JSON.stringify(data))
  } catch { /* quota exceeded or private browsing — silently ignore */ }
}

export interface PluginPrefs<T extends Record<string, unknown>> {
  /** Get a single preference value */
  get<K extends keyof T>(key: K): T[K]
  /** Set a single preference value (persists immediately) */
  set<K extends keyof T>(key: K, value: T[K]): void
  /** Update multiple preferences at once */
  update(partial: Partial<T>): void
  /** Get all preferences as an object */
  getAll(): T
  /** Reset all preferences to defaults */
  reset(): void
}

/**
 * Hook for localStorage-backed plugin preferences.
 *
 * @param pluginId  Unique plugin identifier (e.g. 'agenda', 'financial')
 * @param defaults  Default values — also defines the shape of the prefs object
 * @returns         PluginPrefs accessor with get/set/update/reset
 */
export function usePluginPrefs<T extends Record<string, unknown>>(
  pluginId: string,
  defaults: T,
): PluginPrefs<T> {
  const [state, setState] = useState<T>(() => readStore(pluginId, defaults))

  const get = useCallback(<K extends keyof T>(key: K): T[K] => {
    return state[key]
  }, [state])

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]): void => {
    setState((prev) => {
      const next = { ...prev, [key]: value }
      writeStore(pluginId, next)
      return next
    })
  }, [pluginId])

  const update = useCallback((partial: Partial<T>): void => {
    setState((prev) => {
      const next = { ...prev, ...partial }
      writeStore(pluginId, next)
      return next
    })
  }, [pluginId])

  const getAll = useCallback((): T => state, [state])

  const reset = useCallback((): void => {
    setState({ ...defaults })
    writeStore(pluginId, defaults)
  }, [pluginId, defaults])

  return useMemo(() => ({ get, set, update, getAll, reset }), [get, set, update, getAll, reset])
}

// ---------------------------------------------------------------------------
// Non-hook utility for use outside React components (e.g. in store factories)
// ---------------------------------------------------------------------------

export function getPluginPref<T>(pluginId: string, key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + pluginId)
    if (!raw) return defaultValue
    const parsed = JSON.parse(raw)
    return parsed[key] ?? defaultValue
  } catch {
    return defaultValue
  }
}

export function setPluginPref(pluginId: string, key: string, value: unknown): void {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + pluginId)
    const existing = raw ? JSON.parse(raw) : {}
    existing[key] = value
    localStorage.setItem(STORAGE_PREFIX + pluginId, JSON.stringify(existing))
  } catch { /* ignore */ }
}
