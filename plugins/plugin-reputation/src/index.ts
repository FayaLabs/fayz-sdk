import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { ReputationHome } from './views/ReputationHome'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-reputation — reviews & reputation (GoHighLevel "Reputation").
// Universal plugin. M1 ships a rich mock home; Google/Facebook review sync +
// automated review requests (over connectors + automations) come later.
// ---------------------------------------------------------------------------

export interface ReputationPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
}

export function createReputationPlugin(options?: ReputationPluginOptions): PluginManifest {
  const PageComponent: React.ComponentType<unknown> = () => React.createElement(ReputationHome)
  PageComponent.displayName = 'ReputationHome'

  return {
    id: 'reputation',
    name: options?.navLabel ?? 'Reputation',
    icon: 'Award',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [{ id: 'reputation', label: 'Reputation', group: 'Retain' }],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 8,
        label: options?.navLabel ?? 'Reputation',
        route: '/reputation',
        icon: 'Award',
        permission: { feature: 'reputation', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/reputation',
        component: PageComponent,
        permission: { feature: 'reputation', action: 'read' as const },
      },
    ],
    widgets: [],
  }
}
