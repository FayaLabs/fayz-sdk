import React from 'react'
import { setGlobalSupabaseClient } from '@fayz/core'
import { setShopProvider, createMockShopProvider } from '@fayz/shop'
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
 * Declarative storefront factory — the customer-facing counterpart of
 * createSaasApp. Returns a ready-to-mount React component.
 *
 *   const App = createStorefrontApp({ name: 'Aurora Goods', currency: 'BRL' })
 *
 * Provider resolution: explicit `provider` > Supabase credentials > mock.
 */
export function createStorefrontApp(config: StorefrontConfig): React.ComponentType {
  const resolved = resolveConfig(config)

  // Customer auth runs on the same AuthAdapter contract as createSaasApp —
  // mock by default, Supabase when configured, custom adapters accepted.
  initCustomerAuth(
    resolveAuthAdapter(config.auth?.adapter, {
      url: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
    }),
  )

  if (config.provider) {
    setShopProvider(config.provider)
  } else if (config.catalog && !(config.supabaseUrl && config.supabaseAnonKey)) {
    // Store-specific mock catalog (wine shop ≠ sneaker shop)
    setShopProvider(createMockShopProvider(config.catalog))
  } else if (config.supabaseUrl && config.supabaseAnonKey) {
    // Host app may already have initialized the global client; this is idempotent.
    import('@supabase/supabase-js')
      .then(({ createClient }) => {
        setGlobalSupabaseClient(createClient(config.supabaseUrl!, config.supabaseAnonKey!))
      })
      .catch(() => {
        /* @supabase/supabase-js not installed — getShopProvider falls back to mock */
      })
  }

  function StorefrontApp() {
    return (
      <StorefrontConfigProvider value={resolved}>
        {config.theme && <StorefrontThemeStyle theme={config.theme} />}
        <div className="min-h-screen bg-background text-foreground">
          <StorefrontHeader />
          <RouteSwitch />
          <CartDrawer />
          <StorefrontFooter />
        </div>
      </StorefrontConfigProvider>
    )
  }
  StorefrontApp.displayName = 'StorefrontApp'
  return StorefrontApp
}
