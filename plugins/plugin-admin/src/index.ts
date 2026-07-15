import React from 'react'
import type { PluginManifest } from '@fayz-ai/core'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
import type { ResolvedAdminConfig, AdminPluginLabels } from './AdminContext'
import type { AdminDataProvider, AdminSettingsSnapshot } from './data/types'
import type { AdminPluginOptions } from './types'
import { createMockAdminProvider } from './data/mock'
import { createSupabaseAdminProvider } from './data/supabase'
import { createAdminStore } from './store'
import { adminLocales } from './locales'
import { AdminPage } from './AdminPage'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: AdminPluginLabels = {
  pageTitle: 'Admin',
  pageSubtitle: "Your app's layout, navigation, and branding.",
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: AdminPluginOptions): ResolvedAdminConfig {
  return {
    labels: DEFAULT_LABELS,
    layout: options?.layout ?? 'sidebar',
    moduleNav: options?.moduleNav ?? 'tabs',
    mobileHeader: options?.mobileHeader ?? 'minimal',
    navTransition: options?.navTransition ?? 'slide',
    orgSettings: options?.orgSettings ?? true,
    branding: options?.branding ?? true,
  }
}

function toSnapshot(config: ResolvedAdminConfig): AdminSettingsSnapshot {
  const { labels: _labels, ...snapshot } = config
  return snapshot
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAdminPlugin(options?: AdminPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  // Register locales globally so the plugin's translations resolve even when the
  // host shell does not mount @fayz-ai/core's I18nProvider (incremental de-bridge).
  registerTranslations(adminLocales)
  const snapshot = toSnapshot(config)
  const provider = options?.dataProvider ?? createSafeDataProvider(
    () => createSupabaseAdminProvider(snapshot),
    () => createMockAdminProvider(snapshot),
  )
  const store = createAdminStore(provider)

  const PageComponent: React.FC<unknown> = () =>
    React.createElement(AdminPage, { config, provider, store })

  return {
    id: 'admin',
    name: config.labels.pageTitle,
    icon: 'LayoutTemplate',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    // Shell/admin-config is a Panel-side concept (layout, module nav, branding
    // for an admin app) — targets the saas/admin-template world, not the
    // ecommerce storefront. Same declaration plugin-crm uses for its
    // business-ops surface.
    scaffolds: ['saas'],
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'admin', label: config.labels.pageTitle, group: config.labels.pageTitle },
    ],

    navigation: [
      {
        section: 'secondary',
        position: 90,
        label: config.labels.pageTitle,
        route: '/admin',
        icon: 'LayoutTemplate',
        permission: { feature: 'admin', action: 'read' as const },
      },
    ],

    routes: [
      {
        path: '/admin',
        component: PageComponent as unknown as React.ComponentType<unknown>,
        permission: { feature: 'admin', action: 'read' as const },
      },
    ],

    widgets: [],

    aiTools: [
      {
        id: 'admin.get-shell-settings',
        name: 'getShellSettings',
        description: 'Returns the app shell configuration: layout variant, module nav style, mobile header treatment, and whether org/branding settings are shown.',
        icon: 'LayoutTemplate',
        mode: 'read' as const,
        category: 'Admin',
        parameters: {
          type: 'object' as const,
          properties: {},
        },
        suggestions: [
          { label: 'What layout is this app using?' },
          { label: 'Is branding customization on?' },
        ],
        permission: { feature: 'admin', action: 'read' as const },
      },
    ],

    settings: [],

    locales: adminLocales,
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { AdminDataProvider, AdminSettingsSnapshot } from './data/types'
export type { ResolvedAdminConfig, AdminPluginLabels } from './AdminContext'
export type { AdminPluginOptions } from './types'
