import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import type { EntityLookup } from '@fayz-ai/saas'
import type { OrdersDataProvider } from './data/types'
import type { RestaurantOrder } from './types'
import { createMockOrdersProvider } from './data/mock'
import { createOrdersStore } from './store'
import { ordersRegistries } from './registries'
import { ordersLocales } from './locales'
import { PluginSettingsPanel } from '@fayz-ai/saas'

const OrdersPage = React.lazy(() => import('./OrdersPage').then((m) => ({ default: m.OrdersPage })))

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface OrdersPluginLabels {
  pageTitle: string
  kanban: string
  newOrder: string
  orderList: string
}

const DEFAULT_LABELS: OrdersPluginLabels = {
  pageTitle: 'Orders',
  kanban: 'Orders',
  newOrder: 'New Order',
  orderList: 'History',
}

// ---------------------------------------------------------------------------
// Currency + sources
// ---------------------------------------------------------------------------

const DEFAULT_CURRENCY = { code: 'BRL', locale: 'pt-BR', symbol: 'R$' }

export interface OrderSourceOption {
  value: string
  label: string
  icon?: string
}

const DEFAULT_ORDER_SOURCES: OrderSourceOption[] = [
  { value: 'dine_in', label: 'Dine-in', icon: '🍽️' },
  { value: 'takeout', label: 'Takeout', icon: '🥡' },
]

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface OrdersPluginOptions {
  modules?: {
    delivery?: boolean
    takeout?: boolean
  }
  labels?: Partial<OrdersPluginLabels>
  currency?: { code?: string; locale?: string; symbol?: string }
  navPosition?: number
  navSection?: 'main' | 'secondary'
  scope?: PluginScope
  verticalId?: VerticalId
  dataProvider?: OrdersDataProvider
  menuItemLookup?: EntityLookup
  staffLookup?: EntityLookup
  onOrderCompleted?: (order: RestaurantOrder) => Promise<void>
  orderSources?: OrderSourceOption[]
}

// ---------------------------------------------------------------------------
// Config resolver
// ---------------------------------------------------------------------------

function resolveConfig(options?: OrdersPluginOptions) {
  return {
    modules: {
      delivery: options?.modules?.delivery !== false,
      takeout: options?.modules?.takeout !== false,
    },
    labels: { ...DEFAULT_LABELS, ...options?.labels } as any,
    currency: { ...DEFAULT_CURRENCY, ...options?.currency },
    orderSources: options?.orderSources ?? DEFAULT_ORDER_SOURCES,
    menuItemLookup: options?.menuItemLookup,
    staffLookup: options?.staffLookup,
    onOrderCompleted: options?.onOrderCompleted,
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOrdersPlugin(options?: OrdersPluginOptions): PluginManifest {
  const config = resolveConfig(options)
  const provider = options?.dataProvider ?? createMockOrdersProvider()
  const store = createOrdersStore(provider)

  const PageComponent: React.FC<any> = () =>
    React.createElement(React.Suspense, { fallback: null },
      React.createElement(OrdersPage, { config, provider, store, registries: ordersRegistries })
    )

  return {
    id: 'orders',
    name: config.labels.pageTitle,
    icon: 'ClipboardList',
    version: '1.0.0',
    scope: options?.scope ?? 'vertical',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    dependencies: ['menu'],
    navigation: [
      {
        section: options?.navSection ?? 'main',
        position: options?.navPosition ?? 2,
        label: config.labels.pageTitle,
        route: '/orders',
        icon: 'ClipboardList',
        permission: { feature: 'orders', action: 'read' as const },
      },
    ],
    routes: [
      {
        path: '/orders',
        component: PageComponent,
        permission: { feature: 'orders', action: 'read' as const },
      },
    ],
    widgets: [],
    aiTools: [
      {
        id: 'orders.today-summary',
        name: 'getOrdersSummary',
        description: 'Returns order count, revenue, and average ticket for today or a given period.',
        icon: 'ClipboardList',
        mode: 'read' as const,
        category: 'Orders',
        parameters: {
          type: 'object' as const,
          properties: {
            period: { type: 'string' as const, description: 'today, week, month' },
          },
        },
        suggestions: [
          { label: 'How many orders today?' },
          { label: "What's the average ticket today?" },
          { label: "What's the most ordered item?" },
        ],
      },
      {
        id: 'orders.active-orders',
        name: 'getActiveOrders',
        description: 'Lists currently active (non-completed) orders.',
        icon: 'Clock',
        mode: 'read' as const,
        category: 'Orders',
        parameters: {
          type: 'object' as const,
          properties: {
            kind: { type: 'string' as const, enum: ['dine_in', 'takeout', 'delivery'] },
            status: { type: 'string' as const, description: 'Filter by status' },
          },
        },
        suggestions: [
          { label: 'What orders are being prepared right now?' },
          { label: 'Any delivery orders waiting?' },
        ],
      },
      {
        id: 'orders.create-order',
        name: 'createOrder',
        description: 'Creates a new restaurant order with items.',
        icon: 'PlusCircle',
        mode: 'persist' as const,
        category: 'Orders',
        parameters: {
          type: 'object' as const,
          properties: {
            kind: { type: 'string' as const, enum: ['dine_in', 'takeout', 'delivery'] },
            tableNumber: { type: 'number' as const, description: 'Table number (for dine-in)' },
            items: { type: 'array' as const, description: 'Item names and quantities' },
          },
          required: ['kind', 'items'],
        },
        permission: { feature: 'orders', action: 'create' as const },
      },
    ],
    registries: ordersRegistries,
    settings: [
      {
        id: 'orders',
        label: config.labels.pageTitle,
        icon: 'ClipboardList',
        component: (() => {
          const OrdersSettingsTab: React.ComponentType<unknown> = () =>
            React.createElement(PluginSettingsPanel, {
              title: 'Orders Settings',
              subtitle: 'Order sources and preferences',
              registries: ordersRegistries,
              routeBase: '/settings/orders',
            })
          OrdersSettingsTab.displayName = 'OrdersSettingsTab'
          return OrdersSettingsTab
        })(),
        order: 22,
        permission: { feature: 'orders', action: 'read' as const },
      },
    ],
    locales: ordersLocales,
  }
}

export type { OrdersDataProvider } from './data/types'
export type { ResolvedOrdersConfig } from './OrdersContext'
