# @fayz-ai/plugin-sites

> **Status: experimental (incubating).** Not capability-complete — missing some or all of the capability bar (data-provider contract w/ supabase+mock pair, entity registries, settings, migrations; see `docs/PLUGIN-PATTERNS.md`). Fine to explore in dogfoods; NOT ready for fresh installs or generated apps, and its API may change without notice.

> Websites, funnels, and landing pages — built into the same app as your CRM.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-sites.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-sites)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-sites.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Most teams duct-tape a page builder onto a separate CRM and pray the leads sync. plugin-sites is the GoHighLevel "Sites" surface, native to your Fayz app: funnels, landing pages, and full websites that capture leads straight into the same tenant your pipeline lives in. No webhooks, no Zapier, no copy-paste.

This is an early surface and we're honest about it. M1 ships a polished `/sites` home — a real, navigable view of funnels and landing pages with visits and conversion stats — to lock the UX and the data shape. The drag-and-drop block builder (from architecture-v2) and public-facing rendered pages land in a later milestone.

## What's inside
- **`/sites` route + nav entry** (icon `LayoutTemplate`), permission-gated on `sites:read`
- **Sites home view** — funnels, websites, and landing pages with status, visits, and conversion stats
- **Universal scope** — works in any vertical (beauty, food, health, services, retail)
- **Configurable nav** — `navPosition`, `navSection`, `navLabel`
- **Declared feature** — `sites` ("Sites & Funnels", in the "Convert" group) for permissions and feature gating

> Status: M1 mock home. The page builder and published-page surfaces are on the roadmap.

## Install
```bash
npm install @fayz-ai/plugin-sites
```
Peer deps: `react`, `react-dom`. Runtime deps: `@fayz-ai/core`, `@fayz-ai/ui`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createSitesPlugin } from '@fayz-ai/plugin-sites'

export const app = defineSaas({
  // ...
  plugins: [
    createSitesPlugin({
      navLabel: 'Sites',
      navPosition: 7,
    }),
  ],
})
```

## Part of the Fayz SDK
One of the composable plugins for `@fayz-ai/saas` — this one owns the convert surface: funnels, landing pages, and websites.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-sites) for current gaps, missing features, and good first issues.
