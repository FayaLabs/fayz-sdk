# Fayz Migration Architecture — LOCKED

**Status: locked v1 (2026-06-17).** The canonical *summary* now lives in [../DATA-MODEL.md](../DATA-MODEL.md) §5; this RFC remains the detailed spec every `fayz-app/` project follows.
The reasoning/history lives in [PLUGIN-MIGRATIONS.md](./PLUGIN-MIGRATIONS.md); this is the rule.

---

## 1. The model in one screen

A database is provisioned from **three ordered layers**, each owned by exactly one place:

| Layer | Owner | Lives in | Tooling |
|-------|-------|----------|---------|
| **Spine** (Ring 0, `saas_core`) | platform | `@fayz-ai/db` | base SQL, applied first |
| **Plugin schema** (Ring 1) | each plugin | `plugins/<p>/src/schema/` (tables, Drizzle) + `plugins/<p>/src/migrations/*.sql` (functions, views, RLS, grants, **seeds**) | Drizzle + companion SQL |
| **App schema** (Ring 2/3) | the app | `<app>/src/db/schema/` (Drizzle) | Drizzle |

**A plugin owns ALL of its SQL** — tables *and* functions/views/RLS/seeds — and that SQL travels with
the plugin. Enabling a plugin provisions its full backend. No plugin SQL lives in an app.

## 2. Tooling (locked choices)

- **Drizzle Kit** generates table DDL by diffing TS schema against `drizzle/meta/_snapshot.json`
  (`pnpm db:generate`). It owns **tables/columns/indexes/FKs** only.
- **Plugin companion SQL** (`plugins/<p>/src/migrations/*.sql`) carries everything Drizzle can't diff:
  functions, views, RLS policies, grants, seeds. Authored **idempotent** (`CREATE OR REPLACE`,
  `IF NOT EXISTS`, guarded `DO` blocks, `INSERT … WHERE NOT EXISTS`).
- **`pnpm db:apply`** ([scripts/db-apply.mjs](../../fayz-app/agency-os/scripts/db-apply.mjs)) is the
  executor. Apply order: **spine → Drizzle table migrations → each enabled plugin's companion SQL →
  `NOTIFY pgrst, 'reload schema'`**. Transport = Supabase Management API (no PG connection string
  needed); the Fayz editor implements the same executor against the project DB.
- **`supabase` CLI** owns the *platform* (auth, storage, edge functions, local stack) — NOT schema.

## 3. The dev/deploy proxy (resolve SDK locally, published when shipped)

One rule, three resolvers (see [PLUGIN-MIGRATIONS.md §3c]):
- **vite** (runtime): `resolve.alias` → `../../fayz-sdk/*/src`, dropped when `FAYZ_SDK_SOURCE=published`.
- **tsc** (types): `tsconfig.json` `paths` → local src (one `*` max per pattern).
- **drizzle-kit** (schema): **node_modules** only (ignores alias + paths) → `link:` dev-deps to the SDK
  packages. Always local — generate is dev-only; deploys apply pre-generated SQL.
- Source-only packages MUST expose a `"default"` export condition (drizzle-kit's loader is CJS).

## 4. supabase/migrations → drizzle: the retirement sequence

The legacy `supabase/migrations/` is **frozen, not ported**. The live DB already embodies those files,
so they become a historical record; the going-forward source is Drizzle + plugin companion. Retire per app:

1. **Prereq — spine has a home.** `@fayz-ai/db` ships the canonical spine SQL, so a fresh DB can be
   provisioned without the app's copied spine migrations. *Until this exists, do NOT delete legacy.*
2. **Baseline.** Author the app's Drizzle schema (Ring 2/3) + the spine refs to match the live DB;
   `db:generate` once → baseline snapshot (not applied — the DB already has it). Optional clean path:
   `drizzle-kit pull` (needs a PG connection string) regenerates the baseline from the live DB.
3. **Relocate plugin SQL into plugins** (functions/views/RLS/seeds) — done for crm + financial.
4. **Freeze** legacy: move `supabase/migrations/*` → `supabase/migrations.legacy/` (archive, don't
   delete — it's the provenance of the current live DB and the fallback for disaster recovery).
5. Going forward: `db:generate` for tables, plugin companion for the rest, `db:apply` to run.

## 5. Per-app adoption playbook

For each app (agency-os ✅ done = the reference):
1. Add `drizzle-orm` dep + `drizzle-kit` + `link:` the SDK schema packages it uses (dev deps).
2. Add `tsconfig.json` `paths` + vite alias for `@fayz-ai/db` and any `@fayz-ai/plugin-*/schema`.
3. `drizzle.config.ts` (dialect postgresql, schema = app barrel, out = `drizzle/`).
4. `src/db/schema/` barrel: spine refs + app Ring-2 tables + `export * from '@fayz-ai/plugin-*/schema'`
   per enabled plugin.
5. `scripts/db-apply.mjs` + `db:generate`/`db:apply` package scripts; set `ENABLED_PLUGINS`.
6. `db:generate` (baseline) → relocate any app-held plugin SQL into the plugins → `db:apply`.
7. Freeze `supabase/migrations/` once the spine home exists.

## 6. One drizzle-orm instance — import builders from `@fayz-ai/db`

App schema files MUST import the Drizzle builders (`pgTable`, `uuid`, …) from **`@fayz-ai/db`**, not
from `drizzle-orm/pg-core` directly. `@fayz-ai/db` re-exports `pg-core`, so the app's tables, the spine
refs, and the plugin schemas all use the **same** drizzle-orm instance. Importing `pg-core` directly
pulls the app's *own* copy → TS sees two distinct `PgColumn` types and the composed barrel fails to
typecheck (bit beauty; agency only escaped by a matching peer hash). Canonical:
```ts
import { pgTable, uuid, text, tenantId, timestamps, persons } from '@fayz-ai/db'
```

## 7. Status

| App | DB current? | Architecture | Legacy |
|-----|-------------|--------------|--------|
| **agency-os** | ✅ | new — drizzle + plugin pipeline (**reference**) | frozen → `supabase/migrations.legacy/` (11) |
| **beauty-saas** | ✅ | new — onboarded (drizzle baseline + proxy + db:apply) | frozen → `supabase/migrations.legacy/` (44) |
| **resto-saas** | ✅ (brought current via db:apply) | new — onboarded (drizzle baseline + proxy + db:apply); runs :5181 | frozen → `supabase/migrations.legacy/` (28) |
| **the-channel** | (verify) | legacy (5 files) | — |

> **Companion SQL must be idempotent** (architecture rule): re-running `db:apply` on an already-provisioned
> DB must be a no-op. `plugin-tasks/001` violated this (bare `CREATE POLICY` → "already exists" on resto)
> and was fixed to `DROP POLICY IF EXISTS` + `CREATE`. Audit other plugins' bare `CREATE POLICY`/`CREATE TRIGGER`.

Spine centralized: `@fayz-ai/db/migrations/` (8 files, Ring-0 only) + applied first by `db:apply`
(fresh-provision; `--plugins-only` skips it for live DBs). Needs a blank-DB smoke test before legacy
can be *deleted* (it's currently *archived*).

**Invariant going forward:** new schema is authored as Drizzle (tables) or plugin companion SQL
(everything else); nothing new is written into `supabase/migrations/`.

---

## PROPOSED AMENDMENT (unsigned) — CLI executor (2026-07-14)

> Appended below the locked v1 spec; nothing above this line is edited. This amendment
> proposes the executor that supersedes the per-app `scripts/db-apply.mjs` referenced in §2.

**The shift.** Provisioning moves from a per-app `scripts/db-apply.mjs` copied into each
project to a single SDK command, `fayz db apply` (`@fayz-ai/cli`). The apply order and the
"a plugin owns all of its SQL" model are unchanged — what changes is *where the executor
lives* and *how it resolves the SQL*. The command resolves everything from the app's
**installed** `@fayz-ai/*` packages (never a sibling `../../fayz-sdk` checkout), so an
external developer holding only published deps can provision a fresh Supabase project.
This supersedes the hardcoded `../../fayz-app/agency-os/scripts/db-apply.mjs` reference in
§2 (that per-app script becomes the reference implementation the CLI generalizes; the §2
line is left intact as provenance).

**Resolution order** (all via node_modules resolution from the app dir):

1. **spine** — `@fayz-ai/db` tarball `migrations/*.sql`
2. **drizzle** — app `drizzle/*.sql`
3. **seed** — app `supabase/seed-saas-core.sql`
4. **plugin** — each enabled plugin's `src/migrations/*.sql`, in `app.manifest.json` order
5. **incubator** — app-local `src/plugins/<name>/migrations/*.sql`

**Executor.** `fayz db apply` executes the ordered plan via the Supabase Management API
(`POST /v1/projects/{ref}/database/query`, bearer `SUPABASE_PAT`), running each step's SQL
files in plan order and finishing with `NOTIFY pgrst, 'reload schema'`. Credentials resolve
from process env → `<app>/.env.local` → `<app>/.env` (files never override an already-set
process var); `SUPABASE_PROJECT_REF` (alias `SUPABASE_REF`) and `SUPABASE_PAT` (alias
`SUPABASE_ACCESS_TOKEN`) are required and never defaulted. Apply prompts for confirmation of
the target project ref unless `--yes`, and refuses (rather than hangs) in non-interactive
shells. Failure stops at the first bad file and names the step/file; because spine and plugin
SQL is authored idempotent, the recovery is to fix and re-run. A checksum ledger
(skip-applied + drift detection) remains the productionization step.
