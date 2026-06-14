import React from 'react'
import { registerScaffold, defineApp } from '@fayz-ai/core'
import type { AppManifest } from '@fayz-ai/core'
import { StorefrontConfigProvider, resolveConfig } from './config'
import type { StorefrontConfig } from './config'
import type { StorefrontTheme } from './theme'
import type { HomeConfig, NavLink, FooterConfig } from './sections'
import { initStorefrontRuntime, StorefrontShell } from './createStorefrontApp'
import './blocks' // ensure section blocks are registered

// ---------------------------------------------------------------------------
// Storefront scaffold — renders a store from a pure-data AppManifest. The
// storefront surface keeps its declarative config under surface.options, so the
// mapping is loss-free for the serializable fields (the code escape hatches —
// custom provider/adapter/logo — arrive via the registries instead).
// ---------------------------------------------------------------------------

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'
}

/** StorefrontConfig → AppManifest (the sugar-to-data direction). */
export function defineStorefront(config: StorefrontConfig): AppManifest {
  return defineApp({
    id: slug(config.name),
    name: config.name,
    backend: config.supabaseUrl ? { provider: 'supabase', url: config.supabaseUrl } : { provider: 'mock' },
    locale: {
      default: config.locale ?? 'pt-BR',
      supported: [config.locale ?? 'pt-BR'],
      currency: config.currency ?? 'BRL',
    },
    theme: config.theme as Record<string, unknown> | undefined,
    surfaces: {
      storefront: {
        scaffold: 'storefront',
        options: {
          announcement: config.announcement,
          home: config.home,
          nav: config.nav,
          footer: config.footer,
          shipping: config.shipping,
          features: config.features,
          catalog: config.catalog,
        },
      },
    },
  })
}

/** AppManifest → StorefrontConfig (the data-to-render direction). */
function manifestToStorefrontConfig(manifest: AppManifest, surfaceName: string): StorefrontConfig {
  const surface = manifest.surfaces[surfaceName]
  const o = (surface?.options ?? {}) as Record<string, unknown>
  return {
    name: manifest.name,
    currency: (manifest.locale as { currency?: string } | undefined)?.currency,
    locale: (manifest.locale as { default?: string } | undefined)?.default,
    theme: manifest.theme as StorefrontTheme | undefined,
    announcement: o.announcement as string | undefined,
    home: o.home as HomeConfig | undefined,
    nav: o.nav as NavLink[] | undefined,
    footer: o.footer as FooterConfig | undefined,
    shipping: o.shipping as StorefrontConfig['shipping'],
    features: o.features as StorefrontConfig['features'],
    catalog: o.catalog as StorefrontConfig['catalog'],
    supabaseUrl: manifest.backend?.url,
  }
}

export function StorefrontScaffold({ manifest, surface }: { manifest: AppManifest; surface: string }) {
  const config = React.useMemo(() => manifestToStorefrontConfig(manifest, surface), [manifest, surface])
  const resolved = React.useMemo(() => resolveConfig(config), [config])
  const inited = React.useRef(false)
  if (!inited.current) {
    initStorefrontRuntime(config)
    inited.current = true
  }
  return (
    <StorefrontConfigProvider value={resolved}>
      <StorefrontShell />
    </StorefrontConfigProvider>
  )
}
StorefrontScaffold.displayName = 'StorefrontScaffold'

// Self-register so `renderApp(manifest)` can resolve the 'storefront' scaffold
// whenever this package is imported.
registerScaffold('storefront', StorefrontScaffold, { source: 'sdk', label: 'Storefront' })
