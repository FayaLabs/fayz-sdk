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
  LocaleConfig,
  PermissionsConfig,
  BillingConfig as ManifestBillingConfig,
} from '@fayz-ai/core'
import { AdminProviders } from './createFayzApp'
import { AdminShell } from './AdminShell'
import type { FayzAppConfig, CustomPage } from './config'
import { createSaasApp, type SaasAppConfig } from '../shell/createSaasApp'

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

const liveConfigOption = '__fayzLiveConfigRef'
const liveSaasConfigs = new Map<string, FayzAppConfig | SaasAppConfig>()

function hasLegacyShellConfig(config: FayzAppConfig | SaasAppConfig): config is SaasAppConfig {
  return 'organization' in config || 'settingsTabs' in config || 'bottomNav' in config || 'pluginRuntime' in config
}

function getAuthRequireAuth(config: FayzAppConfig | SaasAppConfig): boolean {
  return config.auth?.requireAuth ?? true
}

function getLiveConfigRef(id: string): string {
  return `code:${id}`
}

/** Fayz/Saas config → AppManifest (sugar → data). During the Beauty/Resto
 * migration, config-authored apps keep a live config ref so renderApp can
 * preserve code-backed plugins and custom pages while the JSON manifest path
 * matures. Serialized manifests still resolve through plugin/page registries. */
export function defineSaas(config: FayzAppConfig | SaasAppConfig): AppManifest {
  const id = slug(config.name)
  const configRef = getLiveConfigRef(id)
  liveSaasConfigs.set(configRef, config)
  return defineApp({
    id,
    name: config.name,
    backend: config.supabaseUrl
      ? { provider: 'supabase', url: config.supabaseUrl }
      : { provider: 'mock' },
    locale: config.locale as LocaleConfig | undefined,
    theme: config.theme as Record<string, unknown> | undefined,
    permissions: config.permissions,
    billing: config.billing as ManifestBillingConfig | undefined,
    surfaces: {
      admin: {
        scaffold: 'admin',
        plugins: (config.plugins ?? []).map((p) => ({ id: p.id })),
        options: {
          [liveConfigOption]: configRef,
          layout: config.layout ?? 'sidebar',
          requireAuth: getAuthRequireAuth(config),
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
  const liveConfigRef = options[liveConfigOption]
  const liveConfig = typeof liveConfigRef === 'string' ? liveSaasConfigs.get(liveConfigRef) : undefined
  if (liveConfig && !hasLegacyShellConfig(liveConfig)) return liveConfig

  return {
    name: manifest.name,
    supabaseUrl: manifest.backend?.provider === 'supabase' ? manifest.backend.url : undefined,
    plugins: resolvePlugins(manifest, surfaceName),
    pages: resolvePages(manifest, surfaceName),
    theme: manifest.theme as FayzAppConfig['theme'],
    layout: (options.layout as FayzAppConfig['layout']) ?? 'sidebar',
    locale: manifest.locale as LocaleConfig | undefined,
    permissions: manifest.permissions as PermissionsConfig | undefined,
    billing: manifest.billing as FayzAppConfig['billing'],
    auth: { requireAuth: (options.requireAuth as boolean) ?? true },
  }
}

export function AdminScaffold({ manifest, surface }: { manifest: AppManifest; surface: string }) {
  const liveConfigRef = manifest.surfaces[surface]?.options?.[liveConfigOption]
  const liveConfig = typeof liveConfigRef === 'string' ? liveSaasConfigs.get(liveConfigRef) : undefined
  const LegacyApp = React.useMemo(() => {
    if (!liveConfig || !hasLegacyShellConfig(liveConfig)) return null
    return createSaasApp(liveConfig)
  }, [liveConfig])
  const config = React.useMemo(() => manifestToFayzConfig(manifest, surface), [manifest, surface])

  if (LegacyApp) return <LegacyApp />

  return (
    <AdminProviders config={config}>
      <AdminShell
        appName={config.name}
        logo={config.logo}
        layout={config.layout}
        pages={config.pages}
        requireAuth={config.auth?.requireAuth}
        loginTagline={config.auth?.loginTagline}
        loginDescription={config.auth?.loginDescription}
        loginLogo={config.auth?.loginLogo}
        loginLayout={config.auth?.loginLayout}
        showOAuth={config.auth?.showOAuth}
        oauthProviders={config.auth?.oauthProviders}
        showSettings
        showOrgSettings={Boolean(config.org)}
      />
    </AdminProviders>
  )
}
AdminScaffold.displayName = 'AdminScaffold'

// Self-register so renderApp(manifest) can resolve the 'admin' scaffold once
// this package is imported.
registerScaffold('admin', AdminScaffold, { source: 'sdk', label: 'Admin' })
