# FAYZ-CLOUD-MIGRATION — consolidate every module/app onto the shared FayzApi backend

Status: ACTIVE · Started: 2026-07-14 · Owner: founder + Fable
Companion ADR: docs/design/FAYZ-CLOUD.md (decisions). Tracker style follows DEVCENTER-EXECUTION.

**Goal:** one shared multi-tenant Supabase project — **FayzApi** (`yfxutrkyhydgltakbqle`,
custom domain `api.fayz.ai` pending SSL) — as the DEFAULT backend for all Fayz-hosted
modules (calendar, shop, saas plugins), with BYO-Supabase as the override for clients
needing isolation. Kills the project-per-module drift (6 SaaS projects + 1 shop project
found in the 2026-07-14 survey).

## Locked decisions (founder, 2026-07-14)

1. ONE shared project (FayzApi) for all modules; tenants isolated by RLS.
2. Plugin-specific tables live in `public` with a `plg_`-style prefix (shop already does
   this as `shop_*` — blessed as-is; new plugins use `plg_<plugin>_*`). Shared entities
   stay in `saas_core` (rename to `core` evaluated and rejected — function bodies break,
   cosmetic gain). `public` views/RPCs remain the anon API surface.
3. No new package: cloud defaults live in `@fayz-ai/core` (`getFayzCloudClient`,
   `FAYZ_CLOUD_URL`, `FAYZ_CLOUD_PUBLISHABLE_KEY`). App-registered client (BYO) always
   wins; explicit `dataProvider` wins over everything; mock fallback is LOUD.

## Phase 0 — SDK foundation · branch feat/fayz-api-default

- [x] core 0.7.2: data/cloud.ts (Fayz Cloud lazy client + constants) — built, typecheck green
- [x] plugin-agenda 0.4.0: data.supabase falls back global→cloud; factory resolution
      dataProvider → tenantId(supabase) → LOUD mock; manifest 0.4.0
- [x] full workspace build 34/34 green
- [ ] PUBLISH core 0.7.2 + plugin-agenda 0.4.0 — **BLOCKED: needs founder to run
      `pnpm --filter @fayz-ai/core publish --access public --no-git-checks && pnpm --filter @fayz-ai/plugin-agenda publish --access public --no-git-checks`
      from /Users/fayalabs/dev/fayz-sdk-cloud (classifier denies agent npm publish)**
- [ ] release-channels sync + ADR + push branch
- [ ] flip FAYZ_CLOUD_URL to https://api.fayz.ai once SSL validates (TXT record pending:
      `_acme-challenge.api.fayz.ai` = `LTZztsJNOGLUCZvjGHSH4_IW1XaG1t3vD9aDHBYlOR0`) → core 0.7.3

## Phase 1 — Booking apps (already on FayzApi data)

- [ ] hempdent / great-djs-school / espaco-renova-rio: bump plugin-agenda ^0.4.0, DELETE
      hardcoded URL/key fallbacks from website.tsx (SDK default supersedes), keep env
      override; build + e2e booking each; push main
      (gated on Phase 0 publish)

## Phase 2 — Stores → FayzApi (shop module)

Survey: shopfront `…0101`, pulse `…0102`, tannat `…0103`, artorious `…0104` all live on
project `euzqjcusjloljlgwlkiw` (shop_* tables, RLS by tenant_id=storeId, RPC
shop_place_order); cristinarotondaro `…0121` mock/enquiry-mode.

- [ ] Apply packages/shop/migrations (0001 schema, 0002 storefront RLS, 0003 place_order,
      + any views bridging product_images/categories relation names) to FayzApi
- [ ] Create saas_core.tenants rows for the 5 stores (same fixed UUIDs)
- [ ] Copy catalog data (categories/products/images/discounts) euzq → FayzApi via
      Management API for the 4 live stores
- [ ] Flip each store's .env (PUBLIC_SUPABASE_URL/KEY → FayzApi) + app.manifest.json
      backend { projectRef, tenantId }; storefront e2e per store (catalog renders, mock
      checkout writes shop_orders in FayzApi); push main
- [ ] cristinarotondaro: decision — stays mock/enquiry (no checkout); only manifest
      normalization now

## Phase 3 — Mock SaaS apps → FayzApi tenants

- [ ] Apply plugin migrations used by db-apply ENABLED_PLUGINS (financial, crm, inventory,
      forms, tasks, marketing — whatever ships in SDK packages) to FayzApi
- [ ] agency-os: create tenant, pass supabaseUrl/key (FayzApi) in config, unmock; build+smoke
- [ ] norman-ai: tenant + VITE_SUPABASE_ENABLED=true against FayzApi; build+smoke
- [ ] marketplace-saas: tenant + real env (was template-only); build+smoke
- [ ] manifest normalization everywhere: backend { provider, projectRef, tenantId }

## Phase 4 — FOUNDER DECISIONS (do not execute unilaterally)

- [ ] beauty-saas: RECOMMEND stay BYO (own project gphxclpkbtbucoqclbco holds REAL clinic
      data — it becomes the reference BYO app); conform manifest/env contract only.
      Migrating its data into FayzApi is a founder call.
- [ ] course-admin (+course-members): coqp project is "central fayz-course" and repo mixes
      Vini's live Lovable prototype — migrate courses module to FayzApi only after
      coordinating with Vini.
- [ ] the-channel: NOT an SDK app (standalone supabase-js) — out of scope; flag only.
- [ ] resto-saas runtime-API plugins (menu/orders/tables via VITE_FAYZ_RUNTIME): dual
      backend today; decide whether restaurant module moves to FayzApi tables or stays on
      platform runtime API.
- [ ] Secret hygiene found by survey: committed PATs in course-admin/.env.local and
      the-channel/.env — rotate (overlaps devcenter C1).

## Phase 5 — Verification sweep + docs

- [ ] All migrated apps: prod build green + key-flow e2e recorded here
- [ ] Update DATA-MODEL/MIGRATION-ARCHITECTURE with PROPOSED AMENDMENT (prefix convention,
      shared-project default), memory files, release-channels
- [ ] Rate-limit/quotas plan for anon RPCs on the shared project (pre-req to scale)

## Log

- 2026-07-14 · Phase 0 code done (core cloud client + agenda 0.4.0 resolution); full build
  34/34; publish blocked on founder (classifier). Surveys of 14 apps completed and folded
  into phases above. (Fable)
