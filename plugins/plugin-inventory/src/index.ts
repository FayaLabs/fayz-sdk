import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { InventoryPage } from './InventoryPage'
import { createInventoryDashboardWidgets } from './views/dashboardWidgets'
import type { ResolvedInventoryConfig } from './InventoryContext'
import type { InventoryDataProvider } from './data/types'
import { createMockInventoryProvider } from './data/mock'
import { createSupabaseInventoryProvider } from './data/supabase'
import { createSafeDataProvider, registerTranslations } from '@fayz-ai/core'
import { createInventoryStore } from './store'
import { inventoryRegistries } from './registries'
import { inventoryLocales } from './locales'
import { InventoryGeneralSettings } from './components/InventoryGeneralSettings'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InventoryPluginLabels {
  pageTitle: string
  pageSubtitle: string
  dashboard: string
  products: string
  productsNew: string
  productsList: string
  stock: string
  stockEntry: string
  stockExit: string
  stockHistory: string
  recipes: string
  recipesNew: string
  recipesList: string
}

export interface InventoryPluginOptions {
  modules?: {
    recipes?: boolean
    stockLocations?: boolean
    batchTracking?: boolean
    /**
     * The product catalogue screens (list + form). Defaults on. Turn OFF when the
     * host already owns product registration elsewhere — an e-commerce app
     * manages products in the shop plugin, and two competing product CRUDs is
     * how the same product ends up entered twice, differently.
     * Stock entry/exit/history stay available either way.
     */
    products?: boolean
  }
  labels?: Partial<InventoryPluginLabels>
  productTypes?: Array<{ value: string; label: string }>
  currency?: { code?: string; locale?: string; symbol?: string }
  navPosition?: number
  navSection?: 'main' | 'secondary'
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: InventoryDataProvider
  locations?: Array<{ id: string; name: string; isHQ?: boolean }>
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LABELS: InventoryPluginLabels = {
  pageTitle: 'Inventory',
  pageSubtitle: 'Product catalog and stock management',
  dashboard: 'Dashboard',
  products: 'Products',
  productsNew: 'New',
  productsList: 'List',
  stock: 'Stock',
  stockEntry: 'Entry',
  stockExit: 'Exit',
  stockHistory: 'History',
  recipes: 'Recipes',
  recipesNew: 'New',
  recipesList: 'List',
}

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

const DEFAULT_PRODUCT_TYPES = [
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'sale', label: 'For Sale' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'asset', label: 'Asset' },
]

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: InventoryPluginOptions): ResolvedInventoryConfig {
  return {
    modules: {
      products: options?.modules?.products !== false,
      recipes: options?.modules?.recipes !== false,
      stockLocations: options?.modules?.stockLocations !== false,
      batchTracking: options?.modules?.batchTracking ?? false,
    },
    labels: { ...DEFAULT_LABELS, ...options?.labels },
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
    productTypes: options?.productTypes ?? DEFAULT_PRODUCT_TYPES,
    locations: options?.locations ?? [],
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInventoryPlugin(options?: InventoryPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  registerTranslations(inventoryLocales)
  const provider = options?.dataProvider ?? createSafeDataProvider(
    () => createSupabaseInventoryProvider(),
    () => createMockInventoryProvider(),
  )
  const store = createInventoryStore(provider)
  const dashboardWidgets = createInventoryDashboardWidgets({ config, provider, store })

  const PageComponent: React.FC<any> = () =>
    React.createElement(InventoryPage, { config, provider, store, registries: inventoryRegistries })

  return {
    id: 'inventory',
    name: config.labels.pageTitle,
    icon: 'Package',
    version: '1.0.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [
      { id: 'inventory', label: config.labels.pageTitle, group: config.labels.pageTitle },
      ...(config.modules.recipes ? [{ id: 'inventory.recipes', label: config.labels.recipes ?? 'Recipes', group: config.labels.pageTitle }] : []),
    ],
    queryEntities: [
      {
        key: 'inventory:products',
        writable: true,
        entity: {
          name: 'Product',
          namePlural: 'Products',
          icon: 'Package',
          limitKey: 'products',
          permission: { feature: 'inventory', action: 'read' },
          fields: [
            { key: 'name', label: 'Name', type: 'text', required: true, searchable: true },
            { key: 'kind', label: 'Kind (sale/ingredient/asset)', type: 'text' },
            { key: 'price', label: 'Price', type: 'number' },
            { key: 'cost', label: 'Cost', type: 'number' },
            { key: 'sku', label: 'SKU', type: 'text', searchable: true },
            { key: 'isActive', label: 'Active', type: 'boolean' },
            { key: 'createdAt', label: 'Created at', type: 'text' },
          ],
          data: {
            table: 'products',
            tenantScoped: true,
            archetype: 'product',
            archetypeKind: 'sale',
            searchColumns: ['name', 'sku'],
            defaults: { kind: 'sale', status: 'active', is_active: true },
          },
        },
      },
    ],
    declaredLimits: [
      { key: 'products', label: 'Products', table: 'products' },
      ...(config.modules.recipes ? [{ key: 'recipes', label: config.labels.recipes ?? 'Recipes', table: 'plg_inventory_recipes' }] : []),
    ],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 4,
        label: config.labels.pageTitle,
        route: '/inventory',
        icon: 'Package',
        permission: { feature: 'inventory', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/inventory',
        component: PageComponent,
        permission: { feature: 'inventory', action: 'read' as const },
      },
    ],
    widgets: [],
    dashboardWidgets,
    aiTools: [
      {
        id: 'inventory.low-stock',
        name: 'getLowStock',
        description: 'Lists products with stock below minimum threshold.',
        icon: 'AlertTriangle',
        mode: 'read' as const,
        category: 'Inventory',
        parameters: {
          type: 'object' as const,
          properties: {
            threshold: { type: 'number' as const, description: 'Custom stock threshold' },
          },
        },
        suggestions: [
          { label: 'Which products are running low?' },
          { label: 'What ingredients need restocking?', verticalId: 'food' as const },
          { label: 'Show me a stock summary' },
          { label: 'What are my most used products?' },
        ],
        permission: { feature: 'inventory', action: 'read' as const },
      },
    ],
    registries: inventoryRegistries,
    settings: [
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'Package',
        component: (() => {
          const Tab: React.FC = () => React.createElement(InventoryGeneralSettings)
          Tab.displayName = 'InventorySettingsTab'
          return Tab
        })() as unknown as React.ComponentType<unknown>,
        order: 11,
        permission: { feature: 'inventory', action: 'read' as const },
      },
    ],
    locales: inventoryLocales,
  }
}

export type { InventoryDataProvider } from './data/types'
export type { ResolvedInventoryConfig } from './InventoryContext'
