# PLUGIN-MODEL — Curated capability without becoming *engessado*

> The answer to the central question. **2026-06-16.**
> Companion: [STATE.md](STATE.md) (where we are), [ROADMAP.md](ROADMAP.md) (what to do).

---

## The question

> "If Fayz is an AI builder where users create anything by prompt — like Lovable — how do we introduce **curated components** (the plugin marketplace) **without turning it rigid and dumb**?"

## The short answer

**Freedom and curation don't compete when they live at different layers.** Lovable is one layer: generated code. Fayz is three layers stacked, and the manifest is the hinge between them:

```
  ┌──────────────────────────────────────────────────────────┐
  │  L3  APP-OWNED CODE   (the Lovable-style freedom)         │
  │      custom pages, components, config, brand, copy,       │
  │      data labels, route overrides. AI writes this freely. │
  ├──────────────────────────────────────────────────────────┤
  │  L2  THE MANIFEST     (the hinge / contract)              │
  │      app.manifest.json — declares which surfaces, which   │
  │      plugins, which backend, which routes. The one place  │
  │      freedom and curation negotiate.                      │
  ├──────────────────────────────────────────────────────────┤
  │  L1  CAPABILITY ENGINES  (the curated, governed plugins)  │
  │      shop, crm, agenda, financial… own the repeated,      │
  │      trust-sensitive mechanics: data, auth, checkout,     │
  │      permissions, migrations. AI does NOT rewrite these.  │
  └──────────────────────────────────────────────────────────┘
```

A plugin makes the platform **rigid and dumb only if it is a frozen black box** you can either place or not place. Fayz avoids that because a plugin is **not** a black box — it exposes **four escape valves**, all of which already exist in code:

1. **Override seams.** Any plugin surface can be replaced by an app-owned `custom:*` component registered in `src/registry.tsx`. The plugin owns checkout *logic*; the app can fully own the checkout *screen*. (Proven: `30-sdk-app-operating-contract.md` → "Override the screen or step composition; do not copy order/cart/payment business logic.")
2. **Config + registries.** Plugins take typed options and expose `registries` the app can extend (e.g. a `productMetadata` overlay into `createFayzShopProvider` so a store keeps sneaker sizes / wine vintages in app-owned files while the engine stays the source of truth for price/stock/orders).
3. **Coexistence.** App-owned pages live *alongside* plugin pages in the same surface. You are never forced to choose "plugin OR custom" — the nav merges both.
4. **Swappable data.** The `DataProvider` / `ShopProvider` abstraction means a plugin's backend can be mock, Supabase, or Fayz-broker without touching its UI. The same plugin works in a throwaway demo and a real tenant.

So the design principle is:

> **Plugins own the boring, dangerous, repeated 80% (data integrity, money, auth, permissions, audit). The AI owns the expressive, brand-specific, long-tail 20% (layout, copy, custom screens, glue). The manifest lets them meet without either side reaching into the other.**

This is the opposite of *engessado*. A vertical SaaS is rigid because the 20% is also frozen. A pure vibe-coder (Lovable) is fragile because the 80% is re-generated, ungoverned, and different every time. Fayz's bet is to **freeze only the 80% that should be frozen** and keep it behind a contract the AI can compose but not corrupt.

---

## Why it currently *feels* rigid/hollow (and it's not what you think)

The risk today is **not** rigidity. It's the reverse — **the curated layer is half-hollow.** Installing a plugin gives you its UI surfaces and mock data, but does **not** guarantee its governed backend (tables, RLS, permissions, seed) is provisioned. See [STATE.md §3](STATE.md). A capability that can't be trusted to actually persist governed data is what makes the founder reluctant to "lock and scale" — not over-rigidity.

**Fix the hollowness, and the flexibility was never in danger.** The escape valves above already protect against rigidity. The missing piece is making "install" mean "a real, governed capability is now live," not "some cards and mock rows appeared."

---

## The lock to make: the **Plugin Capability Contract**

Promote the plugin from "UI surface registration" to a **capability unit** by making the declared-but-ignored fields *executed and enforced*. This is the single highest-leverage architectural decision for the whole platform.

A plugin must declare, and the runtime must honour, all of:

| Facet | Today | Target |
|---|---|---|
| **Manifest** (id, version, apiVersion) | ✅ required | keep |
| **Surfaces** (routes, nav, widgets, aiTools) | ✅ flattened by runtime | keep — this part is solid |
| **Entities** (typed data model) | declared as bare `string[]`, never read | **bind to real `EntityDef` + provider; drive CRUD + validation** |
| **Data provider** (mock / supabase / broker) | convention (`createSafeDataProvider`) | **part of the contract; install picks the backend** |
| **Migrations** (schema/RLS) | SQL files exist; only `plugin-tasks` wires them; nothing applies them | **wired in every plugin + applied by an install-time migration runner** |
| **Permissions** (feature × action) | bare `string[]`, permissive-by-default | **enforced grants; deny-by-default in multi-tenant** |
| **Seed / demo data** | mock rows for display | **typed seed applied on install for instant-useful state** |
| **Tests** | **none anywhere** | **each plugin ships an end-to-end slice test** |
| **Install/activation behavior** | marketplace flips manifest flag; registration stub | **install = manifest flag + factory registration + migration + seed + permission grants** |
| **Marketplace metadata** | hardcoded in `fayz` catalog | **derived from the plugin manifest, not a parallel hand-kept list** |

**Definition of done for the contract:** a `check:plugin-capability` gate that fails any plugin missing entities↔provider binding, manifest-wired migrations, enforced permissions, seed, or an end-to-end test. The same way `check:plugin-patterns` already enforces the UI anatomy ([PLUGIN_PATTERNS.md](../../PLUGIN_PATTERNS.md)), this gate enforces the *capability* anatomy.

---

## Prove it on ONE plugin end-to-end first (don't broaden)

The fastest way to lock the foundation is **one vertical slice through all layers**, not 18 shallow improvements. Recommended order:

1. **`plugin-tasks`** — make it the *canonical reference*. It is the smallest REAL plugin (~1,600 LOC) and the **only one already wiring `migrations` into its manifest.** Add the first end-to-end test + seed here. This becomes the template `check:plugin-capability` is written against.
2. **`@fayz-ai/shop` / `plugin-shop`** — it already has the deepest contract (3 providers, `placeOrder` trust primitive). Flip its default from runtime/mock to the real Supabase provider, finish the broker (kill the 501s), and **add the one missing piece: payment (MercadoPago/Pix)**. This proves the contract under money + multi-tenant.
3. **`plugin-crm` + `plugin-financial`** — the business flagship pair. Prove **cross-plugin** flow (quote → invoice) using the event/bridge pattern that already exists (`plugin-agenda/src/bridges/create-financial-bridge.ts`). This proves capabilities *compose*.

Everything else (the 3 visual-only stubs, the partial plugins) waits until the contract is proven on these. Resist the pull to make all 18 look finished — depth on 3 beats breadth on 18 for a foundation lock.

---

## Plugin depth inventory (current truth, for prioritisation)

`REAL` = entity model + provider + surfaces wired · `PARTIAL` = surfaces + data shape but mock/no persistence · `VISUAL` = static UI, no data contract. **None have tests.**

| Plugin | ~LOC | Data source | Class | Note |
|---|---:|---|---|---|
| agenda | 7104 | supabase (no migrations dir) | REAL | deepest; calendar + financial bridge + registries |
| financial | 6447 | supabase + 3 SQL migrations | REAL | richest entity model; migrations not manifest-wired |
| crm | 5819 | supabase + 2 SQL migrations | REAL | leads/deals/quotes; onboarding, dashboardWidgets |
| inventory | 3815 | supabase + 3 SQL migrations | REAL | products/recipes/stock |
| forms | 3680 | supabase + 2 SQL migrations | REAL | form builder + document archetypes |
| orders | 2020 | Fayz broker (defaults mock) | PARTIAL→REAL | real `data/fayz.ts`, default mock |
| menu | 1968 | Fayz broker (defaults mock) | PARTIAL→REAL | real `data/fayz.ts`, default mock |
| marketing | 1908 | mock only | PARTIAL | campaigns/funnel; no supabase yet |
| tables | 1733 | Fayz broker (defaults mock) | PARTIAL→REAL | floor-plan; default mock |
| reports | 1684 | supabase (read-only) | REAL | export hub; no store by design |
| **tasks** | 1619 | supabase + 1 migration **(manifest-wired)** | REAL | **only plugin wiring migrations → canonical reference** |
| conversations | 703 | mock (store-only) | PARTIAL | inbox; connectors deferred |
| dashboard | 508 | app-injected | PARTIAL | host/aggregator, not a feature plugin |
| courses | 467 | mock (pkg has no supabase) | PARTIAL | depth in `@fayz-ai/courses` |
| shop | 460 | supabase+broker in pkg | PARTIAL→REAL | **deepest contract**; thin wrapper over `@fayz-ai/shop` |
| automations | 164 | none (static Home) | VISUAL | "engine later" |
| reputation | 154 | none (static Home) | VISUAL | "review sync later" |
| sites | 134 | none (static Home) | VISUAL | "page builder later" |

The 3 VISUAL plugins are triplicated ~150-LOC boilerplate. Collapse them into one parameterised "coming-soon" factory (id/icon/label) until real engines land — removes ~300 LOC of drift and stops them masquerading as capabilities in the marketplace count.

---

## Community strategy (the "gigantic codebase" worry)

The SDK + 18 plugins + 3 repos will keep growing. The way you keep it governable at scale is the same contract:

- **One public package (`@fayz-ai/sdk`), forever the default.** Internal packages graduate to public only when ≥2 dogfood apps need the same primitive or a trust boundary forces it ([30-sdk-app-operating-contract.md → Graduation Rule](30-sdk-app-operating-contract.md)). This is already locked — keep enforcing `check:public-surface`.
- **The capability contract IS the community contract.** A community plugin is trustworthy iff it passes `check:plugin-capability` (typed entities, manifest-wired migrations, enforced permissions, seed, tests) + the security boundary (no secrets, OAuth via Fayz broker, deny-by-default permissions). Certification = "passes the gates," not human review at scale.
- **The marketplace catalog should be derived from plugin manifests**, not a hand-kept array in `fayz`. Then a community submission is "a plugin that passes the gates," and its card metadata comes from its own manifest. This is what makes thousands of plugins tractable.
- **Trust stays server-side in Fayz.** OAuth tokens, provider grants, tenant authority, billing — never in SDK/plugin/browser code. Already a locked principle; it is what lets you open the plugin ecosystem without opening the attack surface.
