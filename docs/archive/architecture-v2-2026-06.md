> **ARCHIVED 2026-07-06** — superseded by [ARCHITECTURE.md](../ARCHITECTURE.md). Historical reference only; do not follow operationally.

# Fayz SDK — Architecture v2: Manifest-First

> **Status:** Approved direction, v1 draft (2026-06-11). Supersedes the API shape described in `agent-guide.md`; complements `architecture-blueprint.md` (layer model, primitives, epics — still valid, referenced as **BP**).
> **Decision context:** nothing is deployed yet — this is the moment to refactor. This SDK will be the runtime for **all new fayz.ai projects**; the API locked here is the one we maintain for years.
> **Current consumers (retro-compat targets):** `shopfront` (Aurora Goods) · `tannat-store` · `pulse-store` · `beauty-saas` · `resto-saas`.

---

## 1. The decision in one paragraph

The app definition becomes **data** (`AppManifest`, pure JSON, versioned, stored by the platform), code becomes **registries** (named components, blocks, metrics, providers that manifests reference by id), and rendering becomes **scaffolds** (admin, storefront, portal — surfaces that interpret the same manifest). `createSaasApp()` and `createStorefrontApp()` survive as thin sugar that builds a manifest internally — but the manifest is the contract, the thing fayz.ai generates, edits, diffs, and migrates across thousands of apps. Customization is a **ladder, not a wall**: config → theme → block recomposition → slots → component overrides → custom pages → custom plugins, each level injectable per app without ejecting from the SDK.

**Why we're confident:** the storefront side already proves it. `tannat-store` and `pulse-store` are ~100 lines of *pure declarative config* — `home.sections` is already a serializable block array, and two completely different brands (wine/serif/burgundy vs sneakers/lime/black) came out of the same template with zero custom components. Architecture v2 generalizes that win to the SaaS side, where today's `App.tsx` is ~600 lines with closures (metric `compute` fns, lookups, React components in config) — the exact pattern that doesn't scale to a fleet.

---

## 2. The three artifacts

```
┌─────────────────────────────────────────────────────────────────┐
│  AppManifest (JSON — the app)                                   │
│  identity · surfaces · plugins+config · entities · pages/blocks │
│  theme · locale · permissions · billing · backend ref           │
│  → stored in fayz.ai DB, validated by JSON Schema, versioned    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ references by id
┌───────────────────────────▼─────────────────────────────────────┐
│  Registries (code — the escape hatches)                         │
│  components · blocks · metrics · pages · providers · aiTools    │
│  → SDK built-ins + plugin contributions + per-app custom code   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ interpreted by
┌───────────────────────────▼─────────────────────────────────────┐
│  Scaffolds (renderers — the surfaces)                           │
│  admin (SaaS shell) · storefront (Shopify-style) · portal       │
│  (share-token external actors, BP §4.4) · headless (MCP/agents) │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 AppManifest (sketch)

```jsonc
{
  "manifestVersion": 2,
  "id": "tannat",
  "name": "Tannat",
  "backend": { "provider": "supabase", "projectRef": "..." },   // or "mock"
  "locale": { "default": "pt-BR", "supported": ["pt-BR", "en"], "currency": "BRL" },
  "theme": { "extends": "sertao", "colors": { "brand": "hsl(350 45% 30%)" }, "font": { "heading": "Cormorant Garamond" } },

  "surfaces": {
    "storefront": {
      "announcement": "CLUBE TANNAT: 15% OFF COM O CUPOM TANNAT15",
      "pages": [
        { "path": "/", "blocks": [
          { "type": "hero", "variant": "banner", "slides": ["..."] },
          { "type": "manifesto", "text": "..." },
          { "type": "products", "filter": "new", "limit": 4 },
          { "type": "custom:tannat.wineStory" }                  // ← injected block, see §4
        ]},
        { "path": "/harmonizacao", "blocks": ["..."] }           // ← client-created page, pure data
      ],
      "footer": { "...": "..." }
    },
    "admin": {                                                    // same app can add an admin later
      "plugins": [
        { "id": "dashboard", "config": { "metrics": ["orders.today", "revenue.week"] } },
        { "id": "inventory", "config": { "modules": { "recipes": false } } }
      ],
      "pages": [
        { "path": "/clients", "entity": "tannat.client" },        // CRUD page from entity, data-only
        { "path": "/harvest", "component": "custom:tannat.HarvestBoard" }  // ← injected page, see §4
      ]
    }
  },

  "entities": [ /* EntityDef JSON — fields are already data; detailTabs reference component ids */ ],
  "permissions": { "profiles": ["..."] },
  "billing": { "plans": ["..."] }
}
```

Rules that make this work:

- **Everything in the manifest is JSON-serializable.** No functions, no component references — only ids resolved against registries.
- **JSON Schema published and versioned.** fayz.ai generates manifests against the schema; `fayz doctor` validates them; bad config fails at generation time, not at runtime in production.
- **`manifestVersion` + migration functions.** `fayz upgrade` migrates v2→v3 across the entire fleet as a data operation. This is the single biggest maintenance-cost decision in the project.

### 2.2 Registries

One mechanism, several namespaces. Plugin and SDK contributions are prefixed by plugin id; app-local code uses `custom:`.

```tsx
// src/registry.tsx — the ONLY app-side code file a customized app needs
import { registerBlock, registerPage, registerComponent, registerMetric } from '@fayz-ai/core'

registerBlock('tannat.wineStory', WineStorySection, { schema: wineStoryPropsSchema })
registerPage('tannat.HarvestBoard', HarvestBoardPage)
registerComponent('crud.detail-header', BrandedDetailHeader)        // override an SDK component (§4, level 5)
registerMetric('tannat.bottles-aging', { compute, format: 'number' })
```

- Every registration carries an optional **props JSON Schema** → fayz.ai can render a config UI for custom blocks, and the AI can fill props safely.
- Registries are introspectable at runtime (`listBlocks()`, `listComponents()`) → the platform always knows what an app can do.

### 2.3 Scaffolds

A scaffold = a renderer for one surface of the manifest. `admin` (today's SaaS shell), `storefront` (today's `@fayz-ai/storefront` — its template/section system is the proof-of-concept being generalized), `portal` (external actors over share tokens, BP §4.4), `headless` (no UI: the manifest + aiTools exposed as callable tools for fayz.ai agents/MCP).

**One app, N surfaces.** beauty-saas adds a `storefront` surface for public booking; tannat-store adds an `admin` surface for inventory. This is the unification of the product line: *every fayz app is one manifest with one or more surfaces*, instead of "SaaS apps" and "store apps" being different species.

---

## 3. The block system (generalized from storefront)

Storefront's `home.sections` becomes the SDK-wide **block** primitive:

- A **page is a block tree** (`blocks: BlockNode[]`), a block is `{ type, ...props, children? }`.
- Block types come from three sources: **SDK built-ins** (hero, products, table, kpi-grid, form, markdown…), **plugin contributions** (`agenda.week-view`, `crm.pipeline-board`, `shop.product-grid`), and **app-local custom blocks** (`custom:*`).
- Admin pages adopt blocks too: a dashboard is a block tree of metric/section blocks; a CRUD page is one `entity-table` block plus whatever the client composes around it. (Today's hardcoded admin pages become the default block trees the golden template ships with.)
- Blocks declare a **props schema** → editable in fayz.ai visually, fillable by AI, validatable in CI.

This is what makes "clients create new pages effortlessly" true: a new page in either surface is *data* — no build, no deploy, instantly previewable by the platform.

---

## 4. The customization ladder ("nada engessado")

The non-negotiable product requirement: defaults everywhere, dead-ends nowhere. Seven strictly
additive levels — **the single source of truth is [`customization-ladder.md`](./customization-ladder.md)**
(full table, artifacts, code/deploy requirements, and the design rules that keep the ladder honest).
Summary: 1 Config → 2 Theme → 3 Recompose → 4 Slots → 5 Override by registry id → 6 Custom
pages/components → 7 Custom plugin. Levels 1–4 are platform-editable (AI Builder edits the manifest
live); 5–7 are app code scoped to `registry.tsx` + own components; **no eject path by design** — an
eject need is an SDK gap to file.

---

## 5. Plugins under v2

`PluginManifest` (BP §2 L2-L4 placement rules unchanged) gets four additions:

1. `apiVersion` — runtime refuses/adapts incompatible plugins; the de-bridging from saas-core (BP §7) happens behind frozen `apiVersion: 1` contracts.
2. `blocks?: PluginBlockDefinition[]` — plugins contribute block types with props schemas (§3).
3. `componentIds?: string[]` — the plugin's enumerated override surface (§4 level 5).
4. **JSON-config only.** Plugin config in the manifest is data; anywhere today's `create*Plugin` accepts a function (lookups, `onBookingClick`, financial bridge) becomes either a **convention** (archetype lookups are derived from entities automatically), an **event subscription** (BP §4.1 event bus replaces the `window.dispatchEvent` hacks), or a **registry ref**.

The central plugin catalog stays npm (`fayz-plugin` keyword, BP §6 dependency graph); fayz.ai resolves ids → packages at build/provision time.

---

## 6. Retro-compat plan (the five apps)

Strategy: **compat shims now, codemods next, manifest-first golden path for everything new.** No app rewrite required on day one.

| App | Today | Step 1 (shim — zero app changes) | Step 2 (extract manifest) |
|---|---|---|---|
| shopfront (Aurora Goods) | `createStorefrontApp` 33-line config | factory builds manifest internally | trivially — config is already data; becomes the storefront golden template |
| tannat-store / pulse-store | same, ~100 LoC + catalog | same shim | `fayz extract` codemod: App.tsx+catalog.ts → `app.manifest.json` (catalog moves to backend seed); App.tsx shrinks to ~5 lines |
| beauty-saas | `createSaasApp`, ~600 LoC with closures | factory builds manifest; closures keep working via **deprecated** function-config path (warns in `fayz doctor`) | metrics → metric registry ids; custom dashboard sections → `custom:` blocks; placeholders deleted (SDK provides settings); becomes the admin golden template |
| resto-saas | same as beauty-saas | same | same — and serves as the **dual-consumer validation** (BP §8) for the migration itself |

Compat guarantees: `createSaasApp(config)` / `createStorefrontApp(config)` signatures keep working through v2.x (sugar over `defineApp`); function-style config is deprecated-but-functional for one minor-version window, with `fayz doctor` reporting exactly which config entries block manifest extraction.

---

## 7. Platform machinery (locked alongside the manifest)

- **CLI** (currently empty — required before the first generated project): `fayz create <template>` · `fayz doctor` · `fayz extract` (code→manifest codemod) · `fayz migrate` (DB, with per-project recorded state) · `fayz upgrade` (manifest version migrations).
- **Diagnostics contract:** structured boot report (plugins resolved, missing RPCs/views, pending migrations, locale coverage) — replaces silent fallbacks (the `get_tenant_active_plugins` 404 anti-pattern) and feeds fayz.ai fleet telemetry.
- **Conformance kit:** plugin/app test harness — manifest schema validation, mock-provider smoke run, i18n key completeness (en + pt-BR), block props schema checks. CI for the SDK builds one app **against published artifacts** (not Vite aliases — that path is currently never exercised).
- **What gets locked (and nothing else):** AppManifest JSON Schema · PluginManifest + `apiVersion` · `create*` sugar signatures · `EntityDef`/`FieldDef` · `DataProvider` · registry API · block node shape. Implementations behind these de-bridge and evolve freely.

---

## 8. Sequencing

| # | Epic | Contents | Validates with |
|---|---|---|---|
| 1 | **Manifest core** | `AppManifest` types + JSON Schema, `defineApp`, registries, `manifestVersion` runner; `create*` become sugar | shopfront (config is already data) |
| 2 | **Block system** | generalize storefront sections → SDK blocks; plugin block contributions; admin pages as block trees | tannat + pulse via `fayz extract` |
| 3 | **De-functionalize plugin config** | lookups-by-convention, event bus (BP §4.1) replaces bridges, metric registry (BP §4.5) | beauty-saas migration |
| 4 | **Override registry + ladder docs** | enumerate component ids across `@fayz-ai/ui` + plugins; typed override props | one real custom page in resto-saas |
| 5 | **CLI + golden templates + conformance** | `fayz create/doctor/extract/migrate/upgrade`; admin + storefront templates from the migrated apps | a brand-new generated app, end-to-end |
| 6 | **De-bridge saas-core** (BP §7, parallel from #3) | behind frozen `apiVersion: 1` | resto-saas dual-consumer rule |

Phase 1–2 are the point of no return on the API — review the JSON Schema hard there. Everything after is implementation behind locked contracts.

---

## 9. What this buys (the test of every decision above)

1. fayz.ai stores, edits, diffs, and regenerates apps as **rows, not repos**.
2. SDK upgrades across 1,000 apps = **one schema migration**, not 1,000 PRs.
3. AI generation emits **schema-validated JSON**, not TypeScript — radically lower defect rate.
4. Clients customize from label to fully bespoke page **without ever forking SDK code**.
5. The same manifest serves admin, storefront, portal, and headless agents — ecommerce and SaaS stop being separate products and become **surfaces of one platform**.
