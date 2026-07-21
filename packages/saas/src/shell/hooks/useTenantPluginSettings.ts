import { useCallback, useMemo, useRef } from 'react'
import { useOrganizationStore, useOrgAdapterOptional } from '../../org'
import { usePluginPrefs } from './usePluginPrefs'

// ---------------------------------------------------------------------------
// useTenantPluginSettings — PER-TENANT plugin settings, persisted server-side
//
// Unlike usePluginPrefs (per-browser localStorage), this hook stores each
// plugin's settings under the current organization so they follow the tenant
// across devices/sessions:
//
//   tenants.settings = { ..., plugins: { [pluginId]: { key: value, ... } } }
//
// Reads come from the native org store (`currentOrg.settings.plugins[pluginId]`)
// merged over `defaults`. Writes optimistically patch the store and then
// persist via `adapter.updateOrg(orgId, { settings })` (lightly debounced so a
// burst of toggles collapses into one network round-trip).
//
// When no org adapter is mounted (standalone / mock-less demo), it transparently
// falls back to `usePluginPrefs` (localStorage) with the SAME api, so the caller
// never has to branch.
//
// NOTE (follow-up): persisting + re-hydrating these values is the contract here.
// Actually *consuming* them to change plugin behaviour is a separate follow-up —
// today most of these keys are inert flags that only round-trip through storage.
// ---------------------------------------------------------------------------

export interface TenantPluginSettings<T extends Record<string, unknown>> {
  /** Get a single setting value (falls back to the provided default). */
  get<K extends keyof T>(key: K): T[K]
  /** Set a single setting value — optimistic + debounced persistence. */
  set<K extends keyof T>(key: K, value: T[K]): void
  /** Get all settings merged over defaults. */
  getAll(): T
  /** Whether values are persisted per-tenant (true) or per-browser fallback (false). */
  isTenantScoped: boolean
}

/** Extract this plugin's settings blob from an org's settings, merged over defaults. */
function readForPlugin<T extends Record<string, unknown>>(
  settings: unknown,
  pluginId: string,
  defaults: T,
): T {
  const root = settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {}
  const plugins = root.plugins && typeof root.plugins === 'object' ? (root.plugins as Record<string, unknown>) : {}
  const forPlugin = plugins[pluginId]
  const merged = forPlugin && typeof forPlugin === 'object' ? (forPlugin as Partial<T>) : {}
  return { ...defaults, ...merged }
}

const DEBOUNCE_MS = 400

export function useTenantPluginSettings<T extends Record<string, unknown>>(
  pluginId: string,
  defaults: T,
): TenantPluginSettings<T> {
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg)
  const adapter = useOrgAdapterOptional()

  // Always mounted (hooks can't be conditional). Used as the fallback store when
  // there's no org adapter to persist against.
  const localPrefs = usePluginPrefs<T>(pluginId, defaults)

  const isTenantScoped = !!(adapter && currentOrg)

  const stored = useMemo(
    () => readForPlugin(currentOrg?.settings, pluginId, defaults),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentOrg?.settings, pluginId],
  )

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleWrite = useCallback(
    (orgId: string, settings: Record<string, unknown>) => {
      if (!adapter) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        adapter
          .updateOrg(orgId, { settings })
          .then((updated) => setCurrentOrg(updated))
          .catch(() => {
            /* keep the optimistic value; a later save or refresh reconciles */
          })
      }, DEBOUNCE_MS)
    },
    [adapter, setCurrentOrg],
  )

  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]): void => {
      const org = useOrganizationStore.getState().currentOrg
      if (!adapter || !org) {
        localPrefs.set(key, value)
        return
      }
      // Read the freshest org from the store so rapid successive sets accumulate
      // instead of clobbering each other via a stale closure.
      const settings = (org.settings ?? {}) as Record<string, unknown>
      const plugins = (settings.plugins ?? {}) as Record<string, unknown>
      const nextForPlugin = { ...readForPlugin(settings, pluginId, defaults), [key]: value }
      const nextSettings = { ...settings, plugins: { ...plugins, [pluginId]: nextForPlugin } }
      // Optimistic: reflect immediately so the toggle updates without a round-trip.
      setCurrentOrg({ ...org, settings: nextSettings })
      scheduleWrite(org.id, nextSettings)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter, pluginId, setCurrentOrg, scheduleWrite, localPrefs],
  )

  const get = useCallback(
    <K extends keyof T>(key: K): T[K] => (isTenantScoped ? stored[key] : localPrefs.get(key)),
    [isTenantScoped, stored, localPrefs],
  )

  const getAll = useCallback(
    (): T => (isTenantScoped ? stored : localPrefs.getAll()),
    [isTenantScoped, stored, localPrefs],
  )

  return useMemo(
    () => ({ get, set, getAll, isTenantScoped }),
    [get, set, getAll, isTenantScoped],
  )
}
