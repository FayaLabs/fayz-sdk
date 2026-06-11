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

// Disambiguate symbols exported by more than one package. An explicit named
// re-export overrides the `export *` ambiguity in TypeScript.
// `AuthProvider`: @fayz/core exports an adapter type, @fayz/auth the runtime
// component — the umbrella surfaces the runtime component.
export { AuthProvider } from '@fayz/auth'
