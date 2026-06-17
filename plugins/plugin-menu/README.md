# @fayz-ai/plugin-menu

> The menu engine behind every food vertical — items, categories, modifiers, 86'd in one tap.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-menu.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-menu)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-menu.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

A menu is the product catalog of a food business — and it changes by the hour. `plugin-menu` is the management surface for that: items, categories, allergens, and modifiers, with sold-out toggles that take effect instantly. It's the foundation the orders flow reads from, so the two compose into a working restaurant.

It's provider-first by design. Ship a demo on the bundled mock provider, then drop in `createFayzMenuProvider` (or your own `MenuDataProvider`) for real data. Modifiers and delivery pricing are opt-in modules, labels and currency are configurable, and the host AI can list items and flip availability by name. The intent: menu management shouldn't be a bespoke build — it's a plugin you snap into a `defineSaas` app to compose a real food SaaS.

## What's inside
- **Navigation + page** — a `/menu` surface with a menu manager (`MenuManagerView`) for items and categories
- **Pluggable data** — inject a `MenuDataProvider`, use `createFayzMenuProvider`, or fall back to the bundled mock provider
- **Opt-in modules** — `modifiers` (on by default) and `deliveryPricing` (off by default)
- **AI tools** — `listMenuItems` (filter by category/status) and `toggleMenuItemAvailability` (mark available or sold out by name)
- **Settings + i18n** — a settings panel for categories, allergens, and modifiers, plus bundled locales
- **Public domain types** — exported so any host can implement its own `MenuDataProvider`

## Install
```bash
npm install @fayz-ai/plugin-menu
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, `@fayz-ai/sdk` (+ react, react-dom).

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createMenuPlugin, createFayzMenuProvider } from '@fayz-ai/plugin-menu'

export const app = defineSaas({
  // ...
  plugins: [
    createMenuPlugin({
      modules: { modifiers: true, deliveryPricing: false },
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      dataProvider: createFayzMenuProvider({ /* ... */ }),
    }),
  ],
})
```

Options: `modules`, `labels`, `currency`, `navPosition`, `navSection`, `scope`, `verticalId`, `dataProvider`, `menuItemLookup`.

## Part of the Fayz SDK
A composable plugin for the Fayz SDK. The catalog `@fayz-ai/plugin-orders` reads from — pair both with `@fayz-ai/plugin-inventory` to tie menu items back to stock.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-menu) for current gaps, missing features, and good first issues.
