# @fayz-ai/plugin-inventory

> Stock that actually ties to your business — products, movements, recipes, and low-stock alerts.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-inventory.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-inventory)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-inventory.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — pre-1.0. Core surface is stable; some backend facets (see `PLUGIN_PATTERNS.md`) are still landing. APIs may change before 1.0.

Inventory is the universal organ — a salon counts product, a restaurant counts ingredients, a clinic counts supplies. `plugin-inventory` is that organ as a plugin: a product catalog, stock entry/exit/history, optional recipes (bill of materials), and a dashboard that surfaces stock value and what's running low. It's `scope: universal`, so it snaps into any vertical.

It ships real data out of the box: a Supabase provider with an automatic mock fallback, so a fresh app demos immediately and a configured one persists for real. Recipes, stock locations, and batch tracking are opt-in modules; product types, currency, and labels are configurable. The host dashboard gets inventory KPI widgets, and the AI assistant can answer "what's running low?" The intent: stop rebuilding stock control per app — compose it from one plugin into a real SaaS.

## What's inside
- **Navigation + page** — an `/inventory` surface: product catalog, stock entry/exit, movement history, and recipes
- **Real data, zero setup** — a Supabase provider that safely falls back to a mock provider, or inject your own `InventoryDataProvider`
- **Dashboard widgets** — stock-value KPI (headline on the home), plus total-products, low-stock, out-of-stock KPIs and a recent-activity panel
- **Opt-in modules** — `recipes` and `stockLocations` (on by default), `batchTracking` (off by default)
- **AI tool** — `getLowStock` (products below minimum threshold), with vertical-aware prompt suggestions
- **Declared features, settings + i18n** — registers `inventory` (and `inventory.recipes`) features, a general settings tab, and bundled locales

## Install
```bash
npm install @fayz-ai/plugin-inventory
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas` (+ react, react-dom).

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createInventoryPlugin } from '@fayz-ai/plugin-inventory'

export const app = defineSaas({
  // ...
  plugins: [
    createInventoryPlugin({
      modules: { recipes: true, stockLocations: true, batchTracking: false },
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      locations: [{ id: 'hq', name: 'Main', isHQ: true }],
      // dataProvider: myProvider, // optional — defaults to Supabase + mock fallback
    }),
  ],
})
```

Options: `modules`, `labels`, `productTypes`, `currency`, `navPosition`, `navSection`, `scope`, `verticalId`, `dataProvider`, `locations`.

## Part of the Fayz SDK
A composable, universal plugin for the Fayz SDK. Underpins `@fayz-ai/plugin-menu` recipes and `@fayz-ai/plugin-shop` stock — pair them for a full order-to-cash picture.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-inventory) for current gaps, missing features, and good first issues.
