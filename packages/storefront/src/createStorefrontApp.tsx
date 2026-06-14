import React from 'react'
import { setShopProvider } from '@fayz-ai/shop/runtime'
import { createMockShopProvider } from '@fayz-ai/shop/mock'
import { initCustomerAuth, resolveAuthAdapter } from './auth'
import { StorefrontConfigProvider, resolveConfig, useStorefrontConfig } from './config'
import type { StorefrontConfig } from './config'
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

function RouteSwitch() {
  const config = useStorefrontConfig()
  const path = useHashPath()

  const product = matchPath('/product/:slug', path)
  if (product?.slug) return <ProductDetailPage slug={product.slug} />

  const order = matchPath('/order/:id', path)
  if (order?.id) return <OrderConfirmationPage orderId={order.id} />

  if (matchPath('/checkout', path)) return <CheckoutPage />
  if (matchPath('/account', path)) return <MyPurchasesPage />
  if (matchPath('/catalog', path)) return <CatalogPage />

  if (config.home) return <HomePage sections={config.home.sections} />
  return <CatalogPage />
}

/**
 * Side-effect runtime init shared by the factory and the manifest scaffold:
 * wires customer auth and the shop provider. Idempotent and safe to call once
 * before first render. Provider resolution: explicit > catalog mock > empty mock.
 */
export function initStorefrontRuntime(config: StorefrontConfig): void {
  initCustomerAuth(resolveAuthAdapter(config.auth?.adapter))

  if (config.provider) {
    setShopProvider(config.provider)
  } else if (config.catalog) {
    setShopProvider(createMockShopProvider(config.catalog))
  } else {
    setShopProvider(createMockShopProvider())
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      {config.theme && <StorefrontThemeStyle theme={config.theme} />}
      <StorefrontHeader />
      <RouteSwitch />
      <CartDrawer />
      <StorefrontFooter />
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
