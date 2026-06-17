# @fayz-ai/plugin-reports

> Config-driven reports for your SaaS — declare the report, get the page.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-reports.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-reports)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-reports.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Every business eventually asks the same thing: "show me the numbers." `plugin-reports` answers it without a BI bolt-on. You declare reports as data — columns, filters, date ranges, badges, and a data source — and the plugin renders a searchable report hub plus a filterable, exportable viewer. No per-report UI, no copy-pasted tables.

It's the read layer of the SDK: point it at the same data the rest of your app already writes, and any vertical gets analysis and decision-support out of the box. Date presets, currency formatting, and CSV/Excel/PDF export ship by default; the reports themselves are just config, so adding one is an array entry, not a new screen.

## What's inside
- **Reports page** (`/reports`) — a report hub that lists and searches your declared reports, plus a viewer for a single report.
- **Declarative report defs** — `ReportDef` with columns, filters, date ranges, badges, and a data source; reports are passed in as options.
- **Date presets** — today, yesterday, last 7 days, this/last month, this quarter, and custom ranges.
- **Export** — CSV, Excel, and PDF, with print support.
- **Configurable** — labels, currency, default page size, and header visibility.
- Supabase-or-mock data provider, with `createSupabaseReportProvider` / `createMockReportProvider` exported for custom wiring; i18n built in.

## Install
```bash
npm install @fayz-ai/plugin-reports
```
Peer deps: `react`, `react-dom`. Runtime deps include `@fayz-ai/core`, `@fayz-ai/ui`, and `@fayz-ai/saas`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createReportsPlugin } from '@fayz-ai/plugin-reports'

export const app = defineSaas({
  // ...
  plugins: [
    createReportsPlugin({
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      defaultPageSize: 50,
      reports: [
        {
          id: 'revenue-by-day',
          title: 'Revenue by Day',
          // columns, filters, dataSource, ...
        },
      ],
    }),
  ],
})
```

## Part of the Fayz SDK
`plugin-reports` is the analytics surface of the SDK. It naturally reads from `@fayz-ai/plugin-financial` (revenue, commissions) and `@fayz-ai/plugin-agenda` (bookings, occupancy) to turn operational data into reports.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-reports) for current gaps, missing features, and good first issues.
