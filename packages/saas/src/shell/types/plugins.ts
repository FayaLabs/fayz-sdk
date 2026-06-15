import type React from 'react'
import type { LayoutVariant } from './layout'
import type { PermissionAction, FeatureDeclaration } from './permissions'

// --- Database-facing types (map to Supabase tables) ---

export type VerticalId = 'beauty' | 'food' | 'health' | 'services' | 'retail' | 'education' | (string & {})

export interface Vertical {
  id: VerticalId
  name: string
  description?: string
  icon?: string
  defaultPlugins: string[]
  createdAt: string
}

export type PluginScope = 'core' | 'vertical' | 'universal' | 'addon' | 'tenant'
export type PluginStatus = 'pending_setup' | 'active' | 'disabled' | 'removed'

export interface PluginRegistryEntry {
  id: string
  name: string
  description?: string
  descriptionNl?: string
  icon?: string
  version: string
  scope: PluginScope
  verticalId?: VerticalId
  tenantId?: string
  minPlan: string
  isDefault: boolean
  manifest: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface TenantPlugin {
  id: string
  tenantId: string
  pluginId: string
  status: PluginStatus
  config: Record<string, unknown>
  enabledBy?: string
  enabledAt?: string
  disabledAt?: string
  createdAt: string
  updatedAt: string
}

export interface PluginDependency {
  id: string
  pluginId: string
  dependsOn: string
  isOptional: boolean
}

// --- Runtime types (used by the plugin loader) ---

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
  component: React.ComponentType<any>
  pluginId?: string
  order?: number
  permission?: PluginPermissionRequirement
}

export interface LegacyPluginSettingsTab {
  tab: string
  component: React.ComponentType<any>
}

export interface PluginRouteDefinition {
  path: string
  component: React.ComponentType<any>
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

export interface PluginRuntimeContext {
  tenant: PluginRuntimeTenant | null
  user: PluginRuntimeUser | null
  currentPath: string
  matchedPath?: string
  layout: LayoutVariant
  hasPermission?: (requirement: PluginPermissionRequirement) => boolean
}

export interface PluginWidgetVisibility {
  routes?: string[]
  excludeRoutes?: string[]
  layouts?: LayoutVariant[]
  roles?: string[]
  plans?: string[]
  permissions?: PluginPermissionRequirement[]
  when?: (context: PluginRuntimeContext) => boolean
}

export interface PluginCapability {
  id: string
  label: string
  description?: string
  kind?: 'page' | 'widget' | 'data' | 'integration'
}

export interface PluginWidgetComponentProps<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  config: TConfig
  runtime: PluginRuntimeContext
  plugin: ResolvedPluginManifest
  widget: ResolvedPluginWidget<TConfig>
}

export interface PluginWidgetDefinition<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  zone: PluginWidgetZone
  component: React.ComponentType<any>
  title?: string
  order?: number
  permission?: PluginPermissionRequirement
  visibility?: PluginWidgetVisibility
  props?: TConfig
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

// --- AI tool system ---

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
  /** Human-friendly prompt shown as a chip, e.g. "How many customers today?" */
  label: string
  /** Actual message sent to the LLM when clicked (defaults to label) */
  prompt?: string
  /** Lucide icon name override */
  icon?: string
  /** Only show this suggestion for a specific vertical */
  verticalId?: VerticalId
}

export interface PluginAITool {
  /** Unique tool ID, namespaced by plugin: e.g. 'financial.daily-revenue' */
  id: string
  /** Function-style name shown as tool signature: e.g. 'getRevenue' */
  name: string
  /** Description for the LLM — tells it when/how to use this tool */
  description: string
  /** Lucide icon name */
  icon?: string
  /** Read-only query or state-mutating action */
  mode: AIToolMode
  /** JSON Schema for parameters — maps 1:1 to Claude tool_use input_schema */
  parameters?: AIToolParameters
  /** Permission required to see/use this tool */
  permission?: PluginPermissionRequirement
  /** User-facing suggestion chips for the empty chat state */
  suggestions?: AIToolSuggestion[]
  /** Category for grouping in the UI: e.g. 'Finance', 'Sales' */
  category?: string
  /** Tags for filtering/search */
  tags?: string[]
}

// --- Plugin registry system ---

export interface PluginRegistryDef {
  /** Unique ID within the plugin, e.g. 'payment-methods' */
  id: string
  /** EntityDef for the CRUD page */
  entity: import('./crud').EntityDef
  /** Lucide icon name */
  icon?: string
  /** Short description */
  description?: string
  /** How to render the list view */
  display?: 'table' | 'cards' | 'tree'
  /** Initial records to seed on first setup */
  seedData?: Record<string, unknown>[]
  /** Demo data for mock provider */
  mockData?: Record<string, unknown>[]
  /** If true, records cannot be created, edited, or deleted (seed-only / system data) */
  readOnly?: boolean
}

export interface PluginMigration {
  /** Unique ID, e.g. 'financial-001-base-tables' */
  id: string
  /** Semver for ordering migrations */
  version: string
  /** Raw SQL migration */
  sql: string
  /** Description of what this migration does */
  description?: string
}

export interface PluginQuickAction {
  id: string
  label: string
  icon?: string
  description?: string
  /** Action handler — typically navigates to a view */
  action: () => void
}

export interface PluginOnboarding {
  /** Wizard component — receives onComplete callback */
  component: React.ComponentType<{ onComplete: () => void }>
  /** Wizard title */
  title?: string
  /** Wizard description */
  description?: string
}

export interface PluginManifest {
  id: string
  name: string
  icon: string
  version: string
  scope?: PluginScope
  verticalId?: VerticalId
  tenantId?: string
  defaultEnabled?: boolean
  descriptionNl?: string
  schema?: string
  dependencies?: string[]
  navigation: PluginNavigationEntry[]
  settings?: Array<PluginSettingsTab | LegacyPluginSettingsTab>
  routes: PluginRouteDefinition[]
  widgets?: PluginWidgetDefinition[]
  floatingUI?: {
    component: React.ComponentType
    position: 'bottom-right' | 'bottom-left'
  }[]
  capabilities?: PluginCapability[]
  /** AI tools this plugin exposes to the chat assistant */
  aiTools?: PluginAITool[]
  entities?: string[]
  permissions?: string[]
  /** Permission features this plugin introduces to the permission matrix */
  declaredFeatures?: FeatureDeclaration[]
  /** Registry entities the plugin brings (CRUD pages managed within the plugin) */
  registries?: PluginRegistryDef[]
  /** SQL migrations to create the plugin's tables */
  migrations?: PluginMigration[]
  /** First-time setup wizard */
  onboarding?: PluginOnboarding
  /** i18n translations keyed by locale code (e.g. { en: { 'agenda.title': 'Agenda' }, 'pt-BR': { ... } }) */
  locales?: Record<string, Record<string, string>>
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
  /** AI tools from active plugins for the chat assistant */
  aiTools: PluginAITool[]
  issues: PluginRuntimeIssue[]
  /** All registries from active plugins, keyed by pluginId */
  registries: Map<string, PluginRegistryDef[]>
  /** Permission features declared by active plugins */
  pluginFeatures: FeatureDeclaration[]
}
