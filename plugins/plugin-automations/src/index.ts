import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { AutomationsHome } from './views/AutomationsHome'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-automations — visual workflows (GoHighLevel "Automation").
// Universal plugin. M1 ships a rich mock home; the trigger→action execution
// engine over the core event bus + scheduler comes in a later milestone.
// ---------------------------------------------------------------------------

export interface AutomationsPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
}

export function createAutomationsPlugin(options?: AutomationsPluginOptions): PluginManifest {
  const PageComponent: React.ComponentType<unknown> = () => React.createElement(AutomationsHome)
  PageComponent.displayName = 'AutomationsHome'

  return {
    id: 'automations',
    name: options?.navLabel ?? 'Automations',
    icon: 'Zap',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [{ id: 'automations', label: 'Automations', group: 'Automate' }],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 6,
        label: options?.navLabel ?? 'Automations',
        route: '/automations',
        icon: 'Zap',
        permission: { feature: 'automations', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/automations',
        component: PageComponent,
        permission: { feature: 'automations', action: 'read' as const },
      },
    ],
    widgets: [],
  }
}
