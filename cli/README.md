# @fayz-ai/cli — `fayz`

The Fayz SDK command-line tool. Scaffolds repo-per-app projects, validates
manifests/architecture boundaries, assists code-config → manifest migration, and
provisions an app's Supabase database from its installed `@fayz-ai/*` packages.

```bash
fayz --help
fayz --version
```

## Commands

| Command | What it does |
|---------|--------------|
| `fayz create <storefront\|admin\|member> <name>` | Scaffold a new repo-per-app project |
| `fayz create plugin <name>` | Scaffold an app-local (incubator) plugin |
| `fayz doctor [dir]` | Validate manifest + architecture boundaries |
| `fayz extract [dir]` | Assisted code-config → manifest migration |
| `fayz db apply [dir]` | Plan / apply the Supabase migration order |
| `fayz db pool status` | Show each industry pool's migration ledger |
| `fayz db pool apply <name> --app <dir>` | Ledger-gated apply of an app's plan to one pool |
| `fayz db fan-out --app <dir>` | Apply an app's plan across pools (canary first) |
| `fayz db pool move-tenant` | Print the (manual) tenant-move procedure |

## `fayz db apply`

Provisions an app's Supabase database by resolving SQL from the app's **installed**
`@fayz-ai/*` packages (never a sibling `../../fayz-sdk` checkout), so an external
developer with only published deps can provision a fresh project.

> Working inside the monorepo? See [`docs/LOCAL-DEV.md`](../docs/LOCAL-DEV.md) for how an
> app resolves `@fayz-ai/*` from local SDK source vs. published packages
> (`FAYZ_SDK_SOURCE`, the `*:published-sdk` scripts).

The plan is ordered:

1. **spine** — `@fayz-ai/db` `migrations/*.sql` (Ring-0 `saas_core`)
2. **drizzle** — app `drizzle/*.sql` (generated table DDL)
3. **seed** — app `supabase/seed-saas-core.sql`
4. **plugin** — each enabled plugin's `src/migrations/*.sql`, in `app.manifest.json` order
5. **incubator** — app-local `src/plugins/<name>/migrations/*.sql`

Applying runs each step's SQL via the Supabase Management API
(`POST /v1/projects/{ref}/database/query`, bearer `SUPABASE_PAT`) in plan order,
then issues `NOTIFY pgrst, 'reload schema'` so PostgREST picks up new
functions/views. Because plugin/spine SQL is authored idempotent, re-running after
a failure is safe — apply stops at the first bad file and names the step/file.

### Usage

```bash
# Print the ordered plan only — zero network, no env required:
fayz db apply ./my-app --dry-run

# Apply for real (prompts to confirm the target project ref):
fayz db apply ./my-app

# Non-interactive (CI): skip the prompt:
fayz db apply ./my-app --yes
```

`[dir]` defaults to the current directory.

### Flags

| Flag | Effect |
|------|--------|
| `--dry-run` | Print the ordered plan only; performs no network calls |
| `--yes`, `-y` | Skip the confirmation prompt (**required** in non-interactive shells) |
| `--spine-only` | Apply only the `@fayz-ai/db` spine |
| `--plugins-only` | Apply only plugin + incubator migrations |
| `--only-plugins a,b` | Restrict the plugin step to the named plugin ids |

`--spine-only` and `--plugins-only` are mutually exclusive.

### Environment contract

Required for a real apply (never for `--dry-run`); **never defaulted**:

| Variable | Alias | Where to get it |
|----------|-------|-----------------|
| `SUPABASE_PROJECT_REF` | `SUPABASE_REF` | Dashboard → Project Settings → General (also the project URL subdomain) |
| `SUPABASE_PAT` | `SUPABASE_ACCESS_TOKEN` | Dashboard → Account → Access Tokens → Generate new token |

Resolution order: **process env → `<app>/.env.local` → `<app>/.env`**. Files never
override an already-set process variable. If either credential is missing, apply
exits non-zero naming both required vars. In a non-interactive shell without
`--yes`, apply **refuses rather than hangs** waiting on stdin.

## Industry pools (Runner v2) — `fayz db pool` / `fayz db fan-out`

The platform runs one Supabase project per **industry pool**
(`cluster-<industry>-br-<shard>`); `tenant_id` + RLS is the isolation. Runner v2
adds a **migration ledger** and pool-aware apply on top of the same plan builder.

### The ledger (`public.fayz_migration_ledger`)

Every applied SQL file is recorded with its content **sha256 checksum**
(`plugin_id` + `file_name` + `checksum`, service-role only, RLS deny-all through
PostgREST). On apply, each file is gated:

| Ledger state for the file | Action |
|---------------------------|--------|
| absent | apply, then record it |
| present, **same** checksum | **skip** (`skip (applied)`) |
| present, **different** checksum | **HARD STOP** — `MigrationDriftError` |

> **Never edit an applied migration.** A drift stop means the file changed after
> it was applied to that pool; author a *new* migration file instead.

`fayz db apply` (the single-project command) is unchanged and **not** ledger-gated
— byte-for-byte the same behaviour. The ledger gate is only engaged by the pool
commands below.

### Pool registry (two sources)

Pool refs/flags come from a registry with two interchangeable sources:

- **Source A (default):** the static [`pools.config.json`](./pools.config.json)
  shipped with the CLI. Override with `--pools-file <path>`. Fields per pool:
  `industry, name, ref, url, status (ACTIVE|PROVISIONING|DECOMMISSIONED), flags`.
  Flags: `canary`, `dataCritical`, `preserveBespoke`.
- **Source B (later):** the platform Prisma Postgres registry via
  `FAYZ_REGISTRY_URL` / `DATABASE_URL`. The interface is defined
  (`createPostgresPoolRegistry`) but **not yet wired** — it currently throws
  `registry not yet provisioned; use --pools-file`. Wiring it means adding a
  Postgres client (`pg`); the CLI is kept dependency-free until then.

The **access token** comes from `SUPABASE_PAT` / `SUPABASE_ACCESS_TOKEN`. The
**project ref is NOT read from env** for pool commands — it comes from the pools
file per pool.

### Commands

```bash
# Show each pool's ledger head (plugin_id → latest file/version). "NO LEDGER"
# means the table is absent (pool never provisioned). Add --app <dir> to compare
# against a locally-built plan head.
fayz db pool status [--pools-file f] [--app dir]

# Ledger-gated apply of ONE app's plan to ONE pool (resolve by industry, cluster
# name, or ref). The app determines the plugin set. For a pool-level core-only
# run, point --app at a plain dir that has node_modules/@fayz-ai/db installed and
# pass --spine-only.
fayz db pool apply <industry-or-pool-name> --app <dir> [--dry-run --yes --spine-only --plugins-only --only-plugins a,b]

# Fan-out an app's plan across pools: the canary first (default: the pool flagged
# canary:true, or --canary <pool>), then the rest sequentially, FAIL-FAST. A
# per-pool summary prints at the end. PROVISIONING pools are skipped unless named.
fayz db fan-out --app <dir> [--industry all|<slug>] [--canary <pool>] [--yes] [--allow-critical]

# Tenant move between pools — NOT YET AUTOMATED. Prints the manual procedure
# (backup → copy rows by tenant_id → verify counts → delete source → update
# registry) and exits non-zero. Automation lands in M3 if needed.
fayz db pool move-tenant
```

### Data-critical gate

A pool flagged `dataCritical: true` (real production data) refuses to apply unless
**both** `--yes` **and** `--allow-critical` are passed — in `pool apply` and in
`fan-out` (any dataCritical pool in the wave).
