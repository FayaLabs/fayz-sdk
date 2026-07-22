import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { setShopTenantResolver, getShopProvider } from '@fayz-ai/shop'
import { useOrganizationStore, createCrudPage, registerEntityPath } from '@fayz-ai/saas'
import { buildShopProductEntity } from './views/productEntity'
import { buildShopCustomerEntity } from './views/customerEntity'
import { buildShopDiscountEntity } from './views/discountEntity'
import { buildShopShippingZoneEntity } from './views/shippingZoneEntity'
import { createShopProductDataProvider } from './data/productDataProvider'
import { createShopCustomerDataProvider } from './data/customerDataProvider'
import { createShopDiscountDataProvider } from './data/discountDataProvider'
import { createShopShippingZoneDataProvider } from './data/shippingZoneDataProvider'
import type { ShopProviderResolver } from './ShopPage'
import { ShopSettings } from './components/ShopSettings'

const ShopPage = React.lazy(() => import('./ShopPage').then((m) => ({ default: m.ShopPage })))

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ShopPluginOptions {
  navPosition?: number
  navSection?: 'main' | 'secondary' | 'settings'
  navLabel?: string
  /** Override the accordion child labels (Produtos / Pedidos / Clientes / Descontos). */
  sectionLabels?: Partial<Record<'products' | 'orders' | 'customers' | 'discounts' | 'shipping', string>>
  scope?: PluginScope
  verticalId?: VerticalId
  currency?: { code?: string; locale?: string; symbol?: string }
  provider?: ShopProviderResolver
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createShopPlugin(options?: ShopPluginOptions): PluginManifest {
  const curr = { code: 'BRL', locale: 'pt-BR', symbol: 'R$', ...options?.currency }

  // Scope fallback shop queries to the active organization. Apps can inject a
  // provider when they want SDK-owned data access instead of the global runtime.
  setShopTenantResolver(() => useOrganizationStore.getState().currentOrg?.id)

  // Teach the shared person-path registry where a SHOP customer lives. The
  // built-in map ships veterinary defaults (customer → /registry/tutors), so
  // without this PersonLink would resolve a shop customer to the wrong module.
  registerEntityPath('shop_customer', '/shop/customers')

  type ShopSection = 'products' | 'orders' | 'customers' | 'discounts' | 'shipping'

  // One component per section so each gets its own route. The shell nests any
  // entry whose route is a sub-path of another (same rule the courses modules
  // use), so /shop/products … /shop/discounts render as an accordion under
  // "Loja" instead of one link with everything hidden behind tabs.
  const pageFor = (section?: ShopSection): React.ComponentType<unknown> => {
    const Wrapped: React.ComponentType<unknown> = () =>
      React.createElement(React.Suspense, { fallback: null },
        React.createElement(
          ShopPage as React.ComponentType<{ provider?: ShopProviderResolver; section?: ShopSection }>,
          { provider: options?.provider, section },
        )
      )
    Wrapped.displayName = section ? `ShopPage:${section}` : 'ShopPageWrapper'
    return Wrapped
  }

  // Products, customers and discounts all get the full generic CRUD (list +
  // form + detail + delete) from their EntityDef, rather than three bespoke
  // read-only tables. Orders stay on the custom page: an order is not a CRUD
  // record — it needs fulfilment, refunds and a line-item view, which is its
  // own screen.
  const resolveProvider = () =>
    typeof options?.provider === 'function'
      ? options.provider()
      : options?.provider ?? getShopProvider()

  const ProductsCrudPage = createCrudPage(buildShopProductEntity(curr.code, resolveProvider), {
    dataProvider: createShopProductDataProvider(resolveProvider),
    feature: 'shop',
  })

  const CustomersCrudPage = createCrudPage(buildShopCustomerEntity(), {
    dataProvider: createShopCustomerDataProvider(resolveProvider),
    feature: 'shop',
  })

  const DiscountsCrudPage = createCrudPage(buildShopDiscountEntity(), {
    dataProvider: createShopDiscountDataProvider(resolveProvider),
    feature: 'shop',
  })

  const ShippingZonesCrudPage = createCrudPage(buildShopShippingZoneEntity(curr.code), {
    dataProvider: createShopShippingZoneDataProvider(resolveProvider),
    feature: 'shop',
  })

  const CRUD_PAGES: Partial<Record<ShopSection, React.ComponentType<unknown>>> = {
    products: ProductsCrudPage as React.ComponentType<unknown>,
    customers: CustomersCrudPage as React.ComponentType<unknown>,
    discounts: DiscountsCrudPage as React.ComponentType<unknown>,
    shipping: ShippingZonesCrudPage as React.ComponentType<unknown>,
  }

  const SECTIONS: Array<{ id: ShopSection; label: string; icon: string }> = [
    { id: 'products',  label: options?.sectionLabels?.products  ?? 'Produtos',  icon: 'Package' },
    { id: 'orders',    label: options?.sectionLabels?.orders    ?? 'Pedidos',   icon: 'ShoppingCart' },
    { id: 'customers', label: options?.sectionLabels?.customers ?? 'Clientes',  icon: 'Users' },
    { id: 'discounts', label: options?.sectionLabels?.discounts ?? 'Descontos', icon: 'Tag' },
    { id: 'shipping',  label: options?.sectionLabels?.shipping  ?? 'Entrega',   icon: 'Truck' },
  ]

  const navSection = options?.navSection ?? 'main'
  const navPosition = options?.navPosition ?? 6

  return {
    id: 'shop',
    name: options?.navLabel ?? 'Shop',
    icon: 'ShoppingBag',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    // Storefront/commerce-operator-console surface — targets the ecommerce
    // Panel world, not a saas admin app.
    scaffolds: ['ecommerce'],
    defaultEnabled: true,
    dependencies: [],
    navigation: [
      {
        section: navSection,
        position: navPosition,
        label: options?.navLabel ?? 'Shop',
        route: '/shop',
        icon: 'ShoppingBag',
        permission: { feature: 'shop', action: 'read' as const },
        // "Loja" and "Produtos" are the same screen — don't list both.
        indexChild: false,
      },
      ...SECTIONS.map((s, i) => ({
        section: navSection,
        position: navPosition + i + 1,
        label: s.label,
        route: `/shop/${s.id}`,
        icon: s.icon,
        permission: { feature: 'shop', action: 'read' as const },
      })),
    ],
    routes: [
      {
        // Kept so existing links to /shop still resolve; renders the tabbed page.
        path: '/shop',
        component: pageFor(),
        permission: { feature: 'shop', action: 'read' as const },
      },
      ...SECTIONS.map((s) => ({
        path: `/shop/${s.id}`,
        component: CRUD_PAGES[s.id] ?? pageFor(s.id),
        permission: { feature: 'shop', action: 'read' as const },
      })),
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
            React.createElement(ShopSettings, { currency: curr })
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
