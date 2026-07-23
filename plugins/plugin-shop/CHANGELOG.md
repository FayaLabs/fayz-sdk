# @fayz-ai/plugin-shop

## 0.8.1

### Patch Changes

- 9c83f41: Commerce moves onto the core spine, and the migration chain becomes replay-safe.

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

- Updated dependencies [9c83f41]
  - @fayz-ai/shop@0.8.2
  - @fayz-ai/core@0.8.2
  - @fayz-ai/saas@0.8.2

## 0.2.5

### Patch Changes

- c88dd5c: Portfolio honesty pass: these plugins are marked **[experimental] (incubating)** in package.json + README — not capability-complete (no data-provider pair / registries / migrations per docs/PLUGIN-PATTERNS.md). APIs may change without notice; not ready for fresh installs or generated apps.
- Updated dependencies [c88dd5c]
- Updated dependencies [d04bf96]
- c88dd5c: Portfolio honesty pass: these plugins are marked **[experimental] (incubating)** in package.json + README — not capability-complete (no data-provider pair / registries / migrations per PLUGIN_PATTERNS.md). APIs may change without notice; not ready for fresh installs or generated apps.
- Updated dependencies [c88dd5c]
  - @fayz-ai/core@0.7.0
  - @fayz-ai/ui@0.7.0
  - @fayz-ai/saas@0.7.0
  - @fayz-ai/shop@0.7.0

## 0.2.4

### Patch Changes

- Updated dependencies
  - @fayz-ai/ui@0.6.0
  - @fayz-ai/core@0.6.0
  - @fayz-ai/saas@0.6.0
  - @fayz-ai/shop@0.6.0

## 0.2.3

### Patch Changes

- 14ff307: Replace the near-empty shop settings stub with a real config UI (ShopSettings): Store (currency, locale), Catalog (show out-of-stock, track inventory, require SKU), Checkout (guest checkout, discount codes) and Notifications groups — using SettingsGroup/ToggleRow/SelectRow. Fixes the blank `settings/shop` page.

## 0.2.2

### Patch Changes

- Updated dependencies
  - @fayz-ai/core@0.5.0
  - @fayz-ai/ui@0.5.0
  - @fayz-ai/saas@0.5.0
  - @fayz-ai/shop@0.5.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @fayz-ai/saas@0.3.0

## 0.2.0

### Minor Changes

- bd8e8cd: Lock SDK/plugin architecture boundaries (FAY-1217).

  - Bless the multi-package public surface: packages that generated apps already
    depend on (`storefront`, `shop`, `courses`, and the `plugin-menu` / `-orders` /
    `-tables` / `-sites` / `-shop` / `-reputation` / `-courses` / `-conversations` /
    `-automations` plugins) are now published instead of `private`, fixing apps that
    depended on unpublishable packages.
  - Add `@fayz-ai/sdk/supported-surface` (+ `supported-surface.json`): the
    machine-readable list of packages an app may depend on, with `isSupportedPackage`,
    `getSupportedPackages`, `getInternalPackages` helpers — the contract `fayz doctor`
    checks against.
  - Add `@fayz-ai/sdk/ai-builder`: the AI Builder request taxonomy contract
    (`AI_BUILDER_REQUEST_CLASSES`, `isAllowedRequestClass`) mapping request classes to
    the architecture layer each may touch — the contract the platform classifier targets.
  - Reserve three `PluginManifest` extension seams (`serverActions`, `customFields`,
    `diagnostics`) on `@fayz-ai/core` — contract shape locked, implementation lazy.
  - Point manifest/plugin version-mismatch errors at `@fayz-ai/core` (the package that
    carries the runtime) instead of the deprecated `@fayz-ai/app-runtime` umbrella.
  - Fix plugin-crm typecheck: declare the missing `@fayz-ai/db` + `drizzle-orm`
    devDependencies its drizzle schema needs, so repo-wide typecheck/build is green.

### Patch Changes

- Updated dependencies [bd8e8cd]
  - @fayz-ai/shop@0.2.0
  - @fayz-ai/core@0.2.0
  - @fayz-ai/saas@0.2.0
  - @fayz-ai/ui@0.2.0
