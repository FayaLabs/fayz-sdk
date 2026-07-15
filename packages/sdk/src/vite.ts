import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { UserConfig, PluginOption, AliasOptions } from 'vite'

// All publishable @fayz-ai/* packages (root src). Subpaths (e.g.
// @fayz-ai/saas/ui, @fayz-ai/storefront/catalog) resolve automatically via
// Vite's prefix alias matching — the shim files mirror the subpath under src/.
const SDK_PACKAGES = [
  'sdk', 'core', 'auth', 'ui', 'saas', 'shop', 'storefront', 'portal', 'courses', 'db',
] as const

const SDK_PLUGINS = [
  'agenda', 'auth', 'automations', 'blog', 'conversations', 'courses', 'crm', 'dashboard',
  'financial', 'forms', 'inventory', 'marketing', 'menu', 'orders', 'payments', 'reports',
  'reputation', 'shop', 'sites', 'tables', 'tasks',
] as const

export interface FayzViteOptions {
  /** Dev server port. */
  port?: number
  /** Fail instead of incrementing if the port is taken. */
  strictPort?: boolean
  /** Extra app-specific aliases, merged after the SDK aliases. */
  aliases?: Record<string, string>
  /** Extra Vite plugins, appended after @vitejs/plugin-react. */
  plugins?: PluginOption[]
  /** SDK source location relative to the app root (default ../../fayz-sdk). */
  sdkDir?: string
  /** App root directory (default process.cwd()). */
  root?: string
  /**
   * Extra Vite `server` config, merged over the SDK server defaults. The
   * preview-container contract (host/cors/allowedHosts/headers) is applied
   * first, so an override can add e.g. `proxy` without dropping it.
   */
  server?: UserConfig['server']
  /**
   * Extra Vite `resolve` config, merged over the SDK resolve defaults. The SDK
   * alias map / dedupe / conditions win for `@fayz-ai/*` local-source
   * resolution; any other resolve keys (and extra aliases) are merged in.
   */
  resolve?: UserConfig['resolve']
}

/**
 * Shared Vite config for Fayz dogfood apps. Resolves `@fayz-ai/*` from the local
 * SDK source when it is checked out next to the app AND `FAYZ_SDK_SOURCE` is not
 * `published`; otherwise from node_modules (the Fayz editor sandbox / published
 * npm). Apps no longer hand-maintain alias maps or the local-vs-npm guard.
 *
 *     import { defineConfig } from 'vite'
 *     import react from '@vitejs/plugin-react'
 *     import { fayzVite } from '@fayz-ai/sdk/vite'
 *     export default defineConfig(fayzVite({ port: 5185, plugins: [react()] }))
 *
 * The app passes its own `@vitejs/plugin-react` so `@fayz-ai/sdk` carries no
 * build-tool peer deps (which otherwise choke npm's peer resolution, since sdk
 * sits in every dependency path).
 */
export function fayzVite(opts: FayzViteOptions = {}): UserConfig {
  const root = opts.root ?? process.cwd()
  const fayzSdk = resolve(root, opts.sdkDir ?? '../../fayz-sdk')
  const wantLocal = process.env.FAYZ_SDK_SOURCE !== 'published'
  const localPresent = existsSync(resolve(fayzSdk, 'packages/core/src/index.ts'))
  const useLocal = wantLocal && localPresent

  const localAliases: Record<string, string> = {}
  if (useLocal) {
    for (const p of SDK_PACKAGES) localAliases[`@fayz-ai/${p}`] = resolve(fayzSdk, `packages/${p}/src`)
    for (const p of SDK_PLUGINS) localAliases[`@fayz-ai/plugin-${p}`] = resolve(fayzSdk, `plugins/plugin-${p}/src`)
  }

  // Pull SDK-owned resolve keys out of any caller override so they can't clobber
  // local-source @fayz-ai/* resolution; the rest of `resolve` is merged in.
  const { alias: userAlias, dedupe: userDedupe, conditions: _ignore, ...restResolve } =
    (opts.resolve ?? {}) as Exclude<UserConfig['resolve'], undefined>

  return {
    plugins: [...(opts.plugins ?? [])],
    envPrefix: ['VITE_', 'PUBLIC_'],
    resolve: {
      ...restResolve,
      alias: {
        '@': resolve(root, 'src'),
        ...localAliases,
        ...(opts.aliases ?? {}),
        ...((userAlias as Record<string, string> | undefined) ?? {}),
      } as AliasOptions,
      // lucide-react is a direct dep of both the app and every @fayz-ai/*
      // package; without dedupe a version skew installs two copies and esbuild
      // pre-bundles each barrel separately (~1,500 icon modules each).
      // Collapsing to one copy is the single biggest cut to the editor-container
      // optimize RAM/CPU spike. Only dedupe deps the *app* directly depends on
      // (so they're hoisted to its root node_modules) — deduping a transitive
      // like @tanstack/react-table makes Vite resolve it from the app root,
      // which fails in local-source mode and 500s the aliased UI source.
      dedupe: userDedupe ?? ['react', 'react-dom', 'zustand', 'lucide-react'],
      conditions: useLocal ? ['source', 'browser', 'module', 'jsnext:main', 'jsnext'] : undefined,
    },
    optimizeDeps: { exclude: useLocal ? Object.keys(localAliases) : [] },
    // The preview-container runtime contract: Vite 5.4 host-check 403s any
    // non-local Host (browser iframe via Caddy, health probe via
    // host.docker.internal) unless allowedHosts is set. host/cors/headers keep
    // the proxied iframe + cross-origin asset fetches working. Owned here
    // because the app's vite.config has no literal `server: {` for the
    // container's text patchers to anchor on. Caller `server` merges last.
    server: {
      host: true,
      port: opts.port,
      strictPort: opts.strictPort,
      cors: true,
      allowedHosts: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
      fs: { allow: [root, fayzSdk] },
      ...(opts.server ?? {}),
    },
  }
}
