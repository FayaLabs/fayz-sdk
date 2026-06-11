// Types
export type { EntityArchetype, BaseEntity, PersonEntity, ProductEntity, ServiceEntity, OrderEntity, TransactionEntity, LocationEntity, ScheduleEntity, CategoryEntity } from './types/entities'
export type { EntityDef, FieldDef, FieldType, FieldGroup, DetailTab, FormLayout } from './types/crud'
export type { PluginManifest, PluginScope, PluginStatus, ResolvedPluginManifest, PluginRuntime, PluginRuntimeContext, PluginWidgetZone, PluginWidgetDefinition, PluginNavigationEntry, PluginSettingsTab, PluginRouteDefinition, PluginAITool, PluginRegistryDef, PluginMigration, VerticalId, ScaffoldType, TenantPluginBinding } from './types/plugins'
export { WidgetZone } from './types/plugins'
export type { AuthAdapter, AuthUser, AuthSession, AuthProvider } from './types/auth'
export type { OrgAdapter, Organization, OrgMember, OrgMembership, Location, Invite, CreateOrgOptions } from './types/org'
export type { PermissionsConfig, FeatureDeclaration, PermissionAction, PermissionProfile } from './types/permissions'
export type { Plan, BillingConfig } from './types/billing'
export type { SaasTheme, ThemeConfig, ThemeBrand, ThemeRadius, ThemeMode } from './types/theme'
export type { LocaleConfig } from './types/i18n'

// Data providers
export { createSupabaseProvider, setGlobalSupabaseClient, getSupabaseClientOptional } from './data/supabase'
export { createMockProvider } from './data/mock'
export type { DataProvider, CrudQuery, CrudResult, SupabaseProviderConfig } from './data/index'

// Plugin system
export { definePlugin, resolvePluginRuntime, getWidgetsForZone, PluginRuntimeProvider, usePluginRuntime, usePluginRuntimeOptional } from './plugin/runtime'

// Entity registry
export { registerEntity, getEntityByKey, getAllEntities, clearEntityRegistry, deriveEntityKey } from './entity/registry'
export type { RegisteredEntity } from './entity/registry'

// Uniform registry (component / block / page / metric / scaffold / plugin)
export {
  Registry,
  isCustomId,
  componentRegistry,
  blockRegistry,
  pageRegistry,
  scaffoldRegistry,
  metricRegistry,
  pluginRegistry,
  registerComponent,
  getComponent,
  registerBlock,
  getBlock,
  listBlocks,
  registerPage,
  getPage,
  registerScaffold,
  getScaffold,
  registerMetric,
  getMetric,
  listMetrics,
  registerPlugin,
  getPlugin,
  listPlugins,
} from './registry'
export type {
  JsonSchema,
  RegistrySource,
  RegistryMeta,
  RegistryEntry,
  MetricFormat,
  MetricContext,
  MetricValue,
  MetricDefinition,
} from './registry'

// Block system (universal page primitive)
export { BlockRenderer, renderBlocks, BlockChildren } from './blocks'
export type { BlockNode, BlockComponentProps } from './blocks'

// App manifest (the app, as data) + migration runner
export {
  CURRENT_MANIFEST_VERSION,
  registerManifestMigration,
  migrateManifest,
  validateManifest,
} from './manifest'
export type {
  AppManifest,
  BackendRef,
  SurfaceManifest,
  PageManifest,
  PluginRef,
  ManifestMigration,
} from './manifest'
export { default as appManifestSchema } from './manifest/app-manifest.schema.json'

// App entry points (manifest → running app)
export { defineApp, renderApp, useManifest } from './app/render'
export type { RenderAppOptions } from './app/render'

// i18n
export { I18nProvider, useI18nConfig, useTranslation, coreTranslations, mergeTranslations, getCurrentLocale, setCurrentLocale, setLocaleStore } from './i18n/index'

// Router
export { hashRouterAdapter, windowRouterAdapter } from './router/index'
export type { RouterAdapter } from './router/index'
