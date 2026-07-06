# @fayz-ai/plugin-shop

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `PLUGIN_PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> Drop a real storefront admin into any Fayz app — products, orders, customers, discounts.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-shop.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-shop)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-shop.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Every vertical eventually wants to sell something. A salon sells retail product, a restaurant sells gift cards, a clinic sells packages. `plugin-shop` is the e-commerce admin surface that snaps into that need — a catalog, orders, customers, and discounts — without making you rebuild Shopify from scratch.

It builds on the `@fayz-ai/shop` engine, so the data layer is real and pluggable. Wire it to your own backend with a `provider`, scope it to the active organization automatically, and let the host AI assistant query your catalog and orders out of the box. The philosophy: commerce is a plugin, not a platform — compose it alongside inventory, orders, and menu to make a real SaaS.

## What's inside
- **Navigation + page** — a `/shop` admin surface (products, orders, customers, discounts) rendered with `@fayz-ai/ui` data tables
- **Pluggable data** — inject a `ShopProvider` via `provider`, or fall back to the SDK runtime scoped to the active org
- **AI tools** — `listProducts` (filter by name/status) and `listOrders` (filter by financial/fulfillment status), with built-in prompt suggestions
- **Settings tab** — a Shop settings panel showing configured currency
- **Re-exported domain types** — `Product`, `Order`, `ShopCustomer`, `Discount`, `Category`, and their input types, so you only depend on this package

## Install
```bash
npm install @fayz-ai/plugin-shop
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, `@fayz-ai/shop` (+ react, react-dom).

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createShopPlugin } from '@fayz-ai/plugin-shop'

export const app = defineSaas({
  // ...
  plugins: [
    createShopPlugin({
      navLabel: 'Store',
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      // provider: myShopProvider, // optional — wire your own data access
    }),
  ],
})
```

Options: `navPosition`, `navSection`, `navLabel`, `scope`, `verticalId`, `currency`, `provider`.

## Part of the Fayz SDK
A composable plugin for the Fayz SDK. Pairs naturally with `@fayz-ai/plugin-orders`, `@fayz-ai/plugin-inventory`, and `@fayz-ai/plugin-menu` to build a full order-to-cash storefront.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-shop) for current gaps, missing features, and good first issues.
