// ---------------------------------------------------------------------------
// App factory (main entry point)
// ---------------------------------------------------------------------------
export { createFayzApp } from './app/createFayzApp'
export type { FayzAppConfig, AuthConfig, OrgConfig, ChatConfig, CustomPage, PageSection } from './app/config'

// ---------------------------------------------------------------------------
// Bridge exports — uses the battle-tested saas-core implementations via vite alias.
// In dev mode, @fayz/saas-core resolves to ../saas-core/src.
// Replace with native implementations incrementally.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cross-package bridge; resolved by vite alias in consumer apps
export { createSaasApp } from '@fayz/saas-core'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cross-package bridge; resolved by vite alias in consumer apps
export { createCrudPage } from '@fayz/saas-core'

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
