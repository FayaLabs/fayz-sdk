import * as React from 'react'
import type { ModuleNavItem } from '@fayz-ai/ui'
import { usePermissionsStore } from '../permissions/store'
import { useAccessOptional } from './context'
import type { AccessApi } from './types'

// ---------------------------------------------------------------------------
// useModuleNavAccess — the LINK-side counterpart of EntitlementGate for a
// plugin's INTERNAL navigation (ModulePage sub-nav). Mirrors the top-level
// Sidebar/AdminShell rule so a premium sub-module link reads identically:
//
//   • role denies  (can(feature,'read').reason === 'role')  → REMOVE the link
//   • plan denies  (entitled(feature) === false)            → keep, premium:true
//                    (the click still navigates; the gated CONTENT shows the
//                     UpgradePrompt via EntitlementGate)
//   • otherwise                                             → keep as-is
//
// A feature id ABSENT from the RBAC catalog is treated as "default allow": the
// role axis is skipped entirely for it (an undeclared feature can't be a role
// denial), so apps that wire the plugin without declaring the sub-feature don't
// lose the link. The plan axis is naturally safe already — `entitled` returns
// true for any feature a plan never disables.
//
// Recursive over `children`. Degrades to allow-all when no <AccessProvider> is
// mounted (bare host shell), exactly like `useAccessOptional`.
// ---------------------------------------------------------------------------

/**
 * Pure decoration used by {@link useModuleNavAccess}. Kept store-free so it is
 * directly unit-testable: pass the composed {@link AccessApi} and the set of
 * feature ids known to the RBAC catalog.
 */
export function applyNavAccess(
  items: ModuleNavItem[],
  access: AccessApi,
  knownFeatures: Set<string>,
): ModuleNavItem[] {
  const decorate = (item: ModuleNavItem): ModuleNavItem | null => {
    const children = item.children
      ? item.children
          .map(decorate)
          .filter((c): c is ModuleNavItem => c !== null)
      : undefined

    if (!item.feature) {
      return children ? { ...item, children } : item
    }

    // Role axis — only meaningful for a feature the RBAC catalog actually
    // declares. An undeclared feature defaults to allow (never removed).
    if (knownFeatures.has(item.feature)) {
      const decision = access.can(item.feature, 'read')
      if (!decision.allowed && decision.reason === 'role') return null
    }

    // Plan axis — `entitled` is `false` only on an explicit plan denial; absent
    // features stay entitled, so no Crown appears for them.
    const premium = access.entitled(item.feature) === false

    return children ? { ...item, premium, children } : { ...item, premium }
  }

  return items.map(decorate).filter((i): i is ModuleNavItem => i !== null)
}

/**
 * Resolve a plugin's internal nav against role × plan: hides role-denied links,
 * badges plan-denied ones with a Crown (`premium`), and passes everything else
 * through unchanged. Recursive over children.
 */
export function useModuleNavAccess(items: ModuleNavItem[]): ModuleNavItem[] {
  const access = useAccessOptional()
  const features = usePermissionsStore((s) => s.features)
  const knownFeatures = React.useMemo(
    () => new Set(features.map((f) => f.id)),
    [features],
  )
  return React.useMemo(
    () => applyNavAccess(items, access, knownFeatures),
    [items, access, knownFeatures],
  )
}
