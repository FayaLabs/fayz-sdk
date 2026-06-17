# @fayz-ai/plugin-orders

> A live order board for restaurants — kanban, history, and AI that knows what's cooking.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-orders.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-orders)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-orders.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Orders are the heartbeat of an operations business. `plugin-orders` gives a restaurant — or any food vertical — a real-time order board: dine-in, takeout, and delivery flowing across a kanban, with history behind it. It's the surface the floor staff actually live in.

It's built provider-first: a `MenuDataProvider`-aware orders flow that ships with a mock provider for instant demos and a `createFayzOrdersProvider` for real data. Order sources, currency, and labels are all configurable, and the host AI assistant can read today's summary, list active orders, and even create new ones. The point isn't a one-off POS — it's a plugin you snap into a `defineSaas` app next to menu and inventory to compose a complete restaurant SaaS.

## What's inside
- **Navigation + page** — an `/orders` surface with a kanban board (`OrderKanbanView`) and order history
- **Pluggable data** — inject an `OrdersDataProvider`, use `createFayzOrdersProvider`, or fall back to the bundled mock provider
- **Configurable order sources** — defaults to dine-in and takeout; delivery/takeout modules toggle on or off
- **AI tools** — `getOrdersSummary` (count, revenue, average ticket), `getActiveOrders` (filter by kind/status), and `createOrder` (persist a new order with items)
- **Settings + i18n** — a settings panel for order sources and preferences, plus bundled locales
- **Hooks** — `onOrderCompleted` callback, plus `menuItemLookup` / `staffLookup` entity lookups

## Install
```bash
npm install @fayz-ai/plugin-orders
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/saas`, `@fayz-ai/sdk` (+ react, react-dom). Declares a dependency on the `menu` plugin.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createOrdersPlugin, createFayzOrdersProvider } from '@fayz-ai/plugin-orders'

export const app = defineSaas({
  // ...
  plugins: [
    createOrdersPlugin({
      modules: { delivery: true, takeout: true },
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      dataProvider: createFayzOrdersProvider({ /* ... */ }),
      onOrderCompleted: async (order) => { /* fire a webhook, print, etc. */ },
    }),
  ],
})
```

Options: `modules`, `labels`, `currency`, `navPosition`, `navSection`, `scope`, `verticalId`, `dataProvider`, `menuItemLookup`, `staffLookup`, `onOrderCompleted`, `orderSources`.

## Part of the Fayz SDK
A composable plugin for the Fayz SDK. Depends on `@fayz-ai/plugin-menu` for items, and pairs with `@fayz-ai/plugin-inventory` and `@fayz-ai/plugin-shop` for a full food-to-cash flow.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-orders) for current gaps, missing features, and good first issues.
