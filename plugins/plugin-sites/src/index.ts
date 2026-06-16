import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { SitesHome } from './views/SitesHome'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-sites — websites, funnels & landing pages (GoHighLevel "Sites").
// Universal plugin. M1 ships a rich mock home; the drag-and-drop page builder
// (block system from architecture-v2 + public surfaces) ships in a later milestone.
// ---------------------------------------------------------------------------

export interface SitesPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
}

export function createSitesPlugin(options?: SitesPluginOptions): PluginManifest {
  const PageComponent: React.ComponentType<unknown> = () => React.createElement(SitesHome)
  PageComponent.displayName = 'SitesHome'

  return {
    id: 'sites',
    name: options?.navLabel ?? 'Sites',
    icon: 'LayoutTemplate',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [{ id: 'sites', label: 'Sites & Funnels', group: 'Convert' }],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 7,
        label: options?.navLabel ?? 'Sites',
        route: '/sites',
        icon: 'LayoutTemplate',
        permission: { feature: 'sites', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/sites',
        component: PageComponent,
        permission: { feature: 'sites', action: 'read' as const },
      },
    ],
    widgets: [],
  }
}
