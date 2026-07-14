# @fayz-ai/storefront

> Shopify-style customer-facing storefront, assembled from data — hero, products, cart, checkout, all themeable.

[![npm](https://img.shields.io/npm/v/@fayz-ai/storefront.svg)](https://www.npmjs.com/package/@fayz-ai/storefront)
[![license](https://img.shields.io/npm/l/@fayz-ai/storefront.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — published to npm and used across Fayz dogfood apps. Pre-1.0: minor APIs may change before 1.0.

`@fayz-ai/storefront` is the customer-facing surface of the Fayz SDK: a storefront scaffold that renders a page as a tree of **blocks** (hero, products, manifesto, cart, …) defined in the app manifest. Two completely different brands come out of the same template with zero custom components — the storefront is *data*, not a fork.

It reads commerce from `@fayz-ai/shop`, so the same engine powering an admin also powers the public store. Customize from labels to a fully bespoke section via the [customization ladder](../../docs/customization-ladder.md) — never by editing this package.

## What's inside
- **Scaffold** — `defineStorefront(config)` + `StorefrontScaffold` rendered by `renderApp`
- **Block system** — `registerStorefrontBlocks`, `sectionsToBlocks` (sections as registry blocks)
- **Factory path** — `createStorefrontApp`, `initStorefrontRuntime`, `StorefrontShell`
- **Routing** — hash router (`Link`, `navigateTo`, `useHashPath`, `matchPath`)
- **Config hook** — `useStorefrontConfig`

## Install
```bash
npm install @fayz-ai/storefront
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/shop`, `@fayz-ai/auth` (+ react, react-dom).

## Usage
```tsx
import { renderApp } from '@fayz-ai/core'
import { defineStorefront } from '@fayz-ai/storefront'

export function App() {
  return renderApp(defineStorefront(config), { surface: 'storefront' })
}
```

## Part of the Fayz SDK
The storefront surface over `@fayz-ai/shop`. The admin counterpart is built with `@fayz-ai/saas`; both are surfaces of one manifest.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md).
