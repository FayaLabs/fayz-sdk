import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import type { TablesDataProvider } from './data/types'
import type { TableSession } from './types'
import { createMockTablesProvider } from './data/mock'
import { createTablesStore } from './store'
import { tablesRegistries } from './registries'
import { tablesLocales } from './locales'
import { PluginSettingsPanel } from '@fayz-ai/saas'

const TablesPage = React.lazy(() => import('./TablesPage').then((m) => ({ default: m.TablesPage })))

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface TablesPluginLabels {
  pageTitle: string
  floorPlan: string
  zones: string
  sessionHistory: string
}

const DEFAULT_LABELS: TablesPluginLabels = {
  pageTitle: 'Tables',
  floorPlan: 'Floor Plan',
  zones: 'Zones',
  sessionHistory: 'Session History',
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface TablesPluginOptions {
  modules?: {
    reservations?: boolean
    sessionHistory?: boolean
  }
  labels?: Partial<TablesPluginLabels>
  defaultZones?: Array<{ name: string; color?: string }>
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: TablesDataProvider
  onTableSeated?: (session: TableSession) => Promise<string | undefined>
  onTableClosed?: (session: TableSession) => Promise<void>
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: TablesPluginOptions) {
  return {
    modules: {
      reservations: options?.modules?.reservations === true,
      sessionHistory: options?.modules?.sessionHistory !== false,
    },
    labels: { ...DEFAULT_LABELS, ...options?.labels } as any,
    defaultZones: options?.defaultZones ?? [
      { name: 'Indoor', color: '#3b82f6' },
      { name: 'Outdoor', color: '#22c55e' },
      { name: 'Bar', color: '#f59e0b' },
    ],
    onTableSeated: options?.onTableSeated,
    onTableClosed: options?.onTableClosed,
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTablesPlugin(options?: TablesPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  const provider = options?.dataProvider ?? createMockTablesProvider()
  const store = createTablesStore(provider)

  const PageComponent: React.FC<any> = () =>
    React.createElement(React.Suspense, { fallback: null },
      React.createElement(TablesPage, { config, provider, store, registries: tablesRegistries })
    )

  return {
    id: 'tables',
    name: config.labels.pageTitle,
    icon: 'MapPin',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 4,
        label: config.labels.pageTitle,
        route: '/tables',
        icon: 'MapPin',
        permission: { feature: 'tables', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/tables',
        component: PageComponent,
        permission: { feature: 'tables', action: 'read' as const },
      },
    ],
    widgets: [],
    aiTools: [
      {
        id: 'tables.availability',
        name: 'getTableAvailability',
        description: 'Returns which tables are available, occupied, reserved, or being cleaned.',
        icon: 'MapPin',
        mode: 'read' as const,
        category: 'Tables',
        parameters: {
          type: 'object' as const,
          properties: {
            zone: { type: 'string' as const, description: 'Filter by zone name' },
            status: { type: 'string' as const, enum: ['available', 'occupied', 'reserved', 'cleaning'] },
          },
        },
        suggestions: [
          { label: 'Which tables are available right now?' },
          { label: 'How many tables are occupied?' },
        ],
      },
      {
        id: 'tables.seat-guests',
        name: 'seatGuests',
        description: 'Seats guests at a specific table.',
        icon: 'UserPlus',
        mode: 'persist' as const,
        category: 'Tables',
        parameters: {
          type: 'object' as const,
          properties: {
            tableNumber: { type: 'number' as const, description: 'Table number' },
            guests: { type: 'number' as const, description: 'Number of guests' },
          },
          required: ['tableNumber', 'guests'],
        },
        permission: { feature: 'tables', action: 'edit' as const },
      },
    ],
    registries: tablesRegistries,
    settings: [
      {
        id: 'tables',
        label: config.labels.pageTitle,
        icon: 'MapPin',
        component: (() => {
          const TablesSettingsTab: React.ComponentType<unknown> = () =>
            React.createElement(PluginSettingsPanel, {
              title: 'Tables Settings',
              subtitle: 'Zones and floor plan configuration',
              registries: tablesRegistries,
              routeBase: '/settings/tables',
            })
          TablesSettingsTab.displayName = 'TablesSettingsTab'
          return TablesSettingsTab
        })(),
        order: 21,
        permission: { feature: 'tables', action: 'read' as const },
      },
    ],
    locales: tablesLocales,
  }
}

export type { TablesDataProvider } from './data/types'
export { createFayzTablesProvider } from './data/fayz'
export type { FayzTablesProviderOptions } from './data/fayz'
export type { ResolvedTablesConfig } from './TablesContext'
