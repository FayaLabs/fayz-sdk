import * as React from 'react'
import {
  registerScaffold,
  defineApp,
  getPluginFactory,
  getComponent,
} from '@fayz-ai/core'
import type {
  AppManifest,
  PluginManifest,
  SaasTheme,
  LocaleConfig,
  PermissionsConfig,
  BillingConfig,
} from '@fayz-ai/core'
import { AdminProviders } from './createFayzApp'
import { AdminShell } from './AdminShell'
import type { FayzAppConfig, CustomPage } from './config'

// ---------------------------------------------------------------------------
// Admin scaffold — renders an admin app from a pure-data AppManifest. Mirrors
// the storefront scaffold's dual path: defineSaas turns a FayzAppConfig into a
// manifest (the sugar→data direction), and AdminScaffold turns a manifest back
// into the provider stack + shell (the data→render direction). Plugins live in
// the manifest as PluginRefs (id + JSON config) and are resolved to live
// PluginManifests through the plugin-factory registry, exactly the contract a
// generated app's plugins.generated.ts populates.
// ---------------------------------------------------------------------------

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'
}

/** FayzAppConfig → AppManifest (sugar → data). Code escape hatches (plugin
 *  objects, custom-page components, adapters) are NOT serialized; the manifest
 *  references plugins by id and pages by registered component id instead. */
export function defineSaas(config: FayzAppConfig): AppManifest {
  return defineApp({
    id: slug(config.name),
    name: config.name,
    backend: config.supabaseUrl
      ? { provider: 'supabase', url: config.supabaseUrl }
      : { provider: 'mock' },
    locale: config.locale,
    theme: config.theme as Record<string, unknown> | undefined,
    permissions: config.permissions,
    billing: config.billing,
    surfaces: {
      admin: {
        scaffold: 'admin',
        plugins: (config.plugins ?? []).map((p) => ({ id: p.id })),
        options: {
          layout: config.layout ?? 'sidebar',
          requireAuth: config.auth?.requireAuth ?? true,
        },
      },
    },
  })
}

/** Resolve a manifest's PluginRefs into live PluginManifests via the
 *  plugin-factory registry. Unknown ids are skipped with a console warning so a
 *  partial install degrades instead of crashing. */
function resolvePlugins(manifest: AppManifest, surfaceName: string): PluginManifest[] {
  const refs = manifest.surfaces[surfaceName]?.plugins ?? []
  const plugins: PluginManifest[] = []
  for (const ref of refs) {
    if (ref.enabled === false) continue
    const factory = getPluginFactory(ref.id)
    if (!factory) {
      // eslint-disable-next-line no-console
      console.warn(`[@fayz-ai/saas] No plugin factory registered for "${ref.id}". Did plugins.generated.ts run?`)
      continue
    }
    plugins.push(factory(ref.config) as PluginManifest)
  }
  return plugins
}

/** Resolve manifest pages that reference a registered component id into the
 *  CustomPage shape the shell renders. (entity/blocks pages are handled by the
 *  plugins that own them; component pages are the app-level escape hatch.) */
function resolvePages(manifest: AppManifest, surfaceName: string): CustomPage[] {
  const pages = manifest.surfaces[surfaceName]?.pages ?? []
  const out: CustomPage[] = []
  for (const p of pages) {
    if (!p.component) continue
    const Component = getComponent(p.component) as React.ComponentType | undefined
    if (!Component) {
      // eslint-disable-next-line no-console
      console.warn(`[@fayz-ai/saas] Manifest page "${p.path}" references unregistered component "${p.component}".`)
      continue
    }
    out.push({ path: p.path, label: p.label, icon: p.icon, section: p.section, component: Component })
  }
  return out
}

/** AppManifest → FayzAppConfig (data → render). */
function manifestToFayzConfig(manifest: AppManifest, surfaceName: string): FayzAppConfig {
  const options = (manifest.surfaces[surfaceName]?.options ?? {}) as Record<string, unknown>
  return {
    name: manifest.name,
    supabaseUrl: manifest.backend?.provider === 'supabase' ? manifest.backend.url : undefined,
    plugins: resolvePlugins(manifest, surfaceName),
    pages: resolvePages(manifest, surfaceName),
    theme: manifest.theme as SaasTheme | undefined,
    layout: (options.layout as FayzAppConfig['layout']) ?? 'sidebar',
    locale: manifest.locale as LocaleConfig | undefined,
    permissions: manifest.permissions as PermissionsConfig | undefined,
    billing: manifest.billing as BillingConfig | undefined,
    auth: { requireAuth: (options.requireAuth as boolean) ?? true },
  }
}

export function AdminScaffold({ manifest, surface }: { manifest: AppManifest; surface: string }) {
  const config = React.useMemo(() => manifestToFayzConfig(manifest, surface), [manifest, surface])
  return (
    <AdminProviders config={config}>
      <AdminShell
        appName={config.name}
        layout={config.layout}
        pages={config.pages}
        requireAuth={config.auth?.requireAuth}
      />
    </AdminProviders>
  )
}
AdminScaffold.displayName = 'AdminScaffold'

// Self-register so renderApp(manifest) can resolve the 'admin' scaffold once
// this package is imported.
registerScaffold('admin', AdminScaffold, { source: 'sdk', label: 'Admin' })
