> **ARCHIVED 2026-07-06** — superseded by [CUSTOMIZATION.md](../CUSTOMIZATION.md). Historical reference only; do not follow operationally.

# Private plugins — the partner / Silvio extension path

> How a partner or customer adds **real business behaviour** to a Fayz app without editing SDK or shared-plugin internals — and how that work graduates into an official plugin. This is layer C in `architecture-boundaries.md`.

## When you need this

The [customization ladder](customization-ladder.md) covers levels 1–6 (config → theme → recompose → slots → overrides → custom pages). When a customization is a **reusable capability** — its own entities, data, migrations, navigation, AI tools — it's a **plugin**, level 7. A private plugin is an *app-local* plugin: it lives in the app repo under `src/plugins/<name>/` and implements the same `PluginManifest` contract as every official `@fayz-ai/plugin-*`.

The rule that makes this safe: **a private plugin can do everything an official plugin can.** There is nothing an SDK plugin can do that a client plugin can't — so a partner is never blocked, and promotion (below) is a packaging move, not a rewrite.

## Scaffold one

```bash
fayz create plugin loyalty
```

generates `src/plugins/loyalty/` with the full contract shape:

```
src/plugins/loyalty/
  index.ts          createLoyaltyPlugin(options) → PluginManifest; provider seam
  data/types.ts     domain types + LoyaltyDataProvider contract
  data/mock.ts      createMockLoyaltyProvider() — ship a demo instantly
  data/supabase.ts  createSupabaseLoyaltyProvider() — real data via the Fayz boundary
  schema/index.ts   migrations placeholder (wire into manifest.migrations)
  README.md         graduation checklist
```

Then add it to your app config:

```ts
import { createLoyaltyPlugin } from './plugins/loyalty'

plugins: [ /* …existing… */ createLoyaltyPlugin() ]
```

## The two proven references

These app-local plugins ship today and are the templates to copy:

- **`beauty-saas/src/plugins/openbanking`** — a connector + Edge Function for Tecnospeed PlugBank, declared as an *addon* into the financial plugin's settings. The deliberate-adapter exception in action: credentials stay server-side; the app calls its own boundary.
- **`resto-saas/src/restaurant`** — menu/orders/tables that own their DB layer (schema + migrations + a real Supabase provider) and inject it into the SDK plugin UI via the `dataProvider` seam (no UI duplication).

## The rules (what keeps upgrades safe)

1. Extend through `PluginManifest` seams only — never edit SDK or another plugin's internals. Seams: config, events, widgets, settings, routes, navigation, dashboardWidgets, aiTools, connectors, migrations, serverActions, customFields, diagnostics (see `../PLUGIN_PATTERNS.md`).
2. Go through the Fayz provider boundary — `getSupabaseClientOptional()` / a connector, never `@supabase/supabase-js` directly. A provider Fayz doesn't support yet is a sanctioned *adapter* (own connector + Edge Function), server-side.
3. Run `fayz doctor` — it warns on any boundary slip.

## Graduation: private → official `@fayz-ai/plugin-*`

When the same private plugin proves useful across apps, promote it. The checklist (also emitted in each scaffold's README):

- [ ] Manifest passes `assertPluginManifestContract` (`@fayz-ai/core/testing`)
- [ ] A capability test proves the data slice end-to-end on the mock provider
- [ ] Migrations live in `schema/` **and** are wired into `migrations: [...]`
- [ ] Permissions declared (deny-by-default in multi-tenant)
- [ ] i18n complete (en + pt-BR)
- [ ] `fayz doctor` clean (no direct provider imports)
- [ ] Move the folder to `fayz-sdk/plugins/plugin-<name>/src/` — **the manifest and behaviour are unchanged**

That last line is the whole point of the symmetry: graduation is a move + publish, because the private plugin was already built to the official contract.
