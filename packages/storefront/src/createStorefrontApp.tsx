import React from 'react'
import { setShopProvider } from '@fayz-ai/shop/runtime'
import { createMockShopProvider } from '@fayz-ai/shop/mock'
import type { MockShopSeed } from '@fayz-ai/shop/mock'
import type { Discount } from '@fayz-ai/shop/types'
import type { ShopProvider } from '@fayz-ai/shop/provider'
import { initCustomerAuth, resolveAuthAdapter } from './auth'
import { getStorefrontComponents, StorefrontConfigProvider, resolveConfig, useStorefrontConfig } from './config'
import type { StorefrontConfig, StorefrontDiscountConfig } from './config'
import type { StorefrontComponents } from './component-contracts'
import type { StorefrontSection } from './sections'
import { useHashPath, matchPath } from './router'
import { StorefrontThemeStyle } from './theme'
import { StorefrontHeader } from './components/StorefrontHeader'
import { StorefrontFooter } from './components/StorefrontFooter'
import { CartDrawer } from './components/CartDrawer'
import { CatalogPage } from './pages/CatalogPage'
import { HomePage } from './pages/HomePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { MyPurchasesPage } from './pages/MyPurchasesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PolicyPage } from './pages/PolicyPage'
import { StorefrontErrorBoundary } from './components/StorefrontErrorBoundary'
import { Toaster } from './components/Toaster'

function getCustomRouteMatch(config: ReturnType<typeof useStorefrontConfig>, path: string) {
  for (const route of config.routes ?? []) {
    const params = matchPath(route.path, path)
    if (params) return { route, params }
  }
  return null
}

function isFocusedRoute(config: ReturnType<typeof useStorefrontConfig>, path: string): boolean {
  const custom = getCustomRouteMatch(config, path)
  if (custom) return custom.route.chrome === 'focused' || custom.route.kind === 'checkout'
  return Boolean(matchPath('/checkout', path))
}

function RouteSwitch({ path }: { path: string }) {
  const config = useStorefrontConfig()

  const custom = getCustomRouteMatch(config, path)
  if (custom) {
    const CustomRoute = custom.route.component
    return <CustomRoute path={path} params={custom.params} config={config} />
  }

  const product = matchPath('/product/:slug', path)
  if (product?.slug) return <ProductDetailPage slug={product.slug} />

  const order = matchPath('/order/:id', path)
  if (order?.id) return <OrderConfirmationPage orderId={order.id} />

  if (matchPath('/checkout', path) && config.features.checkout) return <CheckoutPage />
  if (matchPath('/account', path) && config.features.accounts) return <MyPurchasesPage />
  if (matchPath('/catalog', path)) return <CatalogPage />
  if (matchPath('/privacy', path)) return <PolicyPage kind="privacy" />
  if (matchPath('/terms', path)) return <PolicyPage kind="terms" />
  if (matchPath('/refunds', path)) return <PolicyPage kind="returns" />

  // Root renders home (or catalog when there's no home). Any other unmatched
  // path is a genuine 404 — don't silently fall back to the storefront.
  if (path === '/' || path === '') {
    return config.home ? <HomePage sections={config.home.sections} /> : <CatalogPage />
  }
  return <NotFoundPage />
}

/**
 * Side-effect runtime init shared by the factory and the manifest scaffold:
 * wires customer auth and the shop provider. Idempotent and safe to call once
 * before first render. Provider resolution: explicit > catalog mock > empty mock.
 */
/**
 * config.discounts are simple {code, percent} entries the UI validator trusts
 * (useDiscountValidator). They must ALSO be seeded into the provider, or
 * placeOrder won't find the code server-side and will charge full price — the
 * shopper sees a discounted total but is billed the undiscounted one.
 */
function storefrontDiscountToSeed(discount: StorefrontDiscountConfig): Discount {
  const ts = new Date().toISOString()
  return {
    id: `cfg-discount-${discount.code.trim().toLowerCase()}`,
    tenantId: 'mock',
    title: discount.title ?? `${discount.percent}% off`,
    code: discount.code.trim().toUpperCase(),
    type: 'percentage',
    method: 'code',
    value: discount.percent,
    usageLimit: null,
    oncePerCustomer: false,
    startsAt: ts,
    endsAt: null,
    status: 'active',
    timesUsed: 0,
    createdAt: ts,
    updatedAt: ts,
  }
}

function buildMockSeed(config: StorefrontConfig): MockShopSeed | undefined {
  const configDiscounts = (config.discounts ?? []).map(storefrontDiscountToSeed)
  if (!config.catalog && configDiscounts.length === 0) return undefined
  // Config-level codes win over catalog seeds sharing the same code.
  const catalogDiscounts = (config.catalog?.discounts ?? []).filter(
    (cd) => !configDiscounts.some((cfg) => (cd.code ?? '').toUpperCase() === cfg.code),
  )
  return {
    ...config.catalog,
    discounts: [...catalogDiscounts, ...configDiscounts],
  }
}

export function initStorefrontRuntime(config: StorefrontConfig): void {
  if (resolveConfig(config).features.accounts) {
    initCustomerAuth(resolveAuthAdapter(config.auth, {
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    }))
  }

  if (config.provider) {
    setShopProvider(config.provider)
  } else {
    setShopProvider(createMockShopProvider(buildMockSeed(config)))
  }

  if (config.supabaseUrl || config.supabaseAnonKey) {
    console.warn(
      '@fayz-ai/shop: supabaseUrl/supabaseAnonKey are legacy fields. Pass an explicit provider/adapter or use the Fayz SDK broker path.',
    )
  }
}

/** The inner storefront UI. Reads everything from the config context, so it is
 *  shared by createStorefrontApp and the manifest-driven StorefrontScaffold. */
export function StorefrontShell() {
  const config = useStorefrontConfig()
  const path = useHashPath()
  const focused = isFocusedRoute(config, path)
  const components = getStorefrontComponents(config)
  const chromeProps = { config, commerceMode: config.commerceMode }
  const body = (
    <>
      {config.theme && <StorefrontThemeStyle theme={config.theme} />}
      {!focused &&
        (components.Header ? <components.Header {...chromeProps} /> : <StorefrontHeader />)}
      <StorefrontErrorBoundary key={path}>
        <RouteSwitch path={path} />
      </StorefrontErrorBoundary>
      {!focused && config.features.cart && <CartDrawer />}
      {!focused &&
        (components.Footer ? <components.Footer {...chromeProps} /> : <StorefrontFooter />)}
      <Toaster />
    </>
  )

  if (components.Shell) {
    return (
      <components.Shell {...chromeProps}>
        {body}
      </components.Shell>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {body}
    </div>
  )
}

/**
 * Declarative storefront factory — the customer-facing counterpart of
 * createSaasApp. Sugar over the manifest path: it is equivalent to
 * renderApp(defineStorefront(config)), sharing initStorefrontRuntime +
 * StorefrontShell with the scaffold.
 *
 *   const App = createStorefrontApp({ name: 'Aurora Goods', currency: 'BRL' })
 */
export function createStorefrontApp(config: StorefrontConfig): React.ComponentType {
  const resolved = resolveConfig(config)
  initStorefrontRuntime(config)

  function StorefrontApp() {
    return (
      <StorefrontConfigProvider value={resolved}>
        <StorefrontShell />
      </StorefrontConfigProvider>
    )
  }
  StorefrontApp.displayName = 'StorefrontApp'
  return StorefrontApp
}

export interface CreateStorefrontOptions {
  config: StorefrontConfig
  provider?: ShopProvider
  components?: StorefrontComponents
  routes?: StorefrontConfig['routes']
  pages?: StorefrontConfig['routes']
  sections?: readonly StorefrontSection[]
}

export function createStorefront(options: CreateStorefrontOptions): React.ComponentType {
  const routes = [...(options.pages ?? []), ...(options.routes ?? [])]
  const config: StorefrontConfig = {
    ...options.config,
    provider: options.provider ?? options.config.provider,
    components: {
      ...options.config.components,
      ...options.components,
    },
    routes: routes.length > 0 ? routes : options.config.routes,
    home: options.sections
      ? { ...(options.config.home ?? { sections: [] }), sections: options.sections }
      : options.config.home,
  }

  return createStorefrontApp(config)
}
