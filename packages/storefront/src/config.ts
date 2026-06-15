import React, { createContext, useContext } from 'react'
import type { Product } from '@fayz-ai/shop/types'
import type { ShopProvider } from '@fayz-ai/shop/provider'
import type { MockShopSeed } from '@fayz-ai/shop/mock'
import type { StorefrontTheme } from './theme'
import type { HomeConfig, NavLink, FooterConfig } from './sections'
import type { StorefrontAuthAdapter } from './auth'

export interface ProductCardSlotProps {
  product: Product
}

export type StorefrontRouteKind =
  | 'home'
  | 'catalog'
  | 'product'
  | 'checkout'
  | 'account'
  | 'order'
  | 'custom'

export type StorefrontRouteParams = Record<string, string>

export interface StorefrontRouteComponentProps {
  path: string
  params: StorefrontRouteParams
  config: ResolvedStorefrontConfig
}

export type StorefrontRouteChrome = 'default' | 'focused'

export interface StorefrontRouteDefinition {
  /**
   * Stable identifier for generated-code diffs, QA reports, and route ownership.
   */
  id: string
  /**
   * Hash route pattern. Supports the same params as matchPath, e.g. '/checkout'
   * or '/collections/:slug'. Custom routes are matched before SDK defaults.
   */
  path: string
  /**
   * Intent label for agents and manifests. It does not change matching behavior.
   */
  kind?: StorefrontRouteKind
  /**
   * Shell chrome for the route. `focused` hides storefront nav/footer/cart
   * around high-intent flows such as checkout.
   */
  chrome?: StorefrontRouteChrome
  /**
   * App-owned screen/workflow that can still use storefront/shop primitives.
   */
  component: React.ComponentType<StorefrontRouteComponentProps>
}

export interface StorefrontSlots {
  /**
   * Product card renderer used by catalog grids and product rails.
   *
   * Custom renderers must preserve `productCardSlotContract` selectors so
   * checkout smoke tests, QA, and agents can still operate the storefront.
   */
  ProductCard?: React.ComponentType<ProductCardSlotProps>
}

export interface StorefrontDiscountConfig {
  code: string
  percent: number
  title?: string
}

export interface StorefrontConfig {
  /** Store display name (header, page title) */
  name: string
  /** Optional logo node; defaults to the store name */
  logo?: React.ReactNode
  /** ISO 4217 — default 'BRL' */
  currency?: string
  /** Intl locale for money/date formatting — default 'pt-BR' */
  locale?: string
  /** Visual identity: colors, fonts, radius, header/card personality */
  theme?: StorefrontTheme
  /** Promo message above the header (e.g. 'FRETE GRÁTIS ACIMA DE R$ 300') */
  announcement?: string
  /** Home page blueprint. When set, `/` renders it and the catalog moves to /catalog. */
  home?: HomeConfig
  /** Header nav links — defaults derived from home/catalog routing */
  nav?: NavLink[]
  /** Footer content (about text, contact, social) */
  footer?: FooterConfig
  /** Preferred backend descriptor for manifest/scaffold metadata. */
  backend?: { provider?: 'mock' | 'fayz-api' | 'fayz-shop' | 'custom'; url?: string }
  /** @deprecated Use backend/provider adapters. Storefront no longer creates Supabase clients. */
  supabaseUrl?: string
  /** @deprecated Use backend/provider adapters. Storefront no longer creates Supabase clients. */
  supabaseAnonKey?: string
  /** Explicit provider override (tests, custom backends) */
  provider?: ShopProvider
  /** Per-store mock catalog (products/categories/discounts) for mock mode */
  catalog?: MockShopSeed
  /** Store-level discount codes available regardless of provider backend. */
  discounts?: StorefrontDiscountConfig[]
  /** Customer auth — same AuthAdapter contract as createSaasApp. Default: mock. */
  auth?: { adapter?: StorefrontAuthAdapter }
  /** Shipping pricing — default { flatRate: 0 } */
  shipping?: { flatRate?: number; freeAbove?: number }
  /** Feature toggles — discounts default off; accounts default on */
  features?: { discounts?: boolean; accounts?: boolean }
  /** Code-level customization slots. Kept out of serialized manifests. */
  slots?: StorefrontSlots
  /** Code-level route overrides/custom routes. Kept out of serialized manifests. */
  routes?: StorefrontRouteDefinition[]
}

export interface ResolvedStorefrontConfig extends StorefrontConfig {
  currency: string
  locale: string
  shipping: { flatRate: number; freeAbove?: number }
  features: { discounts: boolean; accounts: boolean }
  /** Where the full product list lives ('/' without a home page, '/catalog' with one) */
  catalogPath: string
  nav: NavLink[]
}

export function resolveConfig(config: StorefrontConfig): ResolvedStorefrontConfig {
  const catalogPath = config.home ? '/catalog' : '/'
  return {
    ...config,
    currency: config.currency ?? 'BRL',
    locale: config.locale ?? 'pt-BR',
    shipping: { flatRate: config.shipping?.flatRate ?? 0, freeAbove: config.shipping?.freeAbove },
    features: {
      discounts: config.features?.discounts ?? false,
      accounts: config.features?.accounts ?? true,
    },
    catalogPath,
    nav:
      config.nav ??
      (config.home
        ? [
            { label: 'Início', to: '/' },
            { label: 'Loja', to: '/catalog' },
          ]
        : [{ label: 'Loja', to: '/' }]),
  }
}

const StorefrontConfigContext = createContext<ResolvedStorefrontConfig | null>(null)

export const StorefrontConfigProvider = StorefrontConfigContext.Provider

export function useStorefrontConfig(): ResolvedStorefrontConfig {
  const ctx = useContext(StorefrontConfigContext)
  if (!ctx) throw new Error('useStorefrontConfig must be used inside createStorefrontApp')
  return ctx
}
