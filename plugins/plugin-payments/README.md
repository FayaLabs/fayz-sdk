# @fayz-ai/plugin-payments

> A Pix charge provider (and website payment surface) for Fayz apps and storefronts.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-payments.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-payments)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-payments.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** early / beta — pre-1.0. Ships a working Pix **mock** provider plus React hooks and a public payment surface; the real gateway (Supabase / MercadoPago) is deferred and not yet implemented — apps run on the mock until a gateway is wired. APIs may change before 1.0.

Taking money is the one thing every commerce build cannot fake, and in Brazil that means Pix. `plugin-payments` gives Fayz apps a single `PaymentProvider` abstraction for Pix charges — create a charge, get a QR / copy-paste code, poll its status — behind the same safe mock/real resolver used across the SDK. Build and demo the whole checkout flow today on the mock; swap in a real gateway later without touching the UI.

## What's inside
- **Payment provider** — `createSafePaymentProvider()` resolves a real gateway when configured, else `createMockPaymentProvider()`; `PaymentProvider` / `PixCharge` / `CreateChargeInput` / `ChargeStatus` types re-exported from `@fayz-ai/core`
- **Working mock** — generates a Pix BR code, auto-pays after a configurable delay (default 6s) and expires after a window (default 5min), so status polling is realistic
- **Public payment surface** (`@fayz-ai/plugin-payments/public`) — `createPublicPaymentPlugin(options)` returns `{ manifest, Provider, paymentProvider }`, plus `usePixCharge`, `useChargeStatus`, and `PaymentProviderContext` / `usePaymentContext`
- **Deferred real provider** — `createSupabasePaymentProvider()` is a stub that throws until the Supabase/MercadoPago gateway lands

## Install
```bash
npm install @fayz-ai/plugin-payments
```
Runtime dep: `@fayz-ai/core`. The `./public` subpath additionally needs `react` / `react-dom`.

## Usage
```ts
// Headless: a charge provider anywhere
import { createSafePaymentProvider } from '@fayz-ai/plugin-payments'

const payments = createSafePaymentProvider()
const charge = await payments.createCharge({ amount: 49.9, currency: 'BRL', orderId: 'abc' })
// charge.pixCopyPaste, charge.pixQrCode, then poll payments.getChargeStatus(charge.chargeId)
```

```tsx
// Website surface: the payment plugin bundle
import { createPublicPaymentPlugin } from '@fayz-ai/plugin-payments/public'

const paymentPlugin = createPublicPaymentPlugin({ currency: 'BRL' })
// wrap your checkout tree in <paymentPlugin.Provider> and use usePixCharge()/useChargeStatus()
```

## Part of the Fayz SDK
The money seam. Feeds the storefront/checkout surfaces and pairs with `@fayz-ai/plugin-orders` and `@fayz-ai/plugin-shop`; composes alongside `@fayz-ai/plugin-blog` in bespoke website builds.
