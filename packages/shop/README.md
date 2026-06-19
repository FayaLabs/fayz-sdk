# @fayz-ai/shop

> The commerce layer behind every Fayz storefront — products, orders, customers, discounts, shipping.

[![npm](https://img.shields.io/npm/v/@fayz-ai/shop.svg)](https://www.npmjs.com/package/@fayz-ai/shop)
[![license](https://img.shields.io/npm/l/@fayz-ai/shop.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

`@fayz-ai/shop` is the headless ecommerce engine: a `ShopProvider` contract plus the domain types for products, carts, orders, customers, discounts, and shipping. It owns *what commerce means* so the storefront (`@fayz-ai/storefront`) and admin surfaces only have to render it.

It's provider-first by design. Ship a demo on `createMockShopProvider`, then drop in `createSupabaseShopProvider` (or your own `ShopProvider`) for real data — the UI doesn't change. Tenancy is resolved through a pluggable resolver, so the same engine serves one store or a marketplace of thousands.

## What's inside
- **`ShopProvider` contract** — the one interface every backend implements
- **Providers** — `createMockShopProvider` (demo/offline) and `createSupabaseShopProvider` (real)
- **Runtime** — `getShopProvider` / `setShopProvider` singleton wiring
- **Tenancy** — `setShopTenantResolver` / `getShopTenantId` for multi-store isolation
- **Public domain types** — products, orders, customers, discounts, shipping

## Install
```bash
npm install @fayz-ai/shop
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/auth` (+ react, react-dom).

## Usage
```ts
import { setShopProvider, createSupabaseShopProvider } from '@fayz-ai/shop'

setShopProvider(createSupabaseShopProvider({ /* supabase + storeId */ }))
```

## Part of the Fayz SDK
The commerce engine `@fayz-ai/storefront` renders and `@fayz-ai/plugin-shop` administers. Pair with `@fayz-ai/sdk`'s shop client for generated storefronts.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md).
