# Fayz SDK — Architecture Boundaries (the contract)

> **Status:** Canonical boundary contract (2026-06-19, FAY-1217). This is the single source of truth for *who owns what*. Companions: `architecture-v2.md` (manifest-first design), `customization-ladder.md` (how an app customizes without forking), `../PLUGIN_PATTERNS.md` (plugin anatomy).

## The promise we are locking

> A user starts from a ready-made vertical product, customizes most of it instantly with AI, extends deeper business behavior through safe modules/hooks/config, and **still keeps the app upgradeable** as Fayz improves the platform.

The mechanism that makes this true is a strict **ownership boundary**: code is partitioned into four layers, each with a different owner, a different change cadence, and a different blast radius. Upgrades stay safe because no layer reaches into another except through a published contract.

---

## 1. The four ownership layers

| Layer | Owner | What lives here | Changed by | Upgrade-safe because |
|---|---|---|---|---|
| **A. Generated app** | the customer's app repo | pages, routes, layout, theme, copy, local components, `app.manifest.json` / `defineApp` config, app-specific workflows, **app-local incubator plugins** | AI Builder (config) + app devs (code in `src/`) | never imports SDK internals; only depends on the published surface (§3) |
| **B. Plugin config** | the manifest (data) | enabled modules, fields, statuses, rules, feature flags, surface options, labels, currency | AI Builder, live, no code | pure JSON validated against schema; migrated by `manifestVersion` runner |
| **C. Private extension / module** | the customer/partner | custom business rules, reports, importers, server actions, workflows, UI slots, custom fields — packaged as an **app-local plugin** implementing the same `PluginManifest` contract | partner devs (e.g. Silvio) | extends via the contract; **never edits shared plugin internals**; promotable to layer D (§5 of `private-plugins.md`) |
| **D. Fayz SDK / plugins** | Fayz | reusable engines, provider authority, security, tenancy, migrations, diagnostics, registries, the customization ladder, upgrade paths | Fayz only | versioned packages with `apiVersion`-gated contracts; implementations de-bridge freely behind them |

**The load-bearing rule:** layers A, B, C may only depend on layer D through its **published contract** — the package surface (§3), the registries, the `PluginManifest` seams, and the data-provider boundary. They never fork an SDK page, copy plugin internals, or reach a provider SDK directly.

### Where each layer lives in code

- **A — manifest + registries:** `AppManifest` type and JSON Schema in [`packages/core/src/manifest`](../packages/core/src/manifest); `defineApp`/`renderApp` in [`packages/core/src/app/render.tsx`](../packages/core/src/app/render.tsx); the override registries (`registerComponent/Block/Page/Metric`, the `custom:` namespace guard `isCustomId`) in [`packages/core/src/registry`](../packages/core/src/registry), all re-exported from `@fayz-ai/core`.
- **B — plugin config:** `PluginRef.config` carried in the manifest; resolved by each plugin's factory.
- **C — private plugins:** proven by [`beauty-saas/src/plugins/openbanking`](../../fayz-app/beauty-saas/src/plugins/openbanking) and [`resto-saas/src/restaurant`](../../fayz-app/resto-saas/src/restaurant) — app-local plugins that inject their own data providers and never touch SDK internals. See `private-plugins.md`.
- **D — SDK engines:** `PluginManifest` + runtime in [`packages/core/src/types/plugins.ts`](../packages/core/src/types/plugins.ts); event bus in [`packages/core/src/events`](../packages/core/src/events); connector spine in [`packages/core/src/integrations`](../packages/core/src/integrations); the provider boundary `getSupabaseClientOptional()` in [`packages/core/src/data/supabase.ts`](../packages/core/src/data/supabase.ts).

---

## 2. The customization ladder (how layer A/C grow without forking)

Customization is a **ramp, not a wall** — seven additive levels, fully specified in `customization-ladder.md`:

1. **Config** → 2. **Theme** → 3. **Recompose blocks** → 4. **Slots** → 5. **Override a component by registry id** → 6. **Custom pages/blocks (`custom:`)** → 7. **Custom plugin**.

Levels 1–4 are platform-editable (AI Builder edits the manifest live). Levels 5–7 are app code, but scoped to `src/registry.tsx` + your own components/plugins — **never forks of SDK pages**. There is no eject path by design: if a customer needs to eject, that is an SDK gap to file, not a supported workflow.

---

## 3. The supported public package surface

> **Decision (FAY-1217):** Fayz ships a **multi-package** public surface — not a single `@fayz-ai/sdk` facade. We do not add *new* packages to satisfy a customization; we keep the existing consumed packages public, versioned, and documented. `supported-surface.json` is the machine-readable source of truth (and what `fayz doctor` checks against).

A generated app (layer A) may depend on these and only these:

| Package | Role | Tier |
|---|---|---|
| `@fayz-ai/sdk` | API client, app params, runtime broker, shared types | stable |
| `@fayz-ai/core` | manifest, registries, entities, data providers, plugin runtime, events, integrations, i18n, router | stable |
| `@fayz-ai/saas` | multi-tenancy, billing, permissions, CRUD engine, plugin context helpers | stable |
| `@fayz-ai/ui` | UI primitives, layout shells, CRUD/dashboard components, theme | stable |
| `@fayz-ai/auth` | auth helpers | stable |
| `@fayz-ai/db` | shared DB types/helpers | stable |
| `@fayz-ai/storefront` | storefront scaffold + sections | stable |
| `@fayz-ai/shop` | shop/checkout engine | stable |
| `@fayz-ai/plugin-*` | à-la-carte vertical capabilities; install only what the app enables | stable |

Everything **not** in `supported-surface.json` is internal: subpaths into `…/src/internal`, undocumented deep imports, and packages without a published, semver-tracked version. `fayz doctor` warns when an app depends on something outside this list.

> `@fayz-ai/app-runtime` (the umbrella re-export) is **deprecated** — it is `private`, unused by any app, and redundant under the multi-package model. Do not adopt it; it will be removed.

---

## 4. The provider-access rule

> **App talks to Fayz; Fayz talks to providers.**

- Generated apps and plugins **must not** import provider SDKs directly (`@supabase/supabase-js`, `mercadopago`, `stripe`, `googleapis`, Bling, Tecnospeed, …). They obtain backend access through Fayz-owned boundaries: `getSupabaseClientOptional()` / the `DataProvider` interface (`@fayz-ai/core`), and the **connector spine** (`packages/core/src/integrations`) — a control plane (UI/settings) plus a data plane (Supabase Edge Functions) that holds provider credentials server-side.
- **Deliberate adapter exception:** an app-local plugin (layer C) *may* own a connector + Edge Function for a provider Fayz doesn't yet support (e.g. beauty-saas's Tecnospeed PlugBank). This is sanctioned because the credential stays server-side and the app still calls *its own* boundary, not the provider from the browser. Such exceptions are declared, not casual, and are candidates for promotion into an official connector (§5 of `private-plugins.md`).

`fayz doctor` warns on any direct provider-SDK import that is not a declared adapter.

---

## 5. Plugin extension seams

A plugin (layer C or D) extends the platform through the `PluginManifest` seams — never by editing another plugin or the SDK. The seams (see `../PLUGIN_PATTERNS.md` and `packages/core/src/types/plugins.ts`):

`config` · `events` (typed event bus) · `widgets` (UI slots / `WidgetZone`) · `routes` · `navigation` · `settings` · `dashboardWidgets` · `aiTools` · `connectors` · `migrations` · `customFields` · `serverActions` · `diagnostics` · `apiVersion`.

A private plugin can do everything an official plugin can — there is nothing an SDK plugin can do that a client plugin can't. That symmetry is what makes the promotion path (private → official) a packaging move, not a rewrite.

---

## 6. Enforcement model

> **Decision (FAY-1217):** Enforcement is **soft** — visibility, not build-failures. The boundaries are convention + `fayz doctor` diagnostics, to protect partner/Silvio DX.

`fayz doctor` reports (as warnings) — never fails a build:
- direct provider-SDK imports outside declared adapters (§4),
- imports of SDK internals / packages outside the supported surface (§3),
- manifest/plugin contract violations, missing RPCs/views, pending migrations, locale gaps (the structured boot report).

Hard CI gates are intentionally **not** part of this contract today; revisit if drift proves costly.

---

## 7. Consciously deferred

- **Operator / Fayz-Panel surface (FAY-1217 criterion 2):** *deferred.* Operator/platform controls live in the separate `fayz` platform repo (three-repo topology). The manifest does **not** model an `operator` surface yet; product UX stays in the generated app. Revisit when Fayz Panel is built.
- **AI Builder request classifier:** the classifier itself lives in the `fayz` platform repo. This repo publishes only the *taxonomy contract* it targets — see `ai-builder-request-taxonomy.md`.
