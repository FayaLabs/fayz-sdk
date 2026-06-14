import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import type { EntityLookup } from '@fayz-ai/saas'
import type { MenuDataProvider } from './types'
import { menuRegistries } from './registries'
import { menuLocales } from './locales'

// Lazy import page to avoid circular dependency issues
const MenuPage = React.lazy(() => import('./MenuPage').then((m) => ({ default: m.MenuPage })))

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface MenuPluginLabels {
  pageTitle: string
  menuManager: string
  categories: string
  newItem: string
}

const DEFAULT_LABELS: MenuPluginLabels = {
  pageTitle: 'Menu',
  menuManager: 'Menu Manager',
  categories: 'Categories',
  newItem: 'New Item',
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

const DEFAULT_CURRENCY = { code: 'USD', locale: 'en-US', symbol: '$' }

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface MenuPluginOptions {
  modules?: {
    modifiers?: boolean
    deliveryPricing?: boolean
  }
  labels?: Partial<MenuPluginLabels>
  currency?: { code?: string; locale?: string; symbol?: string }
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: MenuDataProvider
  menuItemLookup?: EntityLookup
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: MenuPluginOptions) {
  return {
    modules: {
      modifiers: options?.modules?.modifiers !== false,
      deliveryPricing: options?.modules?.deliveryPricing === true,
    },
    labels: { ...DEFAULT_LABELS, ...options?.labels },
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMenuPlugin(options?: MenuPluginOptions): PluginManifest {
  const config = resolveConfig(options)

  const PageComponent: React.FC<any> = () =>
    React.createElement(React.Suspense, { fallback: null },
      React.createElement(MenuPage as any)
    )

  return {
    id: 'menu',
    name: config.labels.pageTitle,
    icon: 'UtensilsCrossed',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 5,
        label: config.labels.pageTitle,
        route: '/menu',
        icon: 'UtensilsCrossed',
        permission: { feature: 'menu', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/menu',
        component: PageComponent,
        permission: { feature: 'menu', action: 'read' as const },
      },
    ],
    widgets: [],
    aiTools: [
      {
        id: 'menu.list-items',
        name: 'listMenuItems',
        description: 'Lists menu items, optionally filtered by category or status.',
        icon: 'UtensilsCrossed',
        mode: 'read' as const,
        category: 'Menu',
        parameters: {
          type: 'object' as const,
          properties: {
            category: { type: 'string' as const, description: 'Category name to filter by' },
            status: { type: 'string' as const, enum: ['available', 'sold_out', 'hidden'] },
          },
        },
        suggestions: [
          { label: 'What items are on the menu?' },
          { label: 'Which items are sold out right now?' },
        ],
      },
      {
        id: 'menu.toggle-availability',
        name: 'toggleMenuItemAvailability',
        description: 'Marks a menu item as available or sold out.',
        icon: 'ToggleLeft',
        mode: 'persist' as const,
        category: 'Menu',
        parameters: {
          type: 'object' as const,
          properties: {
            itemName: { type: 'string' as const, description: 'Menu item name' },
            status: { type: 'string' as const, enum: ['available', 'sold_out'] },
          },
          required: ['itemName', 'status'],
        },
        permission: { feature: 'menu', action: 'edit' as const },
      },
    ],
    registries: menuRegistries,
    settings: [
      {
        id: 'menu',
        label: config.labels.pageTitle,
        icon: 'UtensilsCrossed',
        component: (() => {
          const MenuSettingsTab: React.ComponentType<unknown> = () =>
            React.createElement('div', { className: 'p-4' },
              React.createElement('h2', { className: 'text-lg font-semibold' }, 'Menu Settings'),
              React.createElement('p', { className: 'text-sm text-muted-foreground' }, 'Categories, allergens, and modifiers')
            )
          MenuSettingsTab.displayName = 'MenuSettingsTab'
          return MenuSettingsTab
        })(),
        order: 20,
        permission: { feature: 'menu', action: 'read' as const },
      },
    ],
    locales: menuLocales,
  }
}

export type { MenuDataProvider } from './types'
export type { MenuPluginOptions as MenuPluginConfig }
