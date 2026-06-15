import type { MemberRole } from '../types/tenant'

export type Permission =
  | 'manage_team'
  | 'manage_billing'
  | 'manage_settings'
  | 'view_analytics'
  | 'manage_content'
  | 'view_content'

export const ROLES: MemberRole[] = ['owner', 'admin', 'manager', 'staff', 'viewer']

export const PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: ['manage_team', 'manage_billing', 'manage_settings', 'view_analytics', 'manage_content', 'view_content'],
  admin: ['manage_team', 'manage_billing', 'manage_settings', 'view_analytics', 'manage_content', 'view_content'],
  manager: ['view_analytics', 'manage_content', 'view_content'],
  staff: ['manage_content', 'view_content'],
  viewer: ['view_content'],
}

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  const allowed = PERMISSIONS[role]
  return allowed ? allowed.includes(permission) : false
}

export function requireRole(currentRole: MemberRole, minimumRole: MemberRole): boolean {
  const currentIndex = ROLES.indexOf(currentRole)
  const minimumIndex = ROLES.indexOf(minimumRole)
  if (currentIndex === -1 || minimumIndex === -1) return false
  return currentIndex <= minimumIndex
}
