# @fayz-ai/plugin-financial

> Order-to-cash for your SaaS — invoices, payables, cash, and commissions in one plugin.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-financial.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-financial)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-financial.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — pre-1.0. Core surface is stable; some backend facets (see `PLUGIN_PATTERNS.md`) are still landing. APIs may change before 1.0.

Most vertical SaaS bolts on finance as an afterthought: a "total" field, a spreadsheet export, and a prayer. `plugin-financial` makes money a first-class part of the app. It models the full order-to-cash loop — receivables, payables, cash registers, statements, card reconciliation, and commission rules — as composable modules you toggle per business.

It's built to be the financial spine other plugins lean on. Agenda creates orders against it, reports read from it, and the dashboard surfaces balance, cash flow, and overdue alerts without bespoke glue. Every module is optional, every label and currency is configurable, and item lines can resolve products and services from other plugins via entity lookups. Compose a real, money-aware SaaS instead of stitching one together.

## What's inside
- **Financial page** (`/financial`) — summary, accounts receivable & payable (with recurring), cash registers, statements, commissions (overview + rules), and cards (overview + reconciliation).
- **Invoice flow** — list, detail, and form views with configurable item types (service / product / other) and optional service-execution tracking.
- **Dashboard widgets** — total-balance / receivable / payable KPIs, a cash-flow chart, breakdown and overdue-alert panels, and a recent-transactions table.
- **AI tools** — `getRevenue`, `createInvoice`, `listPayables` for natural-language finance.
- **Cross-plugin hooks** — `entityLookups` and `contactLookup` to wire product/service/contact selectors, plus `onBookingClick` to jump from an invoice back to its booking.
- `createSafeFinancialProvider` (Supabase-or-mock) so the same provider can back both the plugin and a cross-plugin bridge; settings tab and i18n included.

## Install
```bash
npm install @fayz-ai/plugin-financial
```
Peer deps: `react`, `react-dom`. Runtime deps include `@fayz-ai/core`, `@fayz-ai/ui`, and `@fayz-ai/saas`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createFinancialPlugin } from '@fayz-ai/plugin-financial'

export const app = defineSaas({
  // ...
  plugins: [
    createFinancialPlugin({
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      modules: { commissions: true, cards: false },
      itemTypes: [
        { value: 'service', label: 'Service', icon: 'Briefcase' },
        { value: 'product', label: 'Product', icon: 'Package' },
      ],
    }),
  ],
})
```

## Part of the Fayz SDK
`plugin-financial` is the money layer of the SDK. It pairs with `@fayz-ai/plugin-agenda` (bookings auto-create orders via the financial bridge) and feeds `@fayz-ai/plugin-reports` for revenue and commission reporting.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-financial) for current gaps, missing features, and good first issues.
