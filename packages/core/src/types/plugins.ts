import type React from 'react'
import type { EntityDef } from './crud'
import type { FeatureDeclaration, PermissionAction } from './permissions'

export type VerticalId = 'beauty' | 'food' | 'health' | 'services' | 'retail' | 'education' | (string & {})
export type PluginScope = 'core' | 'vertical' | 'universal' | 'addon' | 'tenant'
export type PluginStatus = 'pending_setup' | 'active' | 'disabled' | 'removed'

/**
 * Scaffold type this plugin targets.
 * Plugins can declare which scaffolds they work with.
 * If omitted, the plugin works with all scaffold types.
 */
export type ScaffoldType = 'saas' | 'ecommerce' | 'landing_page' | 'website' | (string & {})

export interface PluginPermissionRequirement {
  feature: string
  action: PermissionAction
}

export interface PluginNavigationEntry {
  id?: string
  section: 'main' | 'secondary' | 'settings'
  position: number
  label: string
  route: string
  icon?: string
  badge?: string | number
  permission?: PluginPermissionRequirement
}

export interface PluginSettingsTab {
  id: string
  label: string
  icon?: string
  component: React.ComponentType<unknown>
  pluginId?: string
  order?: number
  permission?: PluginPermissionRequirement
}

export interface PluginRouteDefinition {
  path: string
  component: React.ComponentType<unknown>
  guard?: 'authenticated' | 'role'
  roles?: string[]
  permission?: PluginPermissionRequirement
}

export type PluginWidgetZone =
  | 'shell.sidebar.before-nav'
  | 'shell.sidebar.footer'
  | 'shell.topbar.start'
  | 'shell.topbar.end'
  | 'page.before'
  | 'page.after'
  | 'settings.before'
  | 'settings.after'
  | 'shell.floating'
  | (string & {})

export const WidgetZone = {
  SIDEBAR_BEFORE_NAV: 'shell.sidebar.before-nav',
  SIDEBAR_FOOTER: 'shell.sidebar.footer',
  TOPBAR_START: 'shell.topbar.start',
  TOPBAR_END: 'shell.topbar.end',
  PAGE_BEFORE: 'page.before',
  PAGE_AFTER: 'page.after',
  SETTINGS_BEFORE: 'settings.before',
  SETTINGS_AFTER: 'settings.after',
  FLOATING: 'shell.floating',
} as const

export interface PluginRuntimeTenant {
  id?: string
  slug?: string
  verticalId?: string
  plan?: string
}

export interface PluginRuntimeUser {
  id?: string
  role?: string
}

export interface PluginWidgetVisibility {
  routes?: string[]
  excludeRoutes?: string[]
  layouts?: string[]
  roles?: string[]
  plans?: string[]
  permissions?: PluginPermissionRequirement[]
  when?: (context: PluginRuntimeContext) => boolean
}

export interface PluginRuntimeContext {
  tenant: PluginRuntimeTenant | null
  user: PluginRuntimeUser | null
  currentPath: string
  matchedPath?: string
  layout: string
  hasPermission?: (req: PluginPermissionRequirement) => boolean
}

export interface PluginWidgetDefinition<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  zone: PluginWidgetZone
  component: React.ComponentType<unknown>
  title?: string
  order?: number
  permission?: PluginPermissionRequirement
  visibility?: PluginWidgetVisibility
  props?: TConfig
}

export interface PluginCapability {
  id: string
  label: string
  description?: string
  kind?: 'page' | 'widget' | 'data' | 'integration'
}

export type AIToolMode = 'read' | 'persist'

export interface AIToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: string[]
  items?: AIToolParameterProperty
  default?: unknown
}

export interface AIToolParameters {
  type: 'object'
  properties: Record<string, AIToolParameterProperty>
  required?: string[]
}

export interface AIToolSuggestion {
  label: string
  prompt?: string
  icon?: string
  verticalId?: VerticalId
}

export interface PluginAITool {
  id: string
  name: string
  description: string
  icon?: string
  mode: AIToolMode
  parameters?: AIToolParameters
  permission?: PluginPermissionRequirement
  suggestions?: AIToolSuggestion[]
  category?: string
  tags?: string[]
}

export interface PluginRegistryDef {
  id: string
  entity: EntityDef
  icon?: string
  description?: string
  display?: 'table' | 'cards' | 'tree'
  seedData?: Record<string, unknown>[]
  mockData?: Record<string, unknown>[]
  readOnly?: boolean
}

export interface PluginMigration {
  id: string
  version: string
  sql: string
  description?: string
}

export interface PluginOnboarding {
  component: React.ComponentType<{ onComplete: () => void }>
  title?: string
  description?: string
}

export interface PluginManifest {
  id: string
  name: string
  icon: string
  version: string
  description?: string
  scope?: PluginScope
  verticalId?: VerticalId
  /** Which scaffold types this plugin targets. Omit for universal plugins. */
  scaffolds?: ScaffoldType[]
  tenantId?: string
  defaultEnabled?: boolean
  schema?: string
  dependencies?: string[]
  navigation: PluginNavigationEntry[]
  settings?: PluginSettingsTab[]
  routes: PluginRouteDefinition[]
  widgets?: PluginWidgetDefinition[]
  capabilities?: PluginCapability[]
  aiTools?: PluginAITool[]
  entities?: string[]
  permissions?: string[]
  declaredFeatures?: FeatureDeclaration[]
  registries?: PluginRegistryDef[]
  migrations?: PluginMigration[]
  onboarding?: PluginOnboarding
  locales?: Record<string, Record<string, string>>
  /** Marketplace metadata for npm discovery */
  marketplace?: {
    category: string
    tags: string[]
    author: string
    license: string
    repository?: string
  }
}

export interface TenantPluginBinding {
  pluginId: string
  status: PluginStatus
  tenantId?: string
  config?: Record<string, unknown>
}

export interface PluginRuntimeIssue {
  type: 'duplicate_plugin' | 'missing_dependency' | 'circular_dependency' | 'vertical_mismatch'
  pluginId: string
  dependencyId?: string
  message: string
}

export interface ResolvedPluginManifest extends PluginManifest {
  status: PluginStatus
  isActive: boolean
  activationReason: 'default' | 'tenant' | 'dependency' | 'inactive'
  config: Record<string, unknown>
  missingDependencies: string[]
  settingsTabs: PluginSettingsTab[]
  widgets: PluginWidgetDefinition[]
  resolvedRegistries: PluginRegistryDef[]
  resolvedAITools: PluginAITool[]
}

export interface ResolvedPluginWidget<TConfig extends Record<string, unknown> = Record<string, unknown>>
  extends PluginWidgetDefinition<TConfig> {
  order: number
  config: TConfig
  plugin: ResolvedPluginManifest
}

export interface PluginRuntimeRoute extends PluginRouteDefinition {
  plugin: ResolvedPluginManifest
}

export interface PluginRuntime {
  context: PluginRuntimeContext
  plugins: ResolvedPluginManifest[]
  activePlugins: ResolvedPluginManifest[]
  routes: PluginRuntimeRoute[]
  navigation: PluginNavigationEntry[]
  settingsTabs: PluginSettingsTab[]
  widgets: ResolvedPluginWidget[]
  capabilities: PluginCapability[]
  aiTools: PluginAITool[]
  issues: PluginRuntimeIssue[]
  registries: Map<string, PluginRegistryDef[]>
  pluginFeatures: FeatureDeclaration[]
}
