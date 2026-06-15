// @fayz-ai/app-runtime — the umbrella import surface for generated apps.
//
// Generated apps pin a single @fayz-ai/app-runtime version and import everything
// from here, instead of pinning core/auth/saas/ui/shop/storefront separately.
// Plugins remain à-la-carte (@fayz-ai/plugin-*) and are NOT re-exported.
export * from '@fayz-ai/core'
export * from '@fayz-ai/auth'
export * from '@fayz-ai/saas'
export * from '@fayz-ai/ui'
export * from '@fayz-ai/shop'
export * from '@fayz-ai/storefront'

// Disambiguate symbols exported by more than one package. Explicit named
// re-exports override `export *` ambiguity in TypeScript.
// `AuthProvider`: @fayz-ai/core exports an adapter type, @fayz-ai/auth the runtime
// component — the umbrella surfaces the runtime component.
export { AuthProvider } from '@fayz-ai/auth'
export type {
  AuthAdapter,
  AuthSession,
  AuthUser,
  BillingConfig,
  CreateOrgOptions,
  FeatureDeclaration,
  Invite,
  LocaleConfig,
  Location,
  OrgAdapter,
  OrgMember,
  OrgMembership,
  Organization,
  PermissionAction,
  PermissionProfile,
  PermissionsConfig,
  Plan,
  PluginManifest,
  PluginRuntime,
  ThemeBrand,
  ThemeMode,
  ThemeRadius,
} from '@fayz-ai/core'

// Theme ownership for the runtime umbrella:
// - @fayz-ai/ui owns low-level theme tokens/options for generated apps.
// - @fayz-ai/saas owns the friendly admin theme adapter.
// Keep both reachable, but make the ambiguous public names deterministic.
export type { CreateThemeOptions } from '@fayz-ai/ui'
export type { SaasTheme } from '@fayz-ai/saas'
