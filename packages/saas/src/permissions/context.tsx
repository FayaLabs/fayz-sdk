import * as React from 'react'
import type { FeatureDeclaration, PermissionsConfig, PermissionProfile } from '@fayz-ai/core'
import { usePluginRuntimeOptional } from '@fayz-ai/core'
import { usePermissionsStore } from './store'

// ---------------------------------------------------------------------------
// Permission check helpers
// ---------------------------------------------------------------------------

// The role-side check moved to @fayz-ai/core/access (single implementation for
// browser, headless and the Fayz broker). Re-exported to keep call-sites stable.
import { profileHasPermission } from '@fayz-ai/core/access'
export { profileHasPermission }

/**
 * Merge plugin-declared features with the app's own, deduped by id. The app's
 * declaration wins on collision (it can override a plugin's label/actions).
 */
function mergeFeatures(
  pluginFeatures: FeatureDeclaration[] | undefined,
  appFeatures: FeatureDeclaration[] | undefined,
): FeatureDeclaration[] {
  const byId = new Map<string, FeatureDeclaration>()
  for (const f of pluginFeatures ?? []) byId.set(f.id, f)
  for (const f of appFeatures ?? []) byId.set(f.id, f) // app override wins
  return Array.from(byId.values())
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface PermissionsContextValue {
  hasPermission: (feature: string, action?: string) => boolean
  canImpersonate: boolean
  startImpersonation: (profile: PermissionProfile) => void
  stopImpersonation: () => void
}

const PermissionsContext = React.createContext<PermissionsContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface PermissionsProviderProps {
  config?: PermissionsConfig
  children: React.ReactNode
}

export function PermissionsProvider({ config, children }: PermissionsProviderProps) {
  const { setFeatures, startImpersonation, stopImpersonation, currentProfile, isImpersonating } =
    usePermissionsStore()

  // Plugins declare their own permission features via `declaredFeatures`, which the
  // plugin runtime aggregates into `pluginFeatures`. Merging them here is what makes
  // a plugin "born compatible" — its features show up in the RBAC matrix and gate
  // checks without the app re-declaring them. The app's own `config.features` wins
  // on id collisions (app override), so an app can refine a plugin's declaration.
  const runtime = usePluginRuntimeOptional()
  const pluginFeatures = runtime?.pluginFeatures

  React.useEffect(() => {
    const merged = mergeFeatures(pluginFeatures, config?.features)
    if (merged.length > 0) {
      setFeatures(merged)
    }
  }, [config, pluginFeatures, setFeatures])

  function hasPermission(feature: string, action?: string): boolean {
    return profileHasPermission(currentProfile, feature, action)
  }

  const value: PermissionsContextValue = {
    hasPermission,
    canImpersonate: !isImpersonating,
    startImpersonation,
    stopImpersonation,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns a function that checks whether the current user has a given
 * permission. Throws if used outside <PermissionsProvider>.
 */
export function usePermission(): (feature: string, action?: string) => boolean {
  const ctx = React.useContext(PermissionsContext)
  if (!ctx) {
    throw new Error('usePermission must be used inside <PermissionsProvider>')
  }
  return ctx.hasPermission
}

/**
 * Like usePermission, but degrades to allow-all when no <PermissionsProvider>
 * is mounted — so SDK components (e.g. the CRUD engine's PermissionGate) work
 * under any host shell instead of throwing. Gating is an enhancement, not a
 * hard requirement at the component level.
 */
export function usePermissionOptional(): (feature: string, action?: string) => boolean {
  const ctx = React.useContext(PermissionsContext)
  return ctx?.hasPermission ?? (() => true)
}

/**
 * Convenience hook — returns true/false for a specific feature + action.
 * Example: `const canEdit = useHasPermission('clients', 'write')`
 */
export function useHasPermission(feature: string, action?: string): boolean {
  const ctx = React.useContext(PermissionsContext)
  if (!ctx) {
    throw new Error('useHasPermission must be used inside <PermissionsProvider>')
  }
  return ctx.hasPermission(feature, action)
}

/**
 * Convenience hook that surfaces the full permissions context, including
 * impersonation controls.
 */
export function usePermissions(): PermissionsContextValue {
  const ctx = React.useContext(PermissionsContext)
  if (!ctx) {
    throw new Error('usePermissions must be used inside <PermissionsProvider>')
  }
  return ctx
}

// Re-export feature declarations for use in feature flag checks
export type { FeatureDeclaration }
