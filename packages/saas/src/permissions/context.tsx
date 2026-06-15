import * as React from 'react'
import type { FeatureDeclaration, PermissionsConfig, PermissionProfile } from '@fayz-ai/core'
import { usePermissionsStore } from './store'

// ---------------------------------------------------------------------------
// Permission check helpers
// ---------------------------------------------------------------------------

function profileHasPermission(
  profile: PermissionProfile | null,
  feature: string,
  action?: string,
): boolean {
  if (!profile) return true

  const actions = profile.grants[feature]
  if (!actions) return false

  if (!action) return actions.length > 0

  return actions.includes(action) || actions.includes('manage')
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

  React.useEffect(() => {
    if (config?.features) {
      setFeatures(config.features)
    }
  }, [config, setFeatures])

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
