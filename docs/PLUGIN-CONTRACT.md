# Plugin Contract — the publishable-package standard

**Status: canonical · Updated 2026-07-15.**

This is the backend/packaging contract every publishable `@fayz-ai/*` package must
satisfy before a stable publish. It is the companion to
[PLUGIN-PATTERNS.md](./PLUGIN-PATTERNS.md) (UI anatomy) and
[DATA-MODEL.md](./DATA-MODEL.md) (the archetype spine). Where PLUGIN-PATTERNS covers
*how a plugin is shaped in React*, this doc covers *how a plugin declares its data,
migrations, exports, and config* so it provisions itself and ships cleanly.

The reference plugin for this contract is **`plugin-crm`** (fullest surface) with
**`plugin-tasks`** as the minimal example and **`@fayz-ai/shop`** as the anon-storefront
example.

> **Schema note (industry pools).** Core lives directly in the `public` schema — there is
> **no `saas_core` schema** in a provisioned pool. Spine tables are `public.people`,
> `public.orders`, `public.appointments`, … and the tenant helper is
> `public.user_tenant_ids()`. Plugin tables use the `plg_<plugin>_*` prefix, also in
> `public`. Docs that still say `saas_core.*` describe the pre-pool design.

---

## 1. Directory layout

```
plugins/plugin-x/
  package.json          exports map + peers (§6, §7)
  tsup.config.ts        one entry per exported subpath (§6)
  src/
    index.ts            createXPlugin(options) → PluginManifest (§5)
    config.ts           resolveConfig(); ResolvedXConfig
    data/
      tables.ts         export const T = { … }  ← physical plg_* names (§3)
      types.ts          XDataProvider interface
      mock.ts           createMockXProvider()
      supabase.ts       createSupabaseXProvider() — uses T.*, never literals
    schema/index.ts     drizzle pgTable defs (canonical physical column source)
    registries.ts       archetype entity defs (data.table: T.*)
    migrations/
      NNN_*.sql          SQL = source of truth (§4)
      index.ts           AUTO-GENERATED barrel (embed script) — do not hand-edit
    locales/{index,en,pt-BR}.ts
```

First-class packages (`@fayz-ai/shop`, `@fayz-ai/courses`) keep their SQL at the package
root under `migrations/` instead of `src/migrations/` (§4.1). `@fayz-ai/db` (the spine)
does the same.

---

## 2. What counts as "owning tables"

A package owns tables when it ships `CREATE TABLE public.plg_<plugin>_*` migrations. Those
packages MUST follow §3–§4. Packages that only compose core/spine tables (e.g.
`plugin-agenda`, which reads `public.appointments`/`public.orders`) do **not** need a
`tables.ts` of their own.

---

## 3. Tables registry — `src/data/tables.ts`

Every plugin with its own tables exports a single physical-name registry:

```ts
// Central physical-table-name registry for plugin-crm. Providers import T and
// never hardcode the plg_crm_* strings, so a future rename touches one file.
export const T = {
  activities: 'plg_crm_activities',
  pipelines: 'plg_crm_pipelines',
  pipelineStages: 'plg_crm_pipeline_stages',
  // …
} as const
```

Rules:
- **Providers reference `T.*`, never string literals** — `pub.from(T.pipelines)`.
- **Registry entity defs reference `T.*`** — `data: { table: T.leadSources }`.
- The two places that legitimately keep the raw `plg_*` literal are:
  - `src/schema/index.ts` — the drizzle `pgTable('plg_crm_pipelines', …)` declaration is
    the physical source of truth that `T` mirrors.
  - `src/migrations/*.sql` (and their generated `index.ts`) — SQL is SQL.
- Registry-declared tables (auto-provisioned by the archetype engine, e.g.
  `plg_forms_categories`) still belong in `T`.

Packages `@fayz-ai/shop` and `@fayz-ai/courses` keep `T` at `src/tables.ts`.

---

## 4. Migrations — SQL is the source of truth

### 4.1 Location (do not move applied files)

The ledger runner resolves a package's SQL by trying **both** layouts, so both are valid
and existing pools keep their checksums stable
(`cli/src/lib/migration-plan.ts` → `pluginMigrationFiles`):

| Package kind | SQL location |
|---|---|
| Convention plugins (`plugin-crm`, `plugin-tasks`, …) | `src/migrations/*.sql` |
| First-class packages (`@fayz-ai/shop`, `@fayz-ai/courses`) | `migrations/*.sql` (package root) |
| Spine (`@fayz-ai/db`) | `migrations/*.sql` |
| Connectors (agenda's google-calendar) | `src/integrations/<conn>/migrations/*.sql` |

Files already applied to live pools are **not moved** — a moved/renamed file changes the
apply identity. New SQL follows the layout for its package kind.

### 4.2 Embed — SQL → `src/migrations/index.ts`

`scripts/embed-migrations.mjs` regenerates each plugin's `src/migrations/index.ts` barrel
(`MIGRATION_<FILE>` consts + a `MIGRATIONS` array) byte-for-byte from the `.sql` files, so
the manifest can declare migrations as inline data (§5) that stays in sync with what
`fayz db apply` executes. **Run `node scripts/embed-migrations.mjs` after editing any
plugin `.sql`.** (shop/courses/db do not embed — the runner reads their `.sql` directly.)

### 4.3 Ledger + idempotency

`fayz db apply` records a per-file checksum. A file re-applies only when its content
changes. Because a changed file re-runs on an already-provisioned pool, **every migration
must be replay-safe**:

- `CREATE TABLE public.X` → `CREATE TABLE IF NOT EXISTS`
- `CREATE [UNIQUE] INDEX` → `CREATE … INDEX IF NOT EXISTS`
- `CREATE TYPE` → wrap in a guarded `DO` block
- `CREATE TRIGGER n` → precede with `DROP TRIGGER IF EXISTS n ON …`
- `CREATE POLICY p` → precede with `DROP POLICY IF EXISTS p ON …`, OR guard with
  `IF NOT EXISTS (SELECT 1 FROM pg_policies …)`, OR use the dynamic
  `EXECUTE format('DROP POLICY IF EXISTS %I …')` loop
- Seed `INSERT` → `ON CONFLICT … DO NOTHING`
- Functions → `CREATE OR REPLACE FUNCTION`

Gate: `node scripts/check-idempotent-migrations.mjs` (`pnpm check:idempotent-migrations`)
scans the spine + shop + courses + every plugin `src/migrations` + connector migrations.

### 4.4 The `000_plg_rename` convention

The first migration of a table-owning plugin is a guarded, in-place rename of any
pre-pool table names to the `plg_<plugin>_*` prefix (`ALTER TABLE … RENAME TO …` behind a
`to_regclass(...) IS NOT NULL AND to_regclass(new) IS NULL` guard), so pools provisioned
before the rename converge and fresh pools no-op.

---

## 5. Manifest + config

A plugin is a factory `createXPlugin(options?: XPluginOptions): PluginManifest`. It:

1. resolves options against defaults (`resolveConfig`),
2. registers translations (`registerTranslations`),
3. builds a data provider via `createSafeDataProvider(() => supabase, () => mock)`,
4. returns the `PluginManifest`.

The manifest carries the **data-bearing declarations** the platform reads (Panel reads the
derived `app.manifest.json`):

| Field | Purpose |
|---|---|
| `id`, `name`, `icon`, `version`, `scope`, `verticalId` | identity |
| `scaffolds`, `defaultEnabled`, `dependencies`, `declaredFeatures` | capability + RBAC |
| `navigation`, `routes`, `widgets`, `dashboardWidgets` | UI surface |
| `migrations: [{ id, version, sql, description }]` | data model (sql from the embed barrel) |
| `aiTools` | assistant tools |
| `locales` | i18n |

Registries (archetype entity CRUD) are passed into the page component, not the manifest;
they bind to physical tables via `T.*` (§3).

Prefer the `definePlugin(manifest)` helper (`@fayz-ai/core`) for the return value where a
plugin wants the identity passthrough + `PLUGIN_API_VERSION` stamping. Existing factories
that return a plain object are contract-compliant; align new ones on `definePlugin`.

**Accepted deviations:** `plugin-auth` (auth adapters) and `plugin-payments` (payment
providers) export provider factories rather than a surface `PluginManifest` — they are
capability packages, not page plugins, and intentionally skip §5.

---

## 6. Exports map

`package.json` `exports` MUST declare `"."` **plus every subpath `tsup.config.ts` builds**.
Each entry ships all four conditions:

```jsonc
"./schema": {
  "source": "./src/schema/index.ts",   // monorepo consumers resolve TS directly
  "types":  "./dist/schema/index.d.ts", // tsc --emitDeclarationOnly output
  "import": "./dist/schema.js",          // ESM
  "require": "./dist/schema.cjs"          // CJS
}
```

A built entry that is not exported is a silent drop (the reason `plugin-marketing`'s
`./schema` was added in this pass — it built `dist/schema.*` but never exposed it).
Runtime exports may only **gain** subpaths, never lose or rename them (published apps
compile against the current surface).

`packages/*` with multiple entries (core, sdk, saas, shop, storefront, ui) follow the same
rule — the entry key `foo/index` maps to subpath `./foo`, key `foo` maps to `./foo`.

---

## 7. peerDependencies vs dependencies

The consistent pattern across all plugins (do not diverge):

```jsonc
"peerDependencies": {
  "react":     "^18.0.0 || ^19.0.0",
  "react-dom": "^18.0.0 || ^19.0.0"
},
"dependencies": {
  "@fayz-ai/core": "workspace:*",
  "@fayz-ai/ui":   "workspace:*"
  // …other @fayz-ai/* as workspace deps
}
```

- `react` / `react-dom` are **peers** (host owns the single React instance).
- `@fayz-ai/*` are **dependencies** (workspace-linked; the app installs the tree).
- Everything a `tsup.config.ts` marks `external` must resolve at the app — either a peer
  or a dependency.

---

## 8. RLS, grants, and the anon seam

### 8.1 Tenant-scoped tables (the default)

Every `plg_*` table: `ENABLE ROW LEVEL SECURITY` + four policies scoped to
`tenant_id IN (SELECT public.user_tenant_ids())` + `GRANT … TO authenticated`. Cross-schema
reads go through the `v_*` bridge views (PostgREST can't join core × plugin) — query the
views, not the raw tables.

### 8.2 Anonymous storefront (shop / courses)

Anon users cannot read/write plugin tables directly. Two mechanisms:

- **Read** — narrow public-catalog policies granting `anon` `SELECT` on catalog tables
  only (`plg_shop_products_public_read`, `plg_courses_courses_public_read`), plus the outer
  table `GRANT SELECT … TO anon`.
- **Write** — `SECURITY DEFINER` RPCs are the *only* trusted mutation path, `REVOKE ALL …
  FROM PUBLIC` then `GRANT EXECUTE … TO anon`:
  - `shop_resolve_customer`, `shop_place_order`, `shop_confirm_payment`
  - `course_place_order`, `course_confirm_payment`

### 8.3 The payment seam

`shop_confirm_payment(order_id, status)` / `course_confirm_payment(...)` are the payment
seam: a mock/dev provider or a real gateway webhook calls the RPC to flip an order to paid
without the client holding an `UPDATE` grant on the orders table. RPC **function names are
stable** across the `plg_*` table rename — only table names moved.

---

## 9. Acceptance checklist (before stable publish)

- [ ] `pnpm -r build` · `pnpm -r typecheck` · `pnpm -r test` green
- [ ] `pnpm check:idempotent-migrations` green
- [ ] `pnpm check:plugin-patterns` / `check:plugin-capability` green
- [ ] table-owning plugin has `data/tables.ts` (`T`); providers + registries use `T.*`
- [ ] `.sql` edited → `node scripts/embed-migrations.mjs` re-run, barrel committed
- [ ] `package.json` exports every `tsup` entry; runtime surface only grew
- [ ] react/react-dom peers `^18 || ^19`; `@fayz-ai/*` as workspace deps
- [ ] new anon paths go through `SECURITY DEFINER` RPCs with explicit grants

---

## 10. Known deviations (documented, not bugs)

| Case | Why it stays |
|---|---|
| `plugin-auth`, `plugin-payments` skip the surface manifest (§5) | capability packages, not page plugins |
| `plugin-agenda` bridge references `plg_financial_*` literals | cross-plugin financial bridge; owner plugin's names, not agenda's own `T` |
| `packages/sdk/src/shop.ts` uses `plg_shop_*` literals (incl. relational `select` fragments) | self-contained anon-storefront REST client; duplicates `@fayz-ai/shop`'s `T`. Follow-up: import `T` once `@fayz-ai/shop` exports it |
