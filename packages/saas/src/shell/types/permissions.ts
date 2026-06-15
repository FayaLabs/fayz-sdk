export type PermissionAction = 'read' | 'create' | 'edit' | 'delete' | 'write' | 'manage' | (string & {})

export type SystemPermission =
  | 'manage_team'
  | 'manage_billing'
  | 'manage_settings'
  | 'manage_permissions'

export type PermissionCategory =
  | 'tenant'
  | 'team'
  | 'locations'
  | 'billing'
  | 'plugins'
  | 'settings'
  | 'audit'
  | 'api'
  | 'integrations'
  | 'webhooks'
  | 'general'

// --- RBAC types (map to Supabase tables) ---

export interface PermissionEntry {
  id: string
  description?: string
  category: PermissionCategory
  pluginId?: string
  createdAt: string
}

export interface RolePermission {
  role: string
  permissionId: string
}

export interface TenantRoleOverride {
  id: string
  tenantId: string
  role: string
  permissionId: string
  granted: boolean
  createdAt: string
}

export interface FeatureFlag {
  id: string
  name: string
  description?: string
  defaultEnabled: boolean
  minPlanTier?: number
  createdAt: string
}

export interface TenantFeatureOverride {
  id: string
  tenantId: string
  featureId: string
  enabled: boolean
  createdAt: string
}

// --- Unified with @fayz-ai/core: single type identity across shell + native ---
export type { FeatureDeclaration, PermissionProfile, PermissionsConfig } from '@fayz-ai/core'
