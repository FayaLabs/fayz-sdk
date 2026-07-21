import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { registerTranslations } from '@fayz-ai/core'
import type { EntityLookup } from '@fayz-ai/saas'
import type { MenuDataProvider } from './data/types'
import { createMockMenuProvider } from './data/mock'
import { createMenuStore } from './store'
import { menuRegistries } from './registries'
import { menuLocales } from './locales'
import { PluginSettingsPanel } from '@fayz-ai/saas'

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

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

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
  registerTranslations(menuLocales)
  const provider = options?.dataProvider ?? createMockMenuProvider()
  const store = createMenuStore(provider)

  const PageComponent: React.FC<any> = () =>
    React.createElement(React.Suspense, { fallback: null },
      React.createElement(MenuPage, { config, provider, store, registries: menuRegistries })
    )

  return {
    id: 'menu',
    name: config.labels.pageTitle,
    icon: 'UtensilsCrossed',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    // Digital menu serves both internal ops (saas) and online ordering
    // (ecommerce) — genuinely dual-surface, low confidence, revisit if a
    // real host disagrees.
    scaffolds: ['saas', 'ecommerce'],
    defaultEnabled: true,
    dependencies: [],
    declaredLimits: [
      { key: 'menu_items', label: 'Menu items', table: 'menu_items' },
    ],
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
            React.createElement(PluginSettingsPanel, {
              title: 'Menu Settings',
              subtitle: 'Categories, allergens, and modifiers',
              registries: menuRegistries,
              routeBase: '/settings/menu',
            })
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

export type { MenuDataProvider } from './data/types'
export { createFayzMenuProvider } from './data/platform'
export type { FayzMenuProviderOptions } from './data/platform'
export type { ResolvedMenuConfig } from './MenuContext'
// Domain types — public so any host can implement a MenuDataProvider (e.g. an
// app-local Supabase provider during plugin incubation).
export type * from './types'
