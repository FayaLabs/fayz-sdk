import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { setShopTenantResolver } from '@fayz-ai/shop'
import { useOrganizationStore } from '@fayz-ai/saas'

const ShopPage = React.lazy(() => import('./ShopPage').then((m) => ({ default: m.ShopPage })))

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ShopPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  scope?: PluginScope
  verticalId?: VerticalId
  currency?: { code?: string; locale?: string; symbol?: string }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createShopPlugin(options?: ShopPluginOptions): PluginManifest {
  const curr = { code: 'BRL', locale: 'pt-BR', symbol: 'R$', ...options?.currency }

  // Scope shop queries to the active organization. Provider selection itself
  // is lazy — getShopProvider() picks Supabase once the client is initialized.
  setShopTenantResolver(() => useOrganizationStore.getState().currentOrg?.id)

  const PageComponent: React.ComponentType<unknown> = () =>
    React.createElement(React.Suspense, { fallback: null },
      React.createElement(ShopPage as any)
    )
  PageComponent.displayName = 'ShopPageWrapper'

  return {
    id: 'shop',
    name: options?.navLabel ?? 'Shop',
    icon: 'ShoppingBag',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: [],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 6,
        label: options?.navLabel ?? 'Shop',
        route: '/shop',
        icon: 'ShoppingBag',
        permission: { feature: 'shop', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/shop',
        component: PageComponent,
        permission: { feature: 'shop', action: 'read' as const },
      },
    ],
    widgets: [],
    aiTools: [
      {
        id: 'shop.list-products',
        name: 'listProducts',
        description: 'Lists products in the shop catalog.',
        icon: 'Package',
        mode: 'read' as const,
        category: 'Shop',
        parameters: {
          type: 'object' as const,
          properties: {
            search: { type: 'string' as const, description: 'Filter by name' },
            status: { type: 'string' as const, enum: ['draft', 'active', 'archived'] },
          },
        },
        suggestions: [
          { label: 'What products are available?' },
          { label: 'Which products are out of stock?' },
        ],
      },
      {
        id: 'shop.list-orders',
        name: 'listOrders',
        description: 'Lists recent shop orders.',
        icon: 'ShoppingCart',
        mode: 'read' as const,
        category: 'Shop',
        parameters: {
          type: 'object' as const,
          properties: {
            financialStatus: { type: 'string' as const, enum: ['pending', 'paid', 'refunded', 'voided'] },
            fulfillmentStatus: { type: 'string' as const, enum: ['unfulfilled', 'partially_fulfilled', 'fulfilled'] },
          },
        },
        suggestions: [
          { label: 'Show me pending orders' },
          { label: 'How many orders were paid today?' },
        ],
      },
    ],
    settings: [
      {
        id: 'shop',
        label: 'Shop',
        icon: 'ShoppingBag',
        component: (() => {
          const ShopSettingsTab: React.ComponentType<unknown> = () =>
            React.createElement('div', { className: 'p-4 space-y-2' },
              React.createElement('h2', { className: 'text-lg font-semibold' }, 'Configurações da Loja'),
              React.createElement('p', { className: 'text-sm text-muted-foreground' },
                `Moeda: ${curr.symbol} (${curr.code})`
              )
            )
          ShopSettingsTab.displayName = 'ShopSettingsTab'
          return ShopSettingsTab
        })(),
        order: 30,
        permission: { feature: 'shop', action: 'read' as const },
      },
    ],
  }
}

// Re-export shop types so consumer apps only need @fayz-ai/plugin-shop
export type {
  Product, Order, ShopCustomer, Discount, Category,
  CreateProductInput, UpdateProductInput, ListProductsOptions,
  CreateOrderInput, UpdateOrderInput, ListOrdersOptions,
} from '@fayz-ai/shop'
