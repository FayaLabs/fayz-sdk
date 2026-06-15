// ---------------------------------------------------------------------------
// App factory (main entry point)
// ---------------------------------------------------------------------------
export { createFayzApp, AdminProviders } from './app/createFayzApp'
export type { FayzAppConfig, AuthConfig, OrgConfig, ChatConfig, CustomPage, PageSection } from './app/config'

// Native admin scaffold — manifest-first entry. Importing this registers the
// 'admin' scaffold so renderApp(manifest) can resolve it.
export { defineSaas, AdminScaffold } from './app/scaffold'
export { AdminShell } from './app/AdminShell'
export { LoginPage } from './app/LoginPage'
export { navigateTo as adminNavigateTo, useAdminPath } from './app/routing'

// ---------------------------------------------------------------------------
// CRUD engine — NATIVE code is now in ./crud (de-bridged from saas-core: the
// full list/form/detail engine, archetype layouts, providers and store).
// The native engine + the saas shell share runtime providers (Permissions,
// Org), so the DEFAULT createCrudPage stays bridged until the admin shell
// de-bridges and mounts the native providers — they co-migrate atomically.
// The native pieces are exported here, ready for the native shell.
export {
  CrudPage,
  CrudFormPage,
  CrudDetailPage,
  CrudCardGrid,
  DeleteConfirmDialog,
  ImportWizard,
  exportToCSV,
  createCrudPage as createNativeCrudPage,
} from './crud'
export type { ImportRowError } from './crud'
export { PermissionGate } from './permissions/PermissionGate'
export { WidgetSlot } from './plugins/WidgetSlot'
export { useFieldRules } from './hooks/useFieldRules'

// Native admin shell — createSaasApp orchestrator (de-bridged from saas-core
// into ./shell). The default createCrudPage is the native one.
export { createSaasApp } from './shell/createSaasApp'
export type { SaasAppConfig, PageConfig } from './shell/createSaasApp'
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
  getCoreSchemaClient,
  CORE_SCHEMA,
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
// Billing
// ---------------------------------------------------------------------------
export { useBillingStore } from './billing/index'
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
} from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
export { createPlaceholder } from './placeholder'

// Plugin framework UI (used by plugins + the shell)
export { SettingsGroup, ToggleRow, SelectRow } from './plugins/SettingsGroup'
export { QuickActionsButton } from './plugins/QuickActionsButton'
export { PluginRegistryManager } from './plugins/PluginRegistryManager'
export { useModuleNavigation } from './hooks/useModuleNavigation'
export { PersonLink } from './components/shared/PersonLink'
export { resolveEntityHref } from './lib/entity-routes'
export { usePluginPrefs } from './hooks/usePluginPrefs'
export { setScheduleBlockConfig, getScheduleBlockConfig, subscribeScheduleBlockConfig } from './lib/schedule-config'

// Shell plugin-settings panel + dedup util (used by vertical plugins)
export { PluginSettingsPanel } from './shell/components/plugins/PluginSettingsPanel'
export { dedup } from './shell/lib/dedup'

// Full admin theme type (the shell's theme system, richer than @fayz-ai/core's).
export type { SaasTheme } from './shell/config/theme/tokens'
export type { CreateThemeOptions } from './shell/config/theme/utils'
export { createFayzTheme, fayzThemePresets } from '@fayz-ai/ui'
export type { FayzThemePresetId } from '@fayz-ai/ui'
