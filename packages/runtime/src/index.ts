// @fayz/runtime — the umbrella import surface for generated apps.
//
// Generated apps pin a single @fayz/runtime version and import everything
// from here, instead of pinning core/auth/saas/ui/shop/storefront separately.
// Plugins remain à-la-carte (@fayz/plugin-*) and are NOT re-exported.
export * from '@fayz/core'
export * from '@fayz/auth'
export * from '@fayz/saas'
export * from '@fayz/ui'
export * from '@fayz/shop'
export * from '@fayz/storefront'

// Disambiguate symbols exported by more than one package. Explicit named
// re-exports override `export *` ambiguity in TypeScript.
// `AuthProvider`: @fayz/core exports an adapter type, @fayz/auth the runtime
// component — the umbrella surfaces the runtime component.
export { AuthProvider } from '@fayz/auth'

// Theme ownership for the runtime umbrella:
// - @fayz/ui owns low-level theme tokens/options for generated apps.
// - @fayz/saas owns the friendly admin theme adapter.
// Keep both reachable, but make the ambiguous public names deterministic.
export type { CreateThemeOptions } from '@fayz/ui'
export type { SaasTheme } from '@fayz/saas'
