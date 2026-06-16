# STATE — Where the Fayz platform actually is

> Authoritative audit snapshot. **2026-06-16.** Supersedes `_archive/08-current-codebase-findings.md`.
> Evidence-based; every claim below was read from source across the three repos.
> Companion docs: [PLUGIN-MODEL.md](PLUGIN-MODEL.md) (the curated-vs-flexible answer), [ROADMAP.md](ROADMAP.md) (gaps + next 2 weeks).

---

## 0. The single most important correction

Fayz is **further along than it feels from inside `fayz-sdk`.** The reason it feels unfinished is that the platform is spread across **three repos**, and the most impressive half — the AI builder, the control plane, and a *working* plugin marketplace — lives in a repo (`/Users/fayalabs/dev/fayz`) that you rarely open while doing plugin work.

The anxiety ("I can't lock it and scale to thousands of apps") is not because the foundation is missing. It is because **one seam is half-wired**: the join between _"marketplace install flips a manifest flag"_ and _"the installed plugin actually delivers governed data + permissions + schema in the generated app."_ Close that seam and the skyscraper has its foundation. Everything else is depth, not structure.

---

## 1. The three repos (the real topology)

```
/Users/fayalabs/dev/
├── fayz/        ← THE PLATFORM / CONTROL PLANE  (internal name: @wowsome/*)
│                  AI builder, project lifecycle, container pool, publish,
│                  plugin marketplace UI, ProjectAppManifest store + resolver.
│                  Consumes @fayz-ai/sdk. NOT published.
│
├── fayz-sdk/    ← THE SDK + CAPABILITY ENGINES  (this repo, @fayz-ai/*)
│                  10 packages + 18 plugins + scaffolding CLI.
│                  Only @fayz-ai/sdk is public npm. Everything else private/internal.
│
└── fayz-app/    ← DOGFOOD / DEMO APPS  (the consumers)
                   7 hand-built SDK apps (beauty-saas, resto-saas, marketplace-saas,
                   agency-os, 3 storefronts) + 2 legacy manifest apps + 3 unrelated
                   Lovable/v0 exports. Consume the SDK via source aliases today.
```

**Boundary intent (clean): ** `fayz` (platform) and `fayz-app` (apps) both depend on the *public* `@fayz-ai/sdk`; the SDK's internal packages stay private until a seam is proven. This is the right shape and it is mostly respected.

**Boundary reality (leaky): ** dogfood apps actually run by Vite-aliasing straight into `fayz-sdk/packages/*/src` and `plugins/*/src` (uncompiled source), and their version pins (`@fayz-ai/sdk ^0.1.3`) do **not** match what the SDK currently builds (`sdk 0.1.5`, everything else `0.1.0`). The published-package path is effectively unverified. See [ROADMAP.md → Risk: version drift](ROADMAP.md).

---

## 2. Layer-by-layer maturity

Legend: 🟢 real & working · 🟡 real but partial/scaffold · 🔴 stub/absent

### 2.1 `fayz` — the platform (control plane)

| Capability | State | Evidence |
|---|---|---|
| AI builder (prompt → app) | 🟢 | `apps/api` generations + chat pipelines (v1 LangChain, v2 Anthropic SDK), multi-model, SSE stream, cost/credit tracking, `generationStatus` state machine |
| Project lifecycle | 🟢 | create → generate → edit → verify → publish; `ProjectVersion`, `ProjectPublish` → `*.live.ymaia.com` |
| Container orchestration | 🟢 | Docker (local) + Azure pool, file-sync, verification (build + screenshot) |
| **Plugin marketplace UI** | 🟢 (catalog hardcoded) | `apps/web/.../sections/PluginsSection.tsx` + `plugins-catalog.ts`; "Installed N/12"; **install calls `appManifestsApi.setPlugin()` and mutates the active `ProjectAppManifest`** — it is functional, not a mockup |
| ProjectAppManifest store + resolver | 🟢 | strict Zod-validated manifest v2; `GET .../app-manifests/active`; per `projectId × tenantKey × environment × surface` |
| Agent edit-scope gates | 🟢 | `check:fayz-sdk-agent-gates`, app-owned/review/blocked file classification, MCP `send_message` preflight |
| Community plugin submission | 🔴 | empty-state UI only; no backend |
| Dynamic plugin catalog | 🟡 | catalog is a hardcoded TS array; DB-seedable infra exists but unused |

> The "marketplace screenshot has no code" worry is **wrong** — it was looking in `fayz-app`. The marketplace lives in `fayz` and the install→manifest path works. What it does *not* yet do is guarantee the installed plugin's **backend** (tables, permissions, seed) is provisioned. That is the seam.

### 2.2 `fayz-sdk` — SDK + engines (this repo)

| Package | Role | State |
|---|---|---|
| `@fayz-ai/sdk` (public) | API client, runtime broker, shop provider, app-params, release channels, loose manifest types | 🟢 thin, zero runtime deps; only heavy logic is the shop provider |
| `@fayz-ai/core` | Manifest runtime, plugin resolution, data-provider abstraction, entity registry, i18n, block renderer | 🟢 solid for **UI composition**; 🔴 for **data contract execution** (see §3) |
| `@fayz-ai/app-runtime` | Umbrella re-export so apps pin one version | 🟢 (packaging glue, no logic) |
| `@fayz-ai/saas` | Generated-app **admin shell** + CRUD engine + org/permissions/billing/theme | 🟢 mature, but carries **two parallel shells** (`createFayzApp` native vs `createSaasApp` legacy) mid-migration — main tech debt |
| `@fayz-ai/ui` | Design system: ~26 primitives, AppShell/Sidebar/Topbar, dashboard-widget kit, theming | 🟢 cohesive; strongest white-label story (SaasTheme + presets) |
| `@fayz-ai/auth` | Supabase + mock auth adapters, session store | 🟢 real but thin; roles live in `saas/permissions` |
| `@fayz-ai/portal` | End-customer/learner course portal | 🟡 real but minimal single-purpose surface |
| `@fayz-ai/shop` | Commerce engine: products/orders/customers/discounts | 🟢 **best reference data contract** (see §4) |
| `@fayz-ai/storefront` | Public storefront app factory + checkout workflow | 🟡 real order flow, 🔴 payment |
| `@fayz-ai/courses` | Courses engine | 🟡 interface + mock only, no Supabase backend |
| `cli/` (`fayz`) | `create` / `extract` / `doctor` scaffolding | 🟡 template-based, not AI; `extract` self-described as "not a complete codemod" |

### 2.3 The 18 plugins — depth tiers

Full table + ranking in [PLUGIN-MODEL.md](PLUGIN-MODEL.md). Summary:

- **REAL (7)** — agenda, financial, crm, inventory, forms, reports, tasks. Real entity models, Supabase providers, some with SQL migrations.
- **PARTIAL / opt-in-real (8)** — orders, menu, tables (Fayz-broker providers, default to mock), marketing, conversations (mock), courses, shop (depth in package), dashboard (host/aggregator, no own entities).
- **VISUAL-ONLY (3)** — automations, reputation, sites (~150 LOC each, static `*Home.tsx`, "engine later").

**Cross-cutting fact: zero tests in all 18 plugins.** No plugin can currently claim a *verified* end-to-end capability.

---

## 3. The structural gap (why the foundation feels unlocked)

The plugin contract is **"manifest-first" in its type shape but "component-first" in its runtime.** The data/backend half of the contract is declared metadata that **nothing executes.**

`PluginManifest` (`packages/core/src/types/plugins.ts:263`) advertises the full vocabulary of a data-owning plugin — `entities`, `permissions`, `migrations` (with raw `sql`), `registries`. But:

- The only **required** fields are `id`, `name`, `icon`, `version`, `navigation[]`, `routes[]`. A structurally-valid plugin is **just nav entries + routes → React components.**
- `resolvePluginRuntime` (`packages/core/src/plugin/runtime.ts:119`) only ever **flattens UI surfaces** (routes, nav, widgets, dashboardWidgets, capabilities, aiTools, registries).
- `migrations[].sql` has **zero consumers** anywhere in core/saas/app-runtime. `entities: string[]` is never read. `permissions: string[]` is a bare list.
- Of the 7 real plugins with SQL migrations, **only `plugin-tasks` wires `migrations` into its manifest.** The rest ship SQL files that nothing applies.
- The generated-app side mirrors this: the scaffold's `plugins.generated.ts` is a **stub** ("Fayz will inject plugin factory registrations here") — dynamic install-time registration is not wired yet.

**Net effect:** installing a plugin from the marketplace today reliably gives you **UI surfaces + mock data**. It does **not** reliably give you a provisioned backend (tables, RLS, permissions, seed). For hand-built dogfood apps this is patched by static imports + manual Supabase migrations. For AI-generated runtime projects it is the open seam.

This is the thing to lock. See [PLUGIN-MODEL.md → The Plugin Capability Contract](PLUGIN-MODEL.md).

---

## 4. The reference that proves the model is achievable: `@fayz-ai/shop`

`packages/shop` is the **deepest and cleanest data+API contract in the codebase** and should be the template every other capability copies.

- One flat `ShopProvider` interface (`provider.ts:11`) — 27 methods across products/categories/orders/customers/discounts.
- **Three real implementations**: Supabase (RLS-aware, with `SECURITY DEFINER` RPCs `shop_place_order` / `shop_resolve_customer`), in-memory Mock (documented behavioral parity), and the SDK broker/legacy-REST path.
- The load-bearing trust primitive `placeOrder` sends **only product ids + quantities**; the server re-reads price, validates the discount, decrements stock. Genuinely tamper-resistant. **This is the pattern.**

What's still stubbed even here:
- **Payment is entirely missing** — no MercadoPago/Pix/gateway/webhook anywhere. `payments.mode: 'pix-mercadopago'` is a config flag with no implementation; only mock instant-`paid` works. This is the biggest gap for the commerce proof case.
- **SDK broker mode is a 501-heavy stub** — the new `feat(sdk): add Fayz shop broker provider` commit implements only 3 read methods; all writes/orders/customers/discounts throw `501` (`sdk/src/shop.ts:872`).
- **Type duplication** — `sdk/src/shop.ts` redefines the whole type surface instead of importing `@fayz-ai/shop/types`; all four providers hand-maintain duplicate `rowTo*` mappers (drift risk).

---

## 5. One-paragraph verdict

The control plane (AI builder, lifecycle, publish, marketplace UI, manifest resolver) is **production-grade**. The SDK shell, design system, CRUD engine, and org/multi-tenant model are **real and mature**. The commerce engine is a **strong reference** for the intended plugin data contract. The gaps that block "lock it and scale to thousands" are specific and finite: (1) the **plugin capability contract is declared-but-not-executed** for data/permissions/migrations; (2) the **marketplace→generated-app registration seam** (`plugins.generated.ts`) is a stub; (3) **zero plugin tests**; (4) **payment is unimplemented**; (5) **version/source-alias drift** between SDK and dogfood apps; (6) **two parallel SaaS shells** mid-migration. None of these are "rebuild the foundation." They are "finish wiring the foundation you already poured." → [ROADMAP.md](ROADMAP.md).
