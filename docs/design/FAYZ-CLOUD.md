# ADR — Fayz Cloud: one shared backend, Stripe-style SDK defaults

Date: 2026-07-14 · Status: ACCEPTED (founder) · Execution: docs/checkpoints/FAYZ-CLOUD-MIGRATION.md

## Context

Modules were drifting toward one Supabase project each (fayz-calendar, shop project,
6 SaaS app projects). That fragments the future admin SaaS (users managing their data in
one place), multiplies provisioning, and made previews break silently: apps resolved
backends from env vars that hosting containers don't carry, and the safe-provider fell
back to an EMPTY mock with no warning.

## Decisions

**D1 — One shared multi-tenant project: FayzApi** (`yfxutrkyhydgltakbqle`, custom domain
`api.fayz.ai`). Every Fayz-hosted module (calendar, shop, saas plugins) lives there;
tenant isolation via RLS (`saas_core.tenants` + tenant_id columns). The old
"fayz-calendar" project WAS already the full saas_core spine — it simply becomes FayzApi.

**D2 — Table placement.** Shared business entities (tenants, persons, services, orders,
bookings, schedules…) stay in `saas_core` — cross-module by design (a calendar booking IS
an order). Plugin-specific tables go in `public` with a plugin prefix (`shop_*` blessed
as-is; new ones `plg_<plugin>_*`) — avoids PostgREST's no-cross-schema limitation without
bridge views for plugin data. `public` views (`v_*`) + SECURITY DEFINER RPCs remain the
anon API surface. Renaming `saas_core`→`core` was evaluated and REJECTED: Postgres schema
rename breaks every function body referencing `saas_core.*` across all live projects, for
a cosmetic gain.

**D3 — SDK ships the endpoint, apps ship identity (Stripe model).** `@fayz-ai/core`
exports `getFayzCloudClient()` + `FAYZ_CLOUD_URL/_PUBLISHABLE_KEY` (no new package). The
publishable key is public by design; all anon access crosses validated RPCs/whitelisted
views. Resolution order everywhere: explicit `dataProvider` → app-registered client
(`setGlobalSupabaseClient`, the BYO override) → Fayz Cloud (when the plugin got a
`tenantId`) → mock, and the mock fallback must console.warn (silent fallback hid bugs).

**D4 — BYO stays first-class.** Clients needing isolation run their own project carrying
the same infra (spine + plugin migrations), provisioned by `fayz db apply`. beauty-saas
is the reference BYO app.

## Consequences

- Previews/forks work with zero env config (tenantId is in code/manifest).
- Key rotation = one core patch until `api.fayz.ai` DNS indirection is active; afterwards
  rotation happens behind the domain.
- Rate limiting/quotas per tenant on anon RPCs graduate from "deferred" to a scale
  pre-requisite (shared blast radius).
- Tenant provisioning on FayzApi is platform-only (service role); anon grants were
  revoked by db migration 009.
- `app.manifest.json` `backend` block becomes the machine-readable contract:
  `{ provider: 'supabase', projectRef, tenantId }` — the fayz builder/compiler should
  materialize env/config from it at import time.
