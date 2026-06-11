export type PermissionAction = 'read' | 'write' | 'delete' | 'manage' | (string & {})

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
  isSystem?: boolean
  features: Record<string, PermissionAction[]>
}

export interface PermissionsConfig {
  features: FeatureDeclaration[]
  defaultProfiles?: PermissionProfile[]
}
