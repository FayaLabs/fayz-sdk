// ---------------------------------------------------------------------------
// App factory (main entry point)
// ---------------------------------------------------------------------------
export { createFayzApp, AdminProviders } from './app/admin-app'
export type { FayzAppConfig, AuthConfig, OrgConfig, ChatConfig, FayzBillingConfig, CustomPage, PageSection } from './app/config'

// Native admin scaffold — manifest-first entry. Importing this registers the
// 'admin' scaffold so renderApp(manifest) can resolve it.
export { defineSaas, AdminScaffold } from './app/scaffold'
export { AdminShell } from './app/AdminShell'
export { LoginPage } from './app/LoginPage'
export { navigateTo as adminNavigateTo, useAdminPath } from './app/routing'

// Auth hook re-exported through the saas front-door so app screens (e.g. a
// Profile page) can read the current user + signOut without depending on
// @fayz-ai/auth directly.
export { useAuth } from '@fayz-ai/auth'

// ---------------------------------------------------------------------------
// CRUD engine — NATIVE code is now in ./crud (de-bridged from saas-core: the
// full list/form/detail engine, archetype layouts, providers and store).
// The native engine + the saas shell share runtime providers (Permissions,
// Org), so the DEFAULT createCrudPage stays bridged until the admin shell
// de-bridges and mounts the native providers — they co-migrate atomically.
// The native pieces are exported here, ready for the native shell.
export {
  CrudPage,
  CrudListView,
  CrudFormPage,
  CrudDetailPage,
  CrudCardGrid,
  DeleteConfirmDialog,
  ImportWizard,
  exportToCSV,
  createCrudPage as createNativeCrudPage,
} from './crud'
export type { ImportRowError, CrudListViewProps, CrudFacet } from './crud'
export { PermissionGate } from './permissions/PermissionGate'
export { WidgetSlot } from './plugins/WidgetSlot'
export { useFieldRules } from './hooks/useFieldRules'

export { createCrudPage } from './crud/createCrudPage'
// Client-orders archetype (used by beauty-saas client detail tab)
export { ClientOrdersTab } from './shell/components/crud/archetypes/ClientOrdersTab'
export { createClientOrdersProvider } from './shell/lib/create-client-orders-provider'

// ---------------------------------------------------------------------------
// Archetype lookup
// ---------------------------------------------------------------------------
export { createArchetypeLookup } from './archetype-lookup'
export type { EntityLookup, EntityLookupResult, EntityLookupMap, ArchetypeType } from './archetype-lookup'

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
export {
  createFayzSupabaseClient,
  getFayzSupabaseClient,
  getFayzSupabaseClientOptional,
} from './supabase/client'

// ---------------------------------------------------------------------------
// Org / multi-tenancy
// ---------------------------------------------------------------------------
export {
  // Adapters
  createSupabaseOrgAdapter,
  createMockOrgAdapter,
  // Store
  useOrganizationStore,
  getPersistedOrgId,
  // Context & hooks
  OrgProvider,
  useTenant,
  useTenantOptional,
  useOrgAdapter,
  useOrgAdapterOptional,
} from './org/index'
export type {
  SupabaseOrgAdapterConfig,
  OrgStore,
  OrgProviderProps,
  TenantContext,
} from './org/index'

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
export {
  usePermissionsStore,
  PermissionsProvider,
  usePermission,
  useHasPermission,
  usePermissions,
} from './permissions/index'
export type { PermissionsStore, PermissionsProviderProps } from './permissions/index'

// ---------------------------------------------------------------------------
// Access engine — role × plan decision, quantity limits, upgrade modal store
// ---------------------------------------------------------------------------
export {
  AccessProvider,
  useAccess,
  useAccessOptional,
  useLimit,
  useLimitGuard,
  resolveAccess,
  isEntitledByPlan,
  invalidateLimit,
  useUpgradeModalStore,
} from './access/index'
export type {
  AccessProviderProps,
  AccessApi,
  AccessDecision,
  AccessSession,
  DenyReason,
  LimitState,
  UpgradeModalPayload,
  UpgradeModalStore,
} from './access/index'

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
export { useBillingStore } from './billing/index'
export { EntitlementGate, LimitGate } from './shell/components/billing/gates'
export type { BillingStore, BillingState, Subscription, Invoice } from './billing/index'

// ---------------------------------------------------------------------------
// Re-export commonly needed @fayz-ai/core types so consumers can import
// everything from a single package when building on top of @fayz-ai/saas
// ---------------------------------------------------------------------------
export type {
  // Org
  Organization,
  OrgMember,
  OrgMembership,
  OrgAdapter,
  Location,
  Invite,
  CreateOrgOptions,
  // Auth
  AuthAdapter,
  AuthUser,
  AuthSession,
  // Permissions
  PermissionsConfig,
  FeatureDeclaration,
  PermissionAction,
  PermissionProfile,
  // Plugins
  PluginManifest,
  PluginRuntime,
  // Theme
  ThemeMode,
  ThemeBrand,
  ThemeRadius,
  // i18n
  LocaleConfig,
  // Billing
  BillingConfig,
  Plan,
  // Entities / connectors
  EntityDef,
  ConnectorDefinition,
} from '@fayz-ai/core'

// Commonly needed @fayz-ai/core *runtime* helpers, re-exported so apps built on
// top of @fayz-ai/saas can import them from the single front-door package.
export {
  renderApp,
  getSupabaseClientOptional,
  getActiveTenantId,
  setCurrentLocale,
} from '@fayz-ai/core'

// Base SDK client + table-query contracts, surfaced through the saas front door.
export { fayz } from '@fayz-ai/sdk'
export type { FayzTableFilter } from '@fayz-ai/sdk'

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
export { createPlaceholder } from './placeholder'

// Plugin framework UI (used by plugins + the shell)
export { SettingsGroup, ToggleRow, SelectRow } from './plugins/SettingsGroup'
export { QuickActionsButton } from './plugins/QuickActionsButton'
export { ModuleActionBar } from './plugins/ModuleActionBar'
export { createPluginContext, type PluginContextApi } from './plugins/createPluginContext'
export { createViewRouter, parseViewId, type ViewRoute } from './plugins/createViewRouter'
export { formatCurrency, type CurrencyConfig } from './lib/currency'
export { PluginRegistryManager } from './plugins/PluginRegistryManager'
export { useModuleNavigation } from './hooks/useModuleNavigation'
export { PersonLink } from './components/shared/PersonLink'
export { resolveEntityHref } from './lib/entity-routes'
export { usePluginPrefs } from './hooks/usePluginPrefs'
export { useTenantPluginSettings } from './shell/hooks/useTenantPluginSettings'
export type { TenantPluginSettings } from './shell/hooks/useTenantPluginSettings'
export { setScheduleBlockConfig, getScheduleBlockConfig, subscribeScheduleBlockConfig } from './lib/schedule-config'

// Assistant chat store — lets apps drive the shell's chat panel imperatively
// (e.g. an "Ask the assistant" CTA calling useChatStore().setOpen(true)). The
// store is a shared zustand singleton, so app + shell read the same instance.
export { useChatStore } from './shell/stores/chat.store'
export type { ChatMessage } from './shell/stores/chat.store'

// Shell plugin-settings panel + dedup util (used by vertical plugins)
export { PluginSettingsPanel } from './shell/components/plugins/PluginSettingsPanel'
export { ConnectorsHub } from './shell/components/plugins/ConnectorsHub'
export { dedup } from './shell/lib/dedup'

// Full admin theme type (the shell's theme system, richer than @fayz-ai/core's).
export type { SaasTheme } from './shell/config/theme/tokens'
export type { CreateThemeOptions } from './shell/config/theme/utils'
export { createFayzTheme, fayzThemePresets } from '@fayz-ai/ui'
export type { FayzThemePresetId } from '@fayz-ai/ui'
