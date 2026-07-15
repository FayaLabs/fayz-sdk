# @fayz-ai/plugin-payments

## 0.1.1

### Patch Changes

- Release-channel sync / dependency updates alongside the storefront + website-plugin release.

## 0.1.0

### Initial release

- `PaymentProvider` abstraction for Pix charges: `createSafePaymentProvider()` resolves a real gateway when configured, else a mock; `createMockPaymentProvider()` / `createSupabasePaymentProvider()` exported directly.
- Working Pix mock: generates a BR code, auto-pays after a configurable delay and expires after a window, so charge-status polling is realistic end-to-end.
- Public payment surface at `@fayz-ai/plugin-payments/public`: `createPublicPaymentPlugin()` returns `{ manifest, Provider, paymentProvider }`, plus `usePixCharge`, `useChargeStatus`, and `PaymentProviderContext` / `usePaymentContext`.
- `createSupabasePaymentProvider()` ships as a deferred stub (throws) until the Supabase/MercadoPago gateway is implemented.
