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
  'agenda', 'automations', 'conversations', 'courses', 'crm', 'dashboard',
  'financial', 'forms', 'inventory', 'marketing', 'menu', 'orders', 'reports',
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

  return {
    plugins: [...(opts.plugins ?? [])],
    envPrefix: ['VITE_', 'PUBLIC_'],
    resolve: {
      alias: {
        '@': resolve(root, 'src'),
        ...localAliases,
        ...(opts.aliases ?? {}),
      } as AliasOptions,
      dedupe: ['react', 'react-dom', 'zustand'],
      conditions: useLocal ? ['source', 'browser', 'module', 'jsnext:main', 'jsnext'] : undefined,
    },
    optimizeDeps: { exclude: useLocal ? Object.keys(localAliases) : [] },
    server: {
      port: opts.port,
      strictPort: opts.strictPort,
      fs: { allow: [root, fayzSdk] },
    },
  }
}
