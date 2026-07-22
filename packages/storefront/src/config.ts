import React, { createContext, useContext } from 'react'
import type { ShopProvider } from '@fayz-ai/shop/provider'
import type { MockShopSeed } from '@fayz-ai/shop/mock'
import type { PaymentMethodKind } from '@fayz-ai/shop/types'
import type { StorefrontTheme } from './theme'
import type { HomeConfig, NavLink, FooterConfig } from './sections'
import type { StorefrontAuthConfig } from './auth'
import type { StorefrontComponents } from './component-contracts'

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
export type StorefrontCommerceMode = 'checkout' | 'catalog' | 'enquiry'
export type StorefrontImageLoadingMode = 'fade' | 'none'

export interface StorefrontImageLoadingConfig {
  mode?: StorefrontImageLoadingMode
  durationMs?: number
  easing?: string
  blur?: boolean
}

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

export interface StorefrontDiscountConfig {
  code: string
  percent: number
  title?: string
}

export interface StorefrontEnquiryConfig {
  label?: string
  successMessage?: string
  subjectPrefix?: string
  email?: string
  whatsappUrl?: string
  requirePhone?: boolean
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
  /** Checkout-first default, catalog-only browsing, or product enquiry flow. */
  commerceMode?: StorefrontCommerceMode
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
  /**
   * Institutional/legal page content (privacy, terms, returns). Plain text —
   * blank lines separate paragraphs. Unset pages render a placeholder so the
   * routes (and footer links) exist even before the store writes its policy.
   */
  legal?: { privacy?: string; terms?: string; returns?: string }
  /** Customer auth — same AuthAdapter contract as createSaasApp. Default: mock. */
  auth?: StorefrontAuthConfig
  /** Shipping pricing — default { flatRate: 0 } */
  shipping?: { flatRate?: number; freeAbove?: number }
  /**
   * Payment behavior. v1 default 'mock' instantly marks orders paid with NO
   * real charge (demo). M4 sets 'pix-mercadopago' so orders stay pending until
   * a real payment webhook confirms settlement.
   */
  payments?: {
    mode?: 'mock' | 'pix-mercadopago'
    /**
     * Which methods the checkout offers. Declaring them is what lets the order
     * record how the buyer intends to pay instead of assuming 'credit_card',
     * which is what it did while the card form was a simulation.
     */
    methods?: readonly PaymentMethodKind[]
  }
  /** Product enquiry behavior for catalog/enquiry stores. */
  enquiry?: StorefrontEnquiryConfig
  /** Feature toggles — defaults depend on commerceMode. */
  features?: { discounts?: boolean; accounts?: boolean; cart?: boolean; checkout?: boolean }
  /** Global storefront image reveal behavior. Default is a soft fade. */
  imageLoading?: StorefrontImageLoadingConfig
  /** Code-level component replacements. Kept out of serialized manifests. */
  components?: StorefrontComponents
  /** Code-level route overrides/custom routes. Kept out of serialized manifests. */
  routes?: readonly StorefrontRouteDefinition[]
}

export interface ResolvedStorefrontConfig extends StorefrontConfig {
  currency: string
  locale: string
  shipping: { flatRate: number; freeAbove?: number }
  payments: { mode: 'mock' | 'pix-mercadopago'; methods: readonly PaymentMethodKind[] }
  commerceMode: StorefrontCommerceMode
  enquiry: Required<Pick<StorefrontEnquiryConfig, 'label' | 'successMessage' | 'subjectPrefix'>> &
    Omit<StorefrontEnquiryConfig, 'label' | 'successMessage' | 'subjectPrefix'>
  features: { discounts: boolean; accounts: boolean; cart: boolean; checkout: boolean }
  imageLoading: Required<StorefrontImageLoadingConfig>
  /** Where the full product list lives ('/' without a home page, '/catalog' with one) */
  catalogPath: string
  nav: NavLink[]
}

export function resolveConfig(config: StorefrontConfig): ResolvedStorefrontConfig {
  const catalogPath = config.home ? '/catalog' : '/'
  const commerceMode = config.commerceMode ?? 'checkout'
  const checkoutEnabled = commerceMode === 'checkout'
  return {
    ...config,
    currency: config.currency ?? 'BRL',
    locale: config.locale ?? 'pt-BR',
    shipping: { flatRate: config.shipping?.flatRate ?? 0, freeAbove: config.shipping?.freeAbove },
    payments: {
      mode: config.payments?.mode ?? 'mock',
      methods: config.payments?.methods?.length ? config.payments.methods : ['pix', 'credit_card', 'cash'],
    },
    commerceMode,
    enquiry: {
      label: config.enquiry?.label ?? 'Contact me',
      successMessage: config.enquiry?.successMessage ?? 'Thanks. We received your enquiry.',
      subjectPrefix: config.enquiry?.subjectPrefix ?? 'Product enquiry',
      email: config.enquiry?.email,
      whatsappUrl: config.enquiry?.whatsappUrl,
      requirePhone: config.enquiry?.requirePhone,
    },
    features: {
      // Auto-enable the coupon UI when the store actually ships discount codes
      // (via config.discounts or a seeded catalog), unless explicitly overridden —
      // otherwise a store can advertise a coupon with no field to enter it.
      discounts:
        config.features?.discounts ??
        Boolean(config.discounts?.length || config.catalog?.discounts?.length),
      accounts: config.features?.accounts ?? checkoutEnabled,
      cart: config.features?.cart ?? checkoutEnabled,
      checkout: config.features?.checkout ?? checkoutEnabled,
    },
    imageLoading: {
      mode: config.imageLoading?.mode ?? 'fade',
      durationMs: config.imageLoading?.durationMs ?? 420,
      easing: config.imageLoading?.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)',
      blur: config.imageLoading?.blur ?? true,
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

export function useStorefrontConfigOptional(): ResolvedStorefrontConfig | null {
  return useContext(StorefrontConfigContext)
}

export function getStorefrontComponents(config: ResolvedStorefrontConfig): StorefrontComponents {
  return config.components ?? {}
}
