# @fayz-ai/plugin-dashboard

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `docs/PLUGIN-PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> One composable home where every plugin renders its own widgets.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-dashboard.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-dashboard)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-dashboard.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

A SaaS home page is never owned by one team. Bookings wants today's agenda, finance wants revenue, the shop wants top products. The usual outcome is one god-component that imports everything and rots. This plugin kills that. It provides the `/` home surface and a **widget registry**: every plugin contributes its own `dashboardWidgets`, and the dashboard renders, orders, and lays them out into a single coherent grid — no plugin needs to know any other plugin exists.

That's the whole bet of the Fayz SDK at the home screen. Enable booking + finance + shop and the home fills itself out. The app author curates — which widgets show, order, span, an optional shared time-range — and each plugin owns its own data. Compose a real SaaS home from plugins instead of maintaining a dashboard by hand.

## What's inside
- The `/` home **surface** rendered by `DashboardCanvas`, driven entirely by the widget registry
- KPI metrics with async `compute`, trends, goals, and currency formatting (`metrics` → KPI cards)
- Custom app sections, an onboarding/getting-started checklist, and app-contributed `customWidgets`
- App-level `layout` curation on top of every plugin's registered defaults — visibility, order, span
- An optional shared, sticky `range` control (7d/30d/90d) that widgets read via `useDashboardRange()`
- An `getKpiSummary` AI tool so an assistant can answer "how is my business doing today?"
- Per-surface user preferences (show/hide/reorder), persisted, plus full i18n

## Install
```bash
npm install @fayz-ai/plugin-dashboard
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui` (+ `react`, `react-dom`).

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createDashboardPlugin } from '@fayz-ai/plugin-dashboard'

export const app = defineSaas({
  // ...
  plugins: [
    createDashboardPlugin({
      metrics: [
        { id: 'revenue', label: 'Revenue', icon: 'DollarSign', format: 'currency', compute: getRevenue },
      ],
      currency: { code: 'BRL', locale: 'pt-BR' },
      onboardingSteps: [
        { id: 'connect-payments', label: 'Connect payments', done: false },
      ],
      range: true, // shared 7d/30d/90d time-range on the home
    }),
    // other plugins contribute their own widgets into this same home
  ],
})
```
Other plugins just ship `dashboardWidgets` in their manifest — they land on this surface automatically. Use `defineKpiWidget` / `defineChartWidget` / `defineTableWidget` from `@fayz-ai/ui` to build them.

## Part of the Fayz SDK
The home surface and widget registry that the rest of the Fayz plugins render into.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-dashboard) for current gaps, missing features, and good first issues.
