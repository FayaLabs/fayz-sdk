import { createElement, type FC, type ReactNode } from 'react'
import type { PluginManifest, PluginScope, PaymentProvider } from '@fayz-ai/core'
import { createMockPaymentProvider, type MockPaymentOptions } from '../data/mock'
import { PaymentProviderContext, type PaymentContextValue } from './context'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-payments/public — website payment surface.
//
// Returns a { manifest, Provider, paymentProvider } bundle mirroring the other
// website plugins. The host injects `paymentProvider` into the booking plugin;
// the Provider/hooks are for a future standalone checkout page. No routes — a
// payment is a service, not a screen.
// ---------------------------------------------------------------------------

export interface PublicPaymentOptions {
  /** Currency for charges (informational; charges carry their own). */
  currency?: string
  /** Inject a custom provider (real gateway). Overrides the safe resolver. */
  paymentProvider?: PaymentProvider
  /** Tuning for the mock provider (auto-pay/expiry) when no real provider is set. */
  mock?: MockPaymentOptions
  scope?: PluginScope
}

export interface PublicPaymentPlugin {
  manifest: PluginManifest
  Provider: FC<{ children: ReactNode }>
  paymentProvider: PaymentProvider
}

export function createPublicPaymentPlugin(options?: PublicPaymentOptions): PublicPaymentPlugin {
  // Default is the MOCK provider even when a Supabase client is configured:
  // the Supabase payment path is still a stub (real gateway = MercadoPago edge
  // fn, deferred), so a real provider must be injected explicitly via
  // `paymentProvider`. Don't route through createSafePaymentProvider here or
  // any app with a configured Supabase client would hit the throwing stub.
  const paymentProvider = options?.paymentProvider ?? createMockPaymentProvider(options?.mock)

  const value: PaymentContextValue = { provider: paymentProvider }
  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(PaymentProviderContext, { value, children })
  Provider.displayName = 'PaymentPluginProvider'

  const manifest: PluginManifest = {
    id: 'payments',
    name: 'Pagamentos',
    icon: 'CreditCard',
    version: '0.1.0',
    scope: options?.scope ?? 'universal',
    scaffolds: ['website', 'landing_page'],
    defaultEnabled: true,
    dependencies: [],
    navigation: [],
    routes: [],
    widgets: [],
  }

  return { manifest, Provider, paymentProvider }
}
