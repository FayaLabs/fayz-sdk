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
