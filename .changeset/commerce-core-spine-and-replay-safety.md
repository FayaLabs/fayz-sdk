---
"@fayz-ai/shop": minor
"@fayz-ai/storefront": minor
"@fayz-ai/db": minor
"@fayz-ai/core": minor
"@fayz-ai/saas": minor
"@fayz-ai/sdk": minor
"@fayz-ai/plugin-shop": minor
"@fayz-ai/plugin-crm": minor
"@fayz-ai/plugin-financial": minor
"@fayz-ai/plugin-inventory": patch
---

Commerce moves onto the core spine, and the migration chain becomes replay-safe.

**Spine:**
- `@fayz-ai/db`: `public.addresses` becomes a spine table (`017_core_addresses.sql`). It shipped inside `@fayz-ai/shop` until now, so every non-shop vertical rendered "Could not find the table 'public.addresses'" on the person archetype's addresses tab. Additive and replay-safe on pools that already have it.
- `@fayz-ai/shop`: orders, customers and categories become core records (`people` · `orders` · `order_items` · `categories`), expand-phase only — ids preserved, nothing dropped, a trigger keeps the two in step.
- `@fayz-ai/shop`: placing an order raises a real receivable and the parallel ledger is retired. `public.transactions` keeps its rows and stays the generic archetype table other verticals use; the shop stops being one of its writers, and settled history was migrated across.

**Fixes (retro-compatibility on already-provisioned pools):**
- `@fayz-ai/shop` 0024: the paid-history snapshot was a `CREATE TEMP TABLE ... ON COMMIT DROP` executed outside a transaction block, so it was destroyed by its own commit and the historical receipt backfill never ran.
- `@fayz-ai/shop` 0021: `shop_quote_shipping` is dropped before creation — 0022 widens its OUT columns, and `CREATE OR REPLACE` cannot change a row type, so replaying 0021 on a pool that had reached 0022 was a hard error.
- `@fayz-ai/shop` 0019: the replacement `storefront_public_read` policies had no `DROP POLICY IF EXISTS` of their own.
- `@fayz-ai/plugin-crm`: `006_lead_enters_pipeline.sql` existed on disk but was never embedded into `MIGRATIONS`, so it could not be applied at all.
- `@fayz-ai/plugin-crm`: `updateLead` replaced `people.metadata` wholesale, erasing the public form's answers (`formId`/`fields`/`utm`) whenever a lead's status was edited — the third call site of the bug the pipeline drag fix addressed.
- `packages/shop/test/run-migrations.sh`: a failing migration was swallowed by `cmd && echo ok` (not a `set -e` context), so the bench graded a half-provisioned database and still printed "all regressions passed". It now aborts on apply failure, applies 0025, and replays the whole chain twice to assert convergence.

**Features:**
- `@fayz-ai/core`: postal-code helpers + pluggable lookup provider (`lookupPostalCode`, `createViaCepProvider`).
- `@fayz-ai/saas`: the addresses archetype tab becomes editable (create/edit/delete, default handling); `FieldDef.hint` is carried into the agent contract, and spine tables whose surface is a detail tab are projected into it.
- `@fayz-ai/storefront`: delivery estimation, product gallery, server-derived shipping.
- `@fayz-ai/plugin-inventory`: `modules.products` opt-out for hosts that register products elsewhere (defaults on — existing apps are unaffected).
