import React, { createContext, useContext } from 'react'
import type { ShopProvider, MockShopSeed } from '@fayz/shop'
import type { StorefrontTheme } from './theme'
import type { HomeConfig, NavLink, FooterConfig } from './sections'
import type { StorefrontAuthAdapter } from './auth'

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
  /** Connect a real Supabase project. Omit both for mock mode. */
  supabaseUrl?: string
  supabaseAnonKey?: string
  /** Explicit provider override (tests, custom backends) */
  provider?: ShopProvider
  /** Per-store mock catalog (products/categories/discounts) for mock mode */
  catalog?: MockShopSeed
  /** Customer auth — same AuthAdapter contract as createSaasApp. Default: mock. */
  auth?: { adapter?: StorefrontAuthAdapter }
  /** Shipping pricing — default { flatRate: 0 } */
  shipping?: { flatRate?: number; freeAbove?: number }
  /** Feature toggles — default both true */
  features?: { discounts?: boolean; accounts?: boolean }
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
      discounts: config.features?.discounts ?? true,
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
