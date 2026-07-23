// Types
export type { EntityArchetype, BaseEntity, PersonEntity, ProductEntity, ServiceEntity, OrderEntity, TransactionEntity, LocationEntity, ScheduleEntity, CategoryEntity } from './types/entities'
export type { EntityDef, EntityImageConfig, FieldDef, FieldType, FieldRelation, FieldGroup, DetailTab, FormLayout, ComputedFieldValue } from './types/crud'
export type { PluginManifest, PluginScope, PluginStatus, ResolvedPluginManifest, PluginRuntime, PluginRuntimeContext, PluginWidgetZone, PluginWidgetDefinition, PluginNavigationEntry, PluginSettingsTab, PluginRouteDefinition, PluginAITool, AIToolMode, AIToolExecution, AgentRpcDeclaration, AIToolParameterProperty, AIToolParameters, AIToolSuggestion, PluginRegistryDef, PluginMigration, PluginDiagnostic, VerticalId, ScaffoldType, TenantPluginBinding, DashboardWidgetDef, DashboardWidgetKind, DashboardSurface, DashboardLayoutConfig, ResolvedDashboardWidget } from './types/plugins'
export { WidgetZone } from './types/plugins'
export type { AuthAdapter, AuthUser, AuthSession, AuthProvider } from './types/auth'
export type { OrgAdapter, Organization, OrgMember, OrgMembership, TeamPerson, Location, Invite, CreateOrgOptions } from './types/org'
export type { PermissionsConfig, FeatureDeclaration, PermissionAction, PermissionProfile, SystemPermission } from './types/permissions'
export type { Plan, BillingConfig, BillingCheckoutFn } from './types/billing'
export type { PlanEntitlements, LimitDeclaration } from './types/entitlements'
export type { ThemeBrand, ThemeRadius, ThemeMode } from './types/theme'
export type { LocaleConfig } from './types/i18n'

// Data providers
export { createSupabaseProvider, setGlobalSupabaseClient, getSupabaseClientOptional } from './data/supabase'
export { countByTenant, invalidateCount } from './data/count'
export type { CountByTenantOptions } from './data/count'
export { getFayzCloudClient, FAYZ_CLOUD_URL, FAYZ_CLOUD_PUBLISHABLE_KEY } from './data/cloud'
export { createFayzApiProvider } from './data/platform-api'
export { createMockProvider } from './data/mock'
export { createArchetypeProvider } from './data/archetype'
export { withCache } from './data/cached'
export { resolveDataProvider } from './data/resolve'
export {
  DATA_CHANGED_EVENT,
  emitDataChanged,
  matchesDataChange,
  useDataChanged,
} from './data/refresh'
export type { DataChangedPayload, DataChangedMatch } from './data/refresh'
export { createSafeDataProvider } from './plugin/createSafeDataProvider'
export {
  COUNTRIES, DEFAULT_COUNTRY, getCountry, unmaskPhone, maskPhone, maskDigitCount,
} from './phone'
export type { CountryDef } from './phone'
export {
  normalizePostalCode, formatPostalCode, isValidPostalCode,
  createViaCepProvider, setPostalLookupProvider, getPostalLookupProvider,
  lookupPostalCode, clearPostalCache,
} from './address'
export type { PostalAddress, PostalLookupProvider } from './address'
export type {
  PaymentProvider, PaymentMethod, ChargeStatus, CreateChargeInput, PixCharge,
} from './types/payment'
export {
  useSeo, applySeo, absoluteUrl, seoOrigin, breadcrumbJsonLd, organizationJsonLd,
} from './seo'
export type { SeoConfig, BreadcrumbItem } from './seo'
export type { DataProvider, CrudQuery, CrudResult, SupabaseProviderConfig, FayzApiProviderConfig } from './data/index'

// Tenant context (runtime DI for the data layer)
export { setActiveTenantId, getActiveTenantId } from './tenant'

// Runtime broker helpers
export { createFayzRuntimeClient, FayzRuntimeError } from './runtime'
export type {
  FayzRuntimeClientOptions,
  FayzRuntimeEnvironment,
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  GoogleCalendarEventTime,
  ListGoogleCalendarEventsInput,
  PluginOAuthExchangeInput,
  PluginOAuthExchangeResponse,
  RuntimePluginOAuthGrant,
} from './runtime'

// Plugin contract assertions (integrity half of the deploy gate)
export { assertPluginManifestContract, assertConnectorContract, PluginContractError } from './testing'

// Integration connector spine (shared contract for external-provider sync)
export { withAfterHooks } from './integrations'
export type {
  Connector,
  ConnectorCapability,
  ConnectionConfig,
  SyncRun,
  SyncDirection,
  SyncTrigger,
  IntegrationAuthKind,
  TestConnectionResult,
  ConnectorDefinition,
  ConnectorField,
  ConnectorStatus,
} from './integrations'

// Shared utilities
export { formatCurrency, formatDate, formatDateTime, getActiveLocale, getDefaultCurrency, setDefaultCurrency } from './lib/format'
export { exportCSV, buildCSV, downloadCSV } from './lib/csv'
export type { CSVColumn } from './lib/csv'
export { globalCache, createCacheStore, stableKey, clearGlobalCache } from './lib/cache'
export type { CacheStore } from './lib/cache'

// Plugin system
export { definePlugin, resolvePluginRuntime, getWidgetsForZone, getDashboardWidgets, PluginRuntimeProvider, usePluginRuntime, usePluginRuntimeOptional, useConnectorsForPlugin, PLUGIN_API_VERSION, resolvePluginComponent } from './plugin/runtime'
export type { PluginEventDefinition, PluginQuickAction } from './types/plugins'

// Event bus
export { createEventBus, eventBus, useOnEvent } from './events'
export type { EventBus, EventHandler } from './events'

// Entity registry
export { registerEntity, getEntityByKey, getAllEntities, clearEntityRegistry, deriveEntityKey } from './entity/registry'
export type { RegisteredEntity } from './entity/registry'

// Global search (command palette + agent lookups share one engine)
export {
  searchEverything, clearSearchCache, setSearchIndexAvailable, isSearchIndexAvailable,
  MIN_QUERY_LENGTH, foldText, foldWithMap, digitsOf, normalizeQuery, similarity,
  scoreCandidate, highlightRanges,
} from './search'
export type {
  SearchTarget, SearchHit, SearchGroup, SearchPath, SearchOptions, GlobalSearchResult,
  NormalizedQuery, RankCandidate,
} from './search'

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
  pluginFactoryRegistry,
  registerPluginFactory,
  getPluginFactory,
  listPluginFactories,
} from './registry'
export type { PluginFactory } from './registry'
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
  BackendProvider,
  BackendRef,
  SurfaceManifest,
  PageManifest,
  PluginRef,
  ManifestMigration,
  AgentContract,
  AgentDomainKnowledge,
  EntityContract,
  AIToolContract,
  RpcContract,
} from './manifest'
export { serializeManifest, computeContractHash, serializeManifestWithHash } from './manifest/serialize'
export { default as appManifestSchema } from './manifest/app-manifest.schema.json'

// App entry points (manifest → running app)
export { defineApp, renderApp, useManifest } from './app/render'
export type { RenderAppOptions } from './app/render'

// i18n
export { I18nProvider, useI18nConfig, useTranslation, coreTranslations, mergeTranslations, registerTranslations, getCurrentLocale, setCurrentLocale, setLocaleStore } from './i18n/index'

// Router
export { hashRouterAdapter, windowRouterAdapter } from './router/index'
export type { RouterAdapter } from './router/index'

// Global cross-module navigation history (context-aware back buttons)
export {
  useNavHistoryStore,
  recordNavigation,
  useNavReferrer,
  navHistoryBack,
  routeModule,
} from './router/history'
export type { NavHistoryEntry } from './router/history'
