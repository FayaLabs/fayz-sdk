# @fayz-ai/plugin-crm

> Leads, deals, quotes, and pipeline — the sales spine for any Fayz SaaS.

[![npm](https://img.shields.io/npm/v/@fayz-ai/plugin-crm.svg)](https://www.npmjs.com/package/@fayz-ai/plugin-crm)
[![license](https://img.shields.io/npm/l/@fayz-ai/plugin-crm.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

**Status:** beta — pre-1.0. Core surface is stable; some backend facets (see `PLUGIN_PATTERNS.md`) are still landing. APIs may change before 1.0.

Every business that sells anything needs a way to track who's interested, what's in motion, and what's about to close. Most verticals end up rebuilding the same CRM badly. `plugin-crm` is the one sales engine — leads, a drag-style pipeline, deals, quotes, and activities — that snaps into a `defineSaas` app and adapts to the vertical underneath it.

A salon tracks "customers", a clinic tracks "patients", an agency tracks "clients" — same engine, different labels and stages. The plugin ships a full UI today, a vertical-aware label/stage/source config, AI tools your assistant can call, and a data-provider seam that runs on a mock or a Supabase backend. When a lead is approved it can convert a person into a real client record in your domain schema. This is what "compose a real SaaS from plugins" means in practice.

## What's inside
- A `/sales` workspace: dashboard, pipeline, leads (list + detail + form), deals, quotes (list + detail + form), and activities — toggle modules on or off
- Configurable lead sources, deal stages (name/color/probability), activity types, and item types
- Currency-aware quotes (defaults to BRL/pt-BR) with cross-plugin entity lookups for products/services and contacts
- Lead → client conversion that updates `persons.kind` and writes your extension table (e.g. `clients`)
- Dashboard widgets contributed to the app's overview
- AI tools: `countCustomers`, `listLeads` — with vertical-flavored suggested prompts
- A central Settings tab (general + pipeline) and full i18n
- Pluggable data: mock provider out of the box, Supabase provider when a client is registered

## Install
```bash
npm install @fayz-ai/plugin-crm
```
Peer deps: `@fayz-ai/core`, `@fayz-ai/ui`, `@fayz-ai/saas`, plus `react` / `react-dom`.

## Usage
```tsx
import { defineSaas } from '@fayz-ai/saas'
import { createCrmPlugin } from '@fayz-ai/plugin-crm'

export const app = defineSaas({
  // ...
  plugins: [
    createCrmPlugin({
      labels: { pageTitle: 'Sales', leads: 'Leads' },
      currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
      dealStages: [
        { name: 'New', color: '#64748b', probability: 10 },
        { name: 'Won', color: '#16a34a', probability: 100 },
      ],
      clientConversion: { archetypeKind: 'customer', extensionTable: 'clients', fkColumn: 'person_id' },
    }),
  ],
})
```

## Part of the Fayz SDK
The sales core of the engine. Pairs naturally with `plugin-marketing` (where the leads come from), `plugin-conversations` (where you talk to them), and `plugin-reputation` (what they say afterward).

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#plugin-crm) for current gaps, missing features, and good first issues.
