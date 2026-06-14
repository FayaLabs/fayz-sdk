export type PermissionAction = 'read' | 'create' | 'edit' | 'write' | 'delete' | 'manage' | (string & {})

export type SystemPermission =
  | 'manage_team'
  | 'manage_billing'
  | 'manage_settings'
  | 'manage_permissions'

export interface FeatureDeclaration {
  id: string
  label: string
  description?: string
  /** Settings group this feature appears under (matches saas-core runtime) */
  group?: string
  actions?: PermissionAction[]
  pluginId?: string
}

export interface PermissionProfile {
  id: string
  name: string
  description?: string
  isSystem?: boolean
  systemPermissions?: SystemPermission[]
  /** feature key → allowed actions. The canonical permission map (saas-core shell name). */
  grants: Record<string, PermissionAction[]>
}

export interface PermissionsConfig {
  features: FeatureDeclaration[]
  defaultProfiles?: PermissionProfile[]
}
