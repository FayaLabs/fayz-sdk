import type React from 'react'
import type { EntityDef } from './crud'
import type { FeatureDeclaration, PermissionAction } from './permissions'
import type { LimitDeclaration } from './entitlements'
import type { ConnectorDefinition } from '../integrations'

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
  /**
   * When this entry gains sub-path children, the shell also synthesizes a child
   * pointing back at the parent's own route (so /courses stays reachable under
   * the "Courses" group). Set false when the parent route is a duplicate of its
   * first child — e.g. /shop and /shop/products render the same catalog, and
   * listing both reads as a bug. Defaults to true.
   */
  indexChild?: boolean
}

export interface PluginSettingsTab {
  id: string
  label: string
  icon?: string
  /** Provide the component directly, or reference a registered component by id
   *  (resolvePluginComponent resolves componentId → the component registry).
   *  Exactly one is required. */
  component?: React.ComponentType<unknown>
  componentId?: string
  pluginId?: string
  order?: number
  permission?: PluginPermissionRequirement
}

export interface PluginRouteDefinition {
  path: string
  /** Component or a registered component id — exactly one is required. */
  component?: React.ComponentType<unknown>
  componentId?: string
  guard?: 'authenticated' | 'role' | 'public' | 'share-token'
  roles?: string[]
  permission?: PluginPermissionRequirement
  /** Render edge-to-edge with no page padding/animation wrapper (chat, kanban, canvas). */
  fullBleed?: boolean
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
  /** Component or a registered component id — exactly one is required. */
  component?: React.ComponentType<unknown>
  componentId?: string
  title?: string
  order?: number
  permission?: PluginPermissionRequirement
  visibility?: PluginWidgetVisibility
  props?: TConfig
}

// ---------------------------------------------------------------------------
// Dashboard widgets — first-class units a plugin contributes to the dashboard
// registry. Rendered both on the plugin's own home and on the global app home.
// ---------------------------------------------------------------------------

export type DashboardWidgetKind = 'kpi' | 'chart' | 'table' | 'onboarding' | 'custom'

/** Surfaces a widget can appear on. 'home' = global app home (the universal
 *  business dashboard every app renders via createDashboardPlugin);
 *  'plugin-home' = the owning plugin's own overview page; 'finance-home' = a
 *  dedicated B2C consumer-finance home (norman-ai's phone-first money screen),
 *  kept separate so its full-bleed hero/cards never leak onto the B2B 'home'. */
export type DashboardSurface = 'home' | 'plugin-home' | 'finance-home'

export interface DashboardWidgetDef<TProps extends Record<string, unknown> = Record<string, unknown>> {
  /** Globally unique id, e.g. 'crm.kpi.total-leads'. */
  id: string
  /** i18n key or plain label. */
  title: string
  description?: string
  icon?: string
  /** Owning domain used to scope plugin-home vs global home. Defaults to plugin.id. */
  domain?: string
  kind: DashboardWidgetKind
  /** Column span on the 4-col grid. Defaults by kind (kpi→1, chart→2, table→4). */
  span?: 1 | 2 | 3 | 4
  /** Visible before any app/user customization. Default: true. */
  defaultVisible?: boolean
  /** Default order within the surface (lower = first). */
  defaultOrder?: number
  /** Surfaces this widget appears on. Default: both. */
  surfaces?: DashboardSurface[]
  verticalId?: VerticalId
  permission?: PluginPermissionRequirement
  /** Component or a registered component id — exactly one is required. */
  component?: React.ComponentType<unknown>
  componentId?: string
  props?: TProps
}

/** App- or user-level overrides applied on top of the registered defaults. */
export interface DashboardLayoutConfig {
  widgets?: Array<{ id: string; visible?: boolean; order?: number; span?: number }>
}

export interface ResolvedDashboardWidget extends DashboardWidgetDef {
  /** Resolved owning domain (plugin.id when not explicitly set). */
  domain: string
  order: number
  plugin: ResolvedPluginManifest
}

/** An event a plugin emits onto the event bus — declared for platform
 *  introspection and so the AppManifest can bind event→action as data. */
export interface PluginEventDefinition {
  /** Namespaced event name, e.g. 'agenda.booking.confirmed'. */
  name: string
  description?: string
  /** JSON Schema for the payload (editor / AI / validation). */
  payloadSchema?: Record<string, unknown>
}

export interface PluginCapability {
  id: string
  label: string
  description?: string
  kind?: 'page' | 'widget' | 'data' | 'integration'
}

export interface PluginQuickAction {
  id: string
  label: string
  icon?: string
  description?: string
  /** Action handler — typically navigates to a view. */
  action: () => void
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

export type AIToolExecution =
  | { plane: 'server'; kind: 'rpc'; rpc: string }
  | { plane: 'server'; kind: 'entity_read'; entity: string }
  | { plane: 'client' }

/**
 * A tenant-scoped pool RPC (`agent_<domain>_<verb>`) this plugin ships for the
 * server-plane agent executor. Surfaces in the manifest as
 * `agent.rpcs` (RpcContract) — the broker only ever calls declared functions.
 */
export interface AgentRpcDeclaration {
  /** Function name in the pool, e.g. 'agent_agenda_create_appointment'. */
  name: string
  kind: 'read' | 'write'
  description: string
  /** JSON Schema of the p_payload argument. */
  payloadSchema?: AIToolParameters
  /** Whether the function writes audit_logs itself. */
  audits?: boolean
}

export interface PluginAITool {
  id: string
  name: string
  description: string
  icon?: string
  mode: AIToolMode
  parameters?: AIToolParameters
  permission?: PluginPermissionRequirement
  /**
   * Quantity-limit key this tool's writes consume (e.g. 'bookings_month' for a
   * booking-creating tool). Persist-mode tools that create countable rows MUST
   * declare it so the agent executor can run the SAME plan-limit guard the UI
   * runs (guard before execute, invalidate after) — an AI agent never clicks a
   * gated button, so the declarative contract is its only gate.
   */
  limitKey?: string
  /**
   * Where the tool runs. Server-plane is what makes browserless channels
   * (WhatsApp, MCP) able to run the tool at all:
   * - `{ plane:'server', kind:'rpc', rpc }` — the Fayz broker calls the named
   *   `agent_*` RPC in the tenant pool (writes / guarded reads).
   * - `{ plane:'server', kind:'entity_read', entity }` — the broker runs the
   *   generic tenant-scoped read against the entity's table (derived tools).
   * - `{ plane:'client' }` (or absent) — a locally registered executor runs it
   *   in the surface (navigation, modals).
   */
  execution?: AIToolExecution
  /**
   * Require an explicit human confirmation before executing. Defaults to true
   * for `mode: 'persist'` tools — the channel renders it natively (FAB modal,
   * WhatsApp yes/no reply).
   */
  requiresConfirmation?: boolean
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
  /** Component or a registered component id — exactly one is required. */
  component?: React.ComponentType<{ onComplete: () => void }>
  componentId?: string
  title?: string
  description?: string
}

/**
 * A health check a plugin contributes to the diagnostics / boot report surfaced by
 * `fayz doctor`. Declared as data so the platform can verify a plugin's backend
 * prerequisites are present without running it.
 */
export interface PluginDiagnostic {
  id: string
  description?: string
  /** What the runtime should verify exists for this plugin to work. */
  requires: {
    rpcs?: string[]
    views?: string[]
    tables?: string[]
    migrations?: string[]
    env?: string[]
  }
  /** Severity when the requirement is missing. Defaults to 'warn'. */
  level?: 'error' | 'warn' | 'info'
}

export interface PluginManifest {
  id: string
  name: string
  icon: string
  version: string
  /** Plugin contract version. The runtime refuses plugins built for a newer
   *  contract than it supports (see PLUGIN_API_VERSION). Omit = legacy/compatible. */
  apiVersion?: number
  description?: string
  scope?: PluginScope
  verticalId?: VerticalId
  /** Events this plugin emits onto the bus (declared for introspection/automation). */
  events?: PluginEventDefinition[]
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
  /** Dashboard widgets this plugin contributes to the dashboard registry. */
  dashboardWidgets?: DashboardWidgetDef[]
  capabilities?: PluginCapability[]
  aiTools?: PluginAITool[]
  entities?: string[]
  permissions?: string[]
  declaredFeatures?: FeatureDeclaration[]
  /**
   * Quantity limits this plugin knows how to count. Aggregated by the plugin
   * runtime into `PluginRuntime.pluginLimits` and consumed by the access engine
   * (useLimit / useLimitGuard) so a plugin "is born compatible" with freemium
   * caps without any per-app wiring. See {@link LimitDeclaration}.
   */
  declaredLimits?: LimitDeclaration[]
  /** Pool RPCs this plugin ships for the server-plane agent executor. */
  declaredRpcs?: AgentRpcDeclaration[]
  /**
   * Read-models this plugin exposes to the agent's generic data primitives
   * (searchRecords/queryData) BEYOND its CRUD registries — typically its
   * views/ledgers (v_appointments, plg_financial_movements). `key` is a stable
   * ASCII id (never derived from a translated label); the entity's own
   * `permission` gates each call.
   */
  queryEntities?: Array<{ key: string; entity: EntityDef }>
  registries?: PluginRegistryDef[]
  /**
   * Connectors this plugin contributes. An ADDON plugin declares its connector(s)
   * here, each naming the `hostPluginId` it extends; the runtime groups them by
   * host and the host plugin's settings render them in a unified Integrations tab.
   */
  connectors?: ConnectorDefinition[]
  migrations?: PluginMigration[]
  /** Backend prerequisites the plugin needs; surfaced by `fayz doctor`. */
  diagnostics?: PluginDiagnostic[]
  onboarding?: PluginOnboarding
  locales?: Record<string, Record<string, string>>
}

export interface TenantPluginBinding {
  pluginId: string
  status: PluginStatus
  tenantId?: string
  config?: Record<string, unknown>
}

export interface PluginRuntimeIssue {
  type:
    | 'duplicate_plugin'
    | 'missing_dependency'
    | 'circular_dependency'
    | 'vertical_mismatch'
    | 'incompatible_api_version'
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
  dashboardWidgets: ResolvedDashboardWidget[]
  capabilities: PluginCapability[]
  aiTools: PluginAITool[]
  issues: PluginRuntimeIssue[]
  registries: Map<string, PluginRegistryDef[]>
  /** Connectors contributed by active plugins, grouped by the host plugin they extend. */
  connectorsByHost: Map<string, ConnectorDefinition[]>
  pluginFeatures: FeatureDeclaration[]
  /** Limit declarations aggregated from every active plugin's `declaredLimits`. */
  pluginLimits: LimitDeclaration[]
}
