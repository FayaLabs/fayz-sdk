import * as React from 'react'
import type { FeatureDeclaration, PermissionsConfig, PermissionProfile } from '@fayz-ai/core'
import { usePluginRuntimeOptional } from '@fayz-ai/core'
import { usePermissionsStore } from './store'

// ---------------------------------------------------------------------------
// Permission check helpers
// ---------------------------------------------------------------------------

/**
 * The org owner has every permission implicitly. Owner is represented by the
 * canonical role id `owner` across adapters (see org/adapters/supabase.ts
 * buildPermissionProfiles:170, which also grants owner all catalog perms, and
 * the mock adapter's `owner` fallback). We match by id first, falling back to
 * the (possibly localized) name for safety.
 */
function isOwnerProfile(profile: PermissionProfile): boolean {
  return profile.id === 'owner' || profile.name?.toLowerCase() === 'owner'
}

/**
 * The single role-side permission check. Exported so the access engine
 * (packages/saas/src/access) composes plan entitlements ON TOP of it instead of
 * reimplementing owner-bypass / manage semantics.
 */
export function profileHasPermission(
  profile: PermissionProfile | null,
  feature: string,
  action?: string,
): boolean {
  if (!profile) return true

  // Owner bypass: never lock the owner out, even if the RBAC catalog is empty
  // or still loading. Because permission checks read `currentProfile`, which
  // becomes the *previewed* role during impersonation, an owner previewing a
  // non-owner role correctly loses this bypass — the preview stays honest.
  if (isOwnerProfile(profile)) return true

  const actions = profile.grants[feature]
  if (!actions) return false

  if (!action) return actions.length > 0

  return actions.includes(action) || actions.includes('manage')
}

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
