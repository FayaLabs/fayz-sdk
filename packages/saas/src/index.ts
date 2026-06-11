// ---------------------------------------------------------------------------
// App factory (main entry point)
// ---------------------------------------------------------------------------
export { createFayzApp } from './app/createFayzApp'
export type { FayzAppConfig, AuthConfig, OrgConfig, ChatConfig, CustomPage, PageSection } from './app/config'

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

// Shell bridge — createSaasApp + the default createCrudPage stay on saas-core
// until the shell de-bridges (last W6 step).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cross-package bridge; resolved by vite alias in consumer apps
export { createSaasApp, createCrudPage } from '@fayz/saas-core'

// ---------------------------------------------------------------------------
// Archetype lookup
// ---------------------------------------------------------------------------
export { createArchetypeLookup } from './archetype-lookup'
export type { EntityLookup, EntityLookupResult, ArchetypeType } from './archetype-lookup'

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
// Re-export commonly needed @fayz/core types so consumers can import
// everything from a single package when building on top of @fayz/saas
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
  SaasTheme,
  ThemeMode,
  ThemeBrand,
  ThemeRadius,
  // i18n
  LocaleConfig,
  // Billing
  BillingConfig,
  Plan,
} from '@fayz/core'

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
export { createPlaceholder } from './placeholder'

// Plugin framework UI (used by plugins + the shell)
export { SettingsGroup, ToggleRow, SelectRow } from './plugins/SettingsGroup'
export { QuickActionsButton } from './plugins/QuickActionsButton'
export { PluginRegistryManager } from './plugins/PluginRegistryManager'
export { useModuleNavigation } from './hooks/useModuleNavigation'
