# @fayz-ai/ui

> Radix + Tailwind primitives, a CRUD engine, and the admin shell every Fayz app wears.

[![npm](https://img.shields.io/npm/v/@fayz-ai/ui.svg)](https://www.npmjs.com/package/@fayz-ai/ui)
[![license](https://img.shields.io/npm/l/@fayz-ai/ui.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

A composed Fayz app needs to look like one product, not a pile of plugins. `@fayz-ai/ui` is the design layer that makes that true: accessible Radix-backed primitives, a data table, layout shells (app shell, sidebar, module pages), a themeable token system, and a dashboard widget kit that plugins contribute KPIs, charts, and tables into. Salon, restaurant, clinic — same shell, same widgets, different brand.

The philosophy: plugins describe behavior, the UI renders it consistently. Define a KPI widget once and it lands in the dashboard grid with layout, ranges, and customization already wired. Drop in `AppShell` and `Sidebar` and the navigation a plugin declared just appears.

## What's inside
- **Primitives** — Button, Input, Badge, Card, Modal, Sheet, Dropdown, Select, Tabs, Tooltip, Popover, `DataTable` (TanStack), Checkbox, DatePicker, TimePicker, SearchSelect, CurrencyInput, ConfirmDialog, SegmentedControl, toast (`sonner`)
- **Layout** — `AppShell`, `Sidebar`, `Topbar`, `ModulePage`, `SubpageHeader`, `SaveBar`, page transitions, and the module header/back-button slots
- **Dashboard kit** — `DashboardCanvas`, `WidgetGrid`, `DashboardGrid`, range controls, and `defineKpiWidget` / `defineChartWidget` / `defineTableWidget` / `defineOnboardingWidget` / `defineCustomWidget` with `KpiCard`, `ChartWidget`, `TableWidget`
- **Theme** — `ThemeProvider`, `useTheme`, `createFayzTheme`, `fayzThemePresets`, light/dark tokens
- **Stores + utils** — `useLayoutStore`, `useThemeStore`, `cn`, Avatar

## Install
```bash
npm install @fayz-ai/ui
```
Peer deps: `react`, `react-dom` (^18/^19), `tailwindcss` (^3.4). Import `@fayz-ai/ui/styles.css`.

## Usage
```tsx
import { Button, KpiCard, defineKpiWidget } from '@fayz-ai/ui'
import '@fayz-ai/ui/styles.css'

export const revenueWidget = defineKpiWidget({
  id: 'revenue',
  title: 'Revenue',
  value: { format: 'currency', amount: 12400, currency: 'BRL' },
})

export function Demo() {
  return <Button variant="default">Save</Button>
}
```

## Part of the Fayz SDK
The presentation layer on top of `@fayz-ai/core`; the admin surface in `@fayz-ai/saas` is built from it.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#ui) for current gaps, missing features, and good first issues.
