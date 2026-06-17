# Plugin-Owned Migrations — Making Plugin Enablement Backend-Ready

**Status:** Design / RFC · **Date:** 2026-06-17 · **Author:** dogfood sprint
**Problem owner:** Fayz editor will need to run these migrations when it provisions SDK projects.

---

## 0. The problem, stated plainly

Today, enabling a plugin gives you **UI that assumes a database that isn't there**. Open
`agency-os/#/sales` and the CRM pages render, then throw `404`s because `crm_activities`,
`pipelines`, `deal_extensions`, etc. don't exist in the agency Supabase. The schema for those
tables lives in **hand-copied SQL files inside each app**, disconnected from the plugin that needs them.

What we want: **enable the CRM plugin → its data model comes along and provisions itself.**
Installation should be *backend-ready*, not just *page-ready*. And critically — when SDK projects
run inside the Fayz editor, **Fayz must do this provisioning automatically**, the same way I did it
by hand for `contacts` (apply spine → apply plugin tables → apply RLS/grants/views).

This doc maps what exists today, names the gap precisely, and proposes the architecture.

---

## 1. What exists today (grounded in the code)

### 1.1 The declaration mechanism already exists — with no executor

`packages/core/src/types/plugins.ts:248`

```ts
export interface PluginMigration {
  id: string
  version: string
  sql: string
  description?: string
}
```

`PluginManifest.migrations?: PluginMigration[]` (line 294) is a real, shipped field.
**Exactly one plugin uses it** — `plugin-tasks`, which inlines the SQL as a TS template literal:

```ts
// plugins/plugin-tasks/src/index.ts:56,199
const MIGRATION_001 = `-- Tasks Plugin: Base Tables ...`
// ...
migrations: [{ id: 'tasks-001-base-tables', version: '1.0.0', sql: MIGRATION_001, description: '...' }]
```

**Nothing reads `manifest.migrations`.** A grep across `packages/core` and `packages/saas` for any
consumer returns nothing. So we have a *declaration with no runner*. The contract exists; the engine doesn't.

### 1.2 Most plugins have orphaned SQL, not declared SQL

| Plugin            | `.sql` files in `src/migrations/` | Declared in manifest? |
|-------------------|-----------------------------------|-----------------------|
| plugin-tasks      | (inlined in index.ts)             | ✅ yes (the only one)  |
| plugin-crm        | `001_crm_base`, `002_activities`  | ❌ orphaned            |
| plugin-financial  | `001_financial_base`, `002_chart_of_accounts`, `003_card_brands` | ❌ orphaned |
| plugin-inventory  | `001_inventory_base`, `002_recipes`, `003_measurement_units` | ❌ orphaned |
| plugin-forms      | `001_frm_base`, `002_document_archetype` | ❌ orphaned     |

### 1.3 Apps hand-copy plugin SQL → duplication

Each app re-timestamps and copies the plugin SQL into its own `supabase/migrations/`:

- `beauty-saas/.../20260201000003_plugin_crm.sql` **==** `resto-saas/.../20260201000003_plugin_crm.sql`
  (byte-identical; `diff` is empty).
- Same for `plugin_financial`, `plugin_inventory`.

So a plugin schema change today requires editing it in N apps. The SDK `plugin-*/src/migrations/`
is *meant* to be the source of truth, but with no runner, apps fork it.

### 1.4 The four rings (apply order is a hard dependency chain)

| Ring | Schema | Owner | Examples | Provisioning today |
|------|--------|-------|----------|--------------------|
| **0 — Spine** | `saas_core` | platform | `tenants`, `tenant_members`, `persons`, `orders`, `order_items`, `bookings`, `products`, `services`, `locations` | copied into every app |
| **1 — Plugin tables** | `public` | plugin | `pipelines`, `crm_activities`, `deal_extensions`, `financial_movements`, `payment_methods`, `tsk_tasks` | copied into every app |
| **2 — Archetype extensions** | `public` | app | `clients`, `staff_members`, `contacts` (1:1 to `persons`) | app-specific |
| **3 — Bridge views** | `public` | app/plugin | `v_clients`, `v_deals`, `v_bookings`, `v_invoice_balances`, `v_contacts` | app-specific |

The order is **non-negotiable**: Ring 1 FKs reference Ring 0; Ring 3 views JOIN across `saas_core` ×
`public`; financial reads `orders`. Any runner must respect this layering.

### 1.5 RLS is inconsistent

- Plugin tables: `tenant_id IN (SELECT public.user_tenant_ids())`
- App extension tables: `tenant_id IN (SELECT saas_core.user_tenant_ids())`

Two functions, one wraps the other. Functional, but a standardization debt.

### 1.6 EntityDef describes UI, not schema — so "generate DDL from entities" is lossy

`FieldDef` (`packages/core/src/types/crud.ts`) carries `key`, a **UI** `type`
(`text|email|currency|select|boolean|date…`), `required`, `defaultValue`, visibility flags.
It does **not** carry: SQL column type, FK targets, indexes, `UNIQUE`/`CHECK`, array/JSONB types,
`ON DELETE` behavior, or the view JOIN logic. The archetype provider
(`packages/core/src/data/archetype.ts`) *assumes* a precise schema exists for
`data:{archetype:'person', archetypeKind:'contact', table:'contacts'}`:

- `saas_core.persons` (kind-discriminated, tenant_id)
- `public.contacts` (`person_id` PK→persons, `tenant_id`, plugin columns)
- `public.v_contacts` (INNER JOIN persons × contacts, the read surface — resolved by
  `VIEW_MAP[table] ?? 'v_'+table` at `archetype.ts:93`)
- RLS + grants on both tables

**Conclusion:** pure entity→DDL generation can't be the source of truth for arbitrary tables. But for
the **regular** archetype-extension pattern (Ring 2), the shape is constrained enough to generate
safely (see §3, Decision G).

---

## 2. The gap in one sentence

> We have a per-migration **type**, one plugin **declaring** migrations, a pile of **orphaned** SQL,
> N apps **copying** that SQL, and **zero runtime** that collects a project's enabled plugins, orders
> their migrations against the spine, and applies them idempotently to a target database.

Everything below is about closing that gap with the smallest set of durable primitives.

---

## 3. Design decisions

### Decision A — Authored SQL is canonical; generation is a scaffolding aid (not the engine)

Plugins **author** their Ring-1 SQL (they already have it). The manifest carries it. We do **not**
try to reverse a live schema out of EntityDef for arbitrary tables. Generation is reserved for the
regular Ring-2 archetype pattern (Decision G) and for *scaffolding new* plugins, never as the
authority for existing structure. This matches reality: the SQL exists and is correct; it just isn't wired.

### Decision B — A plugin ships a *migration set*, not loose files

Promote the orphaned `.sql` files into declared migrations. Two viable encodings:

1. **Inline string** (what plugin-tasks does) — simplest, bundler-agnostic, no build step.
2. **Raw import** — `import sql from './migrations/001_crm_base.sql?raw'` (Vite/tsup raw loader),
   keeping `.sql` files first-class for editor tooling + syntax highlighting.

Recommend **(2)** with a tiny build config, falling back to (1) where bundling is awkward. Either way
the runtime sees `PluginMigration[]`. Add two fields to `PluginMigration`:

```ts
export interface PluginMigration {
  id: string                 // globally unique: `${pluginId}:${seq}-${slug}`
  version: string            // semver of the plugin when this migration was introduced
  sql: string
  description?: string
  ring?: 0 | 1 | 2 | 3       // NEW — apply-layer hint (default 1 for plugins)
  dependsOn?: string[]       // NEW — migration ids that must run first (cross-plugin edges)
}
```

`ring` lets the runner batch by layer; `dependsOn` handles the rare cross-plugin edge
(e.g. a view that joins another plugin's table).

### Decision C — One runner, transport-agnostic executor

Put the brain in the SDK, keep credentials out of it. The host injects how SQL actually runs.

```ts
// packages/core/src/migrations/runner.ts  (new)
export interface SqlExecutor {
  exec(sql: string): Promise<void>            // run one migration (host decides: PG, Mgmt API, CLI)
  appliedIds(): Promise<Map<string,string>>   // id -> checksum, from the ledger
  record(m: AppliedMigration): Promise<void>  // write ledger row
}

export interface MigrationPlan {
  pending: PlannedMigration[]   // ordered, ready to apply
  applied: string[]             // already-applied ids (skipped)
  drift: DriftWarning[]         // applied id whose checksum changed (edited after apply)
}

export function planMigrations(args: {
  spine: PluginMigration[]                 // Ring 0 (the platform's saas_core set)
  plugins: { id: string; migrations: PluginMigration[] }[]  // enabled plugins only
  ledger: Map<string,string>               // from executor.appliedIds()
}): MigrationPlan

export async function runMigrations(plan: MigrationPlan, exec: SqlExecutor, opts?: { dryRun?: boolean }): Promise<RunResult>
```

Ordering algorithm: **stable topological sort** keyed by `(ring, dependsOn, declaration order)`.
Ring is the coarse layer; `dependsOn` refines within/across; declaration order breaks ties so a
plugin's own `001 → 002 → 003` is preserved.

Hosts that implement `SqlExecutor`:

| Host | `exec` backed by | Used for |
|------|------------------|----------|
| **dogfood CLI** | Supabase **Management API** (`/v1/projects/{ref}/database/query`) or `supabase db push` | what I did by hand for `contacts` |
| **local dev** | `psql` / `supabase` CLI against the local stack | `pnpm provision` |
| **Fayz editor** | the editor's provisioning service against the *project's* Supabase (service role / Mgmt API) | **enable-plugin hook**, project bootstrap |

The SDK never holds a secret; the editor owns project credentials and provides the executor. This is
the seam that makes "Fayz handles migrations automatically" a clean integration rather than a rewrite.

### Decision D — A migration ledger (idempotency + drift detection)

A dedicated tracking table, applied as migration zero:

```sql
create schema if not exists fayz_meta;
create table if not exists fayz_meta.migrations (
  id          text primary key,        -- PluginMigration.id
  plugin_id   text not null,
  version     text not null,
  checksum    text not null,           -- sha256 of normalized sql
  applied_at  timestamptz not null default now()
);
```

Runner rules:
- **id present + checksum match** → skip (already applied).
- **id absent** → apply, then `record`.
- **id present + checksum differs** → **drift**: the migration was edited after being applied.
  Default = **fail with a clear diff** (never silently re-run mutated DDL). Plugins evolve by adding
  *new* migration ids, never editing shipped ones — the timestamped-era discipline, enforced.

This is Rails/Prisma/Supabase-style, but keyed per plugin so a project can mix plugins freely.

### Decision E — Apps stop copying; they enable + provision

Once the runner exists, an app's `supabase/migrations/` shrinks to **app-specific only** (Ring 2
extensions + app-authored views). Ring 0 + Ring 1 come from the spine + enabled plugins at provision
time. Concretely, `agency-os` would delete its copied `plugin_crm.sql`/`plugin_financial.sql` and
instead the provision step reads `agencyOsAppConfig.plugins`, collects each plugin's `migrations`,
prepends the spine, and runs them. **The duplication in §1.3 disappears.**

### Decision F — Standardize tenancy & RLS via a helper, not copy-paste

Ship a SQL-emitting helper so every tenant-scoped table gets identical, canonical policies:

```ts
// packages/core/src/migrations/sql.ts
export function tenantRls(table: string): string  // 4 policies, all `tenant_id IN (SELECT public.user_tenant_ids())`
export function grantsAuthenticated(table: string): string
export function updatedAtTrigger(table: string): string
```

Plugins call these inside their migration strings → one canonical RLS form everywhere, killing the
`public.` vs `saas_core.` split (§1.5). Pick **`public.user_tenant_ids()`** as the canonical wrapper.

### Decision G — Generate Ring-2 archetype extensions from EntityDef (the one place generation is safe)

Ring-2 extension tables are *regular*: `person_id` PK → `saas_core.persons`, `tenant_id`, a `v_<table>`
view INNER JOINing persons × extension, RLS + grants. That regularity is exactly what makes generation
safe here (unlike arbitrary Ring-1 tables). Add **optional** DB hints to `FieldDef`:

```ts
db?: {
  sqlType?: string          // override inferred type, e.g. 'numeric(14,2)'
  references?: string       // 'saas_core.persons(id)'
  unique?: boolean
  index?: boolean
}
```

Then a generator turns an archetype EntityDef into the migration I *hand-wrote* for `contacts`:

```
contactEntity  ──▶  CREATE TABLE public.contacts (person_id pk→persons, tenant_id, <fields>) 
                    + CREATE VIEW v_contacts + tenantRls('public.contacts') + grants + trigger
```

Type inference from UI `FieldType`: `text→text`, `email/phone/url→text`, `number→numeric`,
`currency→numeric(14,2)`, `boolean→boolean`, `date→date`, `datetime→timestamptz`,
`select→text`, `multiselect→text[]`, hints override. This makes "scaffold a new CRUD" a one-liner
that produces *both* the page and the migration — the real fix for the user's complaint.

### Decision H — Dry-run + plan output are first-class

`runMigrations(plan, exec, { dryRun: true })` prints the ordered plan (ids, rings, "skip/apply",
drift warnings) **without touching the DB**. This is the safety rail I'd want before applying anything
to a live tenant database, and what the Fayz editor would show the user as "this plugin will add N tables."

---

## 3b. The developer command: `fayz-sdk migrate` (diff-based generation)

Plugins shipping SQL is only half the story. The other half: **when the data model changes — a column
added to `contacts`, a plugin enabled, a brand-new archetype CRUD — the developer should run one
command that materializes the delta as a migration file in the app, applies it, and reports status.**

This is the **Prisma `migrate dev` / Drizzle Kit `generate` / Rails** model. The load-bearing
mechanism is a **desired-state snapshot**: you cannot infer "a column was added" from the current
entity alone — you need the *previous* desired state to diff against.

### 3b.1 Command surface

```
npx fayz-sdk migrate              # generate pending migrations + apply + status   (the everyday)
npx fayz-sdk migrate --plan       # show the diff plan, write nothing
npx fayz-sdk migrate --generate   # generate files only, do not apply
npx fayz-sdk migrate status       # just the status table (applied / pending / drift)
npx fayz-sdk migrate --allow-destructive   # opt-in for DROP COLUMN / type changes
```

One verb covers every trigger the user named — **initial setup, plugin added, field added** — because
they're all the same operation: *diff desired schema against the snapshot, emit the delta.*

### 3b.2 What one run does

```
1. ASSEMBLE DESIRED STATE
   • read app config → enabled plugins → each plugin's migrations[] (authored SQL, Ring 1)
   • read app + plugin EntityDefs (+ FieldDef.db hints) → archetype extensions & columns (Ring 2)
   • result: the full intended schema model

2. LOAD BASELINE
   • supabase/migrations/meta/_snapshot.json   ← desired schema as of last generate
   • existing migration files + fayz_meta.migrations ledger (what's actually applied)

3. DIFF  (desired vs snapshot)
   • plugin newly enabled        → vendor that plugin's migration set as local files
   • plugin upgraded             → vendor its new (unapplied) migration ids
   • archetype entity added      → generate CREATE extension + v_<table> view + RLS + grants
   • field added to an entity    → generate ALTER TABLE … ADD COLUMN
   • field removed / type change → generate it, but flag DESTRUCTIVE (needs --allow-destructive)

4. GENERATE
   • write timestamped files into supabase/migrations/ with a provenance header
     (-- @generated by fayz-sdk · source: contactEntity.field 'segment')
   • rewrite _snapshot.json to the new desired state

5. APPLY  (unless --generate)
   • run pending via the ledger (Decision C/D), idempotent, ring-ordered

6. STATUS
   ┌──────────────────────────────────────────────┬──────────┐
   │ 20260617_2300_add_contacts_segment            │ applied  │
   │ 20260617_2301_enable_plugin_crm (vendored ×5) │ applied  │
   │ 20260617_2302_drop_contacts_legacy            │ pending* │  *destructive — needs flag
   └──────────────────────────────────────────────┴──────────┘
   ✓ schema in sync · 1 destructive change held back
```

### 3b.3 Three provenances, one ordered history

The app's `supabase/migrations/` becomes the single auditable timeline, holding three kinds of file —
all flowing through the same ledger + apply path, so `supabase db push` still works unmodified:

| Provenance | Source | Generated how |
|------------|--------|---------------|
| **vendored** | `plugin.migrations[]` | copied into the app on plugin enable/upgrade (authored SQL, never rewritten) |
| **generated** | EntityDef + `FieldDef.db` hints diffed vs snapshot | emitted by the generator (columns, archetype scaffolds) |
| **manual** | developer hand-writes a `.sql` | the escape hatch for anything entities can't express (indexes, CHECKs, complex views, data backfills) |

The snapshot tracks only the *entity-derived* surface; vendored and manual files are opaque SQL the
runner just applies in order. **Generated and manual coexist** (Rails-style) — the generator owns the
regular 80%, the developer owns the irregular 20%.

### 3b.4 The two hard parts (be honest about them)

1. **The snapshot is the whole game.** Without a recorded prior desired state, "pick up recent
   changes" is impossible — you'd only see the current entity, not what changed. We store it as
   `meta/_snapshot.json` (Drizzle Kit's approach; simpler than Prisma's shadow database). It must be
   committed to the app repo and is the source of truth for diffs. If it drifts from reality, regenerate
   from the live DB (`migrate status` flags the mismatch).

2. **Destructive changes must never auto-apply.** Drop-column, narrowing type changes, NOT NULL on a
   populated table — the generator detects these, *writes* the SQL, but holds it `pending` behind
   `--allow-destructive`. This is the guardrail that lets the everyday `migrate` stay safe to run.

### 3b.5 Same engine, two front-ends

`fayz-sdk migrate` is the **CLI front-end** for local/dogfood dev. The **Fayz editor** calls the *same*
`planMigrations`/`generate`/`runMigrations` core (Decision C) with its own executor + the project's
snapshot — so "enable a plugin in the editor" and "add a field in the visual schema designer" both
produce the same generated files and the same applied result as the CLI. One engine, two surfaces.

---

## 3c. The dev/deploy resolution proxy (local SDK source ↔ published bundle)

While developing, an app must resolve `@fayz-ai/*` to **local fayz-sdk source** (instant feedback, no
build/publish loop); when deployed it resolves to the **published bundle**. Three tools each resolve
modules differently, so the proxy must cover all three — this was the gap that forced the schema mirror.

| Tool | What it resolves | Mechanism | Toggle |
|------|------------------|-----------|--------|
| **vite** (runtime) | app imports of `@fayz-ai/*` | `resolve.alias` map → `../../fayz-sdk/.../src` | `FAYZ_SDK_SOURCE=published` drops the aliases |
| **tsc** (types) | type imports | `tsconfig.json` `paths` → `../../fayz-sdk/.../src` | `tsconfig.published.json` clears `paths` |
| **drizzle-kit** (schema) | `schema` imports of `@fayz-ai/db`, `@fayz-ai/plugin-*/schema` | **node_modules** (its loader is CJS — ignores vite alias *and* tsconfig paths) | always local (generate is dev-only) |

Two hard-won facts:
1. **drizzle-kit ignores both vite aliases and tsconfig `paths`** (its bundler does plain CJS resolution).
   The only resolver it honours is `node_modules`. So the schema packages are linked in for dev:
   ```jsonc
   // app package.json — devDependencies (dev-only; runtime/deploy never import these)
   "@fayz-ai/db": "link:../../fayz-sdk/packages/db",
   "@fayz-ai/plugin-crm": "link:../../fayz-sdk/plugins/plugin-crm"
   ```
   `link:` symlinks to local source — universal, every tool respects it. No toggle needed: you only
   `generate` during development, and deploys apply pre-generated SQL.
2. **Source-only packages need a `default` export condition.** drizzle-kit's CJS loader threw
   `ERR_PACKAGE_PATH_NOT_EXPORTED` until `@fayz-ai/db` and `@fayz-ai/plugin-crm`'s `./schema` exports
   included `"default": "./src/...ts"` (the `source`/`import` conditions are ESM-only).

And one tsconfig rule: a `paths` pattern may contain **at most one `*`** — so the subpath alias is an
explicit `"@fayz-ai/plugin-crm/*"` entry, not a `"@fayz-ai/plugin-*/*"` double-glob.

Net: the canonical schema lives once in the SDK; the app links it for dev-time generation and aliases
it for runtime — no mirror, no duplication. Future cleanup: replace vite's hand-kept alias map and
tsconfig's `paths` with a single shared list (e.g. `vite-tsconfig-paths`) so there's one source of truth.

---

## 4. Target architecture (the picture)

```
        ┌─────────────────────────────────────────────────────────┐
        │ Plugin (e.g. plugin-crm)                                 │
        │  • UI (pages, registries)                                │
        │  • data provider (reads/writes tables)                   │
        │  • migrations: PluginMigration[]   ◀── promote orphans   │
        │      001_crm_base, 002_activities (ring:1)               │
        └───────────────┬─────────────────────────────────────────┘
                        │  app enables plugins in config
                        ▼
        ┌─────────────────────────────────────────────────────────┐
        │ planMigrations({ spine, enabledPlugins, ledger })        │
        │   → stable topo-sort by (ring, dependsOn, order)         │
        │   → diff vs ledger → { pending, applied, drift }         │
        └───────────────┬─────────────────────────────────────────┘
                        │  inject host executor
        ┌───────────────┼───────────────┬─────────────────────────┐
        ▼               ▼               ▼
   dogfood CLI      local dev      Fayz editor
   (Mgmt API)     (supabase CLI)   (provision svc, project creds)
        │               │               │
        └───────────────┴───────────────┘
                        ▼
              target Supabase project
        Ring0 spine → Ring1 plugin tables → Ring2 ext → Ring3 views
        every apply recorded in fayz_meta.migrations
```

---

## 5. Phased roadmap

| Phase | Deliverable | Proves |
|-------|-------------|--------|
| **0 — done** | Manual spine+`contacts` apply via Mgmt API (this session) | the executor path + ring order work end-to-end |
| **1 — runner** | `planMigrations` + `runMigrations` + `fayz_meta.migrations` ledger + a dogfood CLI executor; promote crm/financial/inventory/forms orphans into `manifest.migrations`; provision **agency-os** purely from plugin manifests (delete copied SQL); make `/sales` real | one app is backend-ready from plugins alone; duplication gone for that app |
| **2 — standardize** | `tenantRls`/`grants`/`trigger` SQL helpers; converge on `public.user_tenant_ids()`; migrate plugin SQL to use helpers | one canonical RLS form |
| **3 — generate** | `FieldDef.db` hints + archetype-extension generator (`entity → Ring-2 migration + v_ view`); scaffold command emits page **and** migration | "add a CRUD" is one step, backend included |
| **4 — drift + editor** | checksum drift detection in CI; Fazy editor enable-plugin hook calls `runMigrations` against the project DB with a dry-run preview; marketplace plugins ship verified migration sets | Fayz provisions automatically, safely |

---

## 6. PROVEN on agency-os (2026-06-17) — Drizzle, well-configured

Decision: **adopt Drizzle Kit** (see comparison in §8). We do NOT build a generate/apply engine —
`fayz-sdk migrate` collapses to *config + scripts* now, and a thin Management-API adapter for the
editor host later. The loop was proven end-to-end on agency-os:

**Architecture committed to the SDK**
- `packages/db` (`@fayz-ai/db`) — spine refs (Ring 0, FK targets/baseline) + `tenantId()`/`timestamps` helpers.
- `plugins/plugin-crm/src/schema/index.ts` — the 7 CRM tables as Drizzle schema; exported via the
  `./schema` subpath. Typechecks clean in the SDK workspace.

**The loop (each step = one schema edit + `drizzle-kit generate`)**
| Stage | Edit | Generated | Applied |
|-------|------|-----------|---------|
| 0 baseline | spine + contacts (what exists) | `0000_baseline_existing.sql` | **no** (already live) — just seeds the snapshot |
| 1 enable plugin | uncomment `export * from './crm'` | `0001_enable_crm.sql` — **only** the 7 CRM tables+FKs+indexes | yes → `/sales` went from 5×404 to rendering |
| 2 model change | add `segment: text()` to contacts | `0002_add_contact_segment.sql` = `ALTER TABLE "contacts" ADD COLUMN "segment" text;` | yes → column verified live |

The snapshot (`drizzle/meta/_snapshot.json`) made each step emit **only the delta** — exactly the
"pick up recent changes" behavior. Verified live: 7 CRM tables, `v_leads`/`v_deals` views, 28 RLS
policies; `/sales` renders; zero console errors (was 5).

**Three provenances, confirmed in `agency-os/drizzle/`:** *generated* (Drizzle table DDL), *manual*
(`companion/0001_crm_rls_views.sql` — RLS policies + grants + views Drizzle doesn't diff), and the
journal/snapshot as state. Apply went through the **Management API** (agency has no PG connection
string) — i.e. the editor-host executor path, not `drizzle-kit migrate`.

**Plugin companion SQL joins the pipeline (2026-06-17).** A plugin owns *all* its SQL, not just
tables: the Drizzle schema (`src/schema/`) covers tables; `src/migrations/*.sql` carries the
functions/views/RLS/grants Drizzle can't diff. Both travel with the plugin. The app applies them via
a thin Management-API executor (`agency-os/scripts/db-apply.mjs`, `pnpm db:apply`): Drizzle migrations
first, then each **enabled** plugin's companion SQL in order, then `NOTIFY pgrst, 'reload schema'`.
- Relocated `v_leads`/`v_deals` + CRM RLS/grants out of the app into `plugin-crm/src/migrations/003_crm_views_rls.sql`.
- Relocated the order-to-cash function (`fn_invoice_from_order` + `next_sequence` + `orders.stage/direction`
  + `financial_movements` RLS + `v_invoice_balances`) into `plugin-financial/src/migrations/004_order_to_cash.sql`
  — it writes `financial_movements`, so it's **financial-owned**; CRM/agenda just RPC it (a cross-plugin dependency).
- Fixed the live bug: `agency /sales` → approveQuote RPC'd `fn_invoice_from_order`, which agency never had.
  Running the pipeline provisioned financial + the function; PostgREST now resolves the RPC (verified — it
  executes and raises its own "order not found" on a probe, not a schema-cache miss). The schema-cache reload
  (`NOTIFY pgrst`) is part of the applier — that was half the original error.

**Two known follow-ups (honest):**
1. *agency-os is a standalone pnpm project* (own lockfile, consumes the published `@fayz-ai/sdk`
   bundle), so it can't yet `workspace:*`-import the SDK schema. The demo uses a **self-contained local
   mirror** (`agency-os/src/db/schema/_spine.ts` + `crm.ts`) — to be deleted once agency consumes the
   SDK schema via a workspace link or the bundle's `./schema` export. The canonical schema lives in the SDK.
2. RLS/grants/views are *manual* companion SQL today. Folding RLS into generation via
   `drizzle-orm/supabase` `pgPolicy`/`crudPolicy` is the next enhancement (Decision G/F).

---

## 7. Open questions

1. **SQL bundling** — raw-import (`?raw`) vs inline string as the house style for `PluginMigration.sql`?
2. **Spine ownership** — Ring 0 lives in `@fayz/saas-core` (external, referenced by `migrate.mjs`).
   Does the spine become "plugin zero" with its own `PluginMigration[]`, unifying the model?
3. **Rollback** — do we need `down` SQL, or is forward-only + restore-from-backup enough for v1?
   (Most teams ship forward-only; recommend deferring `down`.)
4. **Seed vs schema** — `PluginRegistryDef.seedData`/`mockData` already exist; does the runner also
   apply seeds (payment_method_types, card_brands), or is that a separate post-provision step?
5. **Multi-tenant timing** — provision schema once per *project DB*, but seed per *tenant*. Where's
   the boundary when one Supabase project hosts many tenants (current model)?
