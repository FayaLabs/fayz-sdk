import { useCallback, useMemo } from 'react'
import { useTenantStore } from '../stores/tenant.store'
import { usePermissionsStore } from '../stores/permissions.store'
import type { MemberRole } from '../types'
import type { PermissionAction, SystemPermission } from '../types/permissions'

// Legacy role-based permissions (backward compat)
const PERMISSIONS = [
  'manage_billing',
  'manage_members',
  'manage_settings',
  'manage_content',
  'view_content',
  'view_analytics',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((p) => p !== 'manage_billing'),
  manager: ['manage_content', 'view_content', 'view_analytics'],
  staff: ['view_content'],
  viewer: ['view_content'],
}

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  staff: 2,
  viewer: 1,
}

export function usePermission() {
  const currentRole = useTenantStore((s) => s.currentRole)
  const currentProfile = usePermissionsStore((s) => s.currentProfile)

  // Profile-based permission check (feature × action matrix)
  const can = useCallback(
    (featureId: string, action: PermissionAction): boolean => {
      if (!currentProfile) return true // no permissions configured = allow all
      // Owner bypasses all feature checks
      if (currentProfile.id === 'owner') return true
      return currentProfile.grants[featureId]?.includes(action) ?? false
    },
    [currentProfile],
  )

  const hasSystemPermission = useCallback(
    (perm: SystemPermission): boolean => {
      if (!currentProfile) return true
      return (currentProfile.systemPermissions ?? []).includes(perm)
    },
    [currentProfile],
  )

  // Legacy role-based permissions
  const permissions = useMemo<Permission[]>(() => {
    if (!currentRole) return []
    return ROLE_PERMISSIONS[currentRole]
  }, [currentRole])

  const hasPermission = useCallback(
    (permission: Permission | string): boolean => {
      // First try profile-based system permissions
      if (currentProfile) {
        return (currentProfile.systemPermissions ?? []).includes(permission as SystemPermission)
      }
      // Fall back to legacy role-based
      return permissions.includes(permission as Permission)
    },
    [currentProfile, permissions],
  )

  const requireRole = useCallback(
    (role: MemberRole): boolean => {
      if (!currentRole) return false
      return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[role]
    },
    [currentRole],
  )

  const canAccess = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      return requiredPermissions.every((p) => permissions.includes(p))
    },
    [permissions],
  )

  return {
    currentRole,
    currentProfile,
    permissions,
    can,
    hasSystemPermission,
    hasPermission,
    requireRole,
    canAccess,
  }
}
