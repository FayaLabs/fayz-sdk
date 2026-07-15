---
"@fayz-ai/cli": minor
"@fayz-ai/db": patch
"@fayz-ai/auth": patch
---

Developer Center golden path: `fayz db apply` + external-developer packaging.

**Features:**
- `@fayz-ai/cli`: new `fayz db apply [dir]` command — resolves and orders SQL from an app's **installed** `@fayz-ai/*` packages (spine → drizzle → seed → plugins → incubator), plans with `--dry-run` (zero network) and applies via the Supabase Management API. Scaffolds now emit `.env.example` + `CLAUDE.md`, and the README documents the full command/flag/env contract.

**Fixes:**
- `@fayz-ai/db`: ship `migrations/` in the published tarball so `fayz db apply` can resolve the Ring-0 spine from installed deps (not a sibling monorepo checkout).
- `@fayz-ai/auth`: correct dist entry points so the package resolves for external developers on published mode.
