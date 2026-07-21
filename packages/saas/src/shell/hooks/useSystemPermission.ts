import { useCallback } from 'react'
import type { SystemPermission } from '@fayz-ai/core'
import { usePermissionsStore } from '../../permissions'

// ---------------------------------------------------------------------------
// useSystemPermission — native replacement for the org-management (system)
// permission check that used to live in the legacy shell/hooks/usePermission.
// Mirrors the owner bypass in permissions/context.tsx: a null profile (owner /
// no RBAC loaded) and the `owner` role pass through, so the owner is never
// blocked. Grants-based feature checks stay with usePermission(Optional).
// ---------------------------------------------------------------------------

export function useSystemPermission(): (perm: SystemPermission) => boolean {
  const currentProfile = usePermissionsStore((s) => s.currentProfile)
  return useCallback(
    (perm: SystemPermission) => {
      if (!currentProfile) return true
      if (currentProfile.id === 'owner' || currentProfile.name?.toLowerCase() === 'owner') return true
      return currentProfile.systemPermissions?.includes(perm) ?? false
    },
    [currentProfile],
  )
}
