# @fayz-ai/plugin-crm

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
- Updated dependencies [3b2a707]
  - @fayz-ai/db@0.8.1
  - @fayz-ai/core@0.8.2
  - @fayz-ai/saas@0.8.2

## 0.3.0

### Minor Changes

- c88dd5c: Foundation cleanup + mobile/B2C wave + auth extraction.

  **Breaking (0.x minor):**

  - `@fayz-ai/saas`: `createSaasApp` / `SaasAppConfig` / `PageConfig` / `createFayzApp` removed — the only entry is `defineSaas(FayzAppConfig)` + `renderApp`. Settings tabs single-sourced in AdminShell.
  - `@fayz-ai/core`: removed conflicting duplicate `SaasTheme`/`ThemeConfig` types (use `@fayz-ai/saas`), removed unused `PluginServerAction`/`PluginCustomFieldsDef`/`marketplace` manifest fields, `createFayzApiProvider` moved to `data/platform-api` (public export unchanged).
  - `@fayz-ai/storefront`: `slot-contracts` replaced by `component-contracts` + `component-selectors`; new `define.*` config entry; new section components (MediaCarousel, ProductSlider, SmoothImage, ProductEnquiryForm).

  **Features:**

  - New `DashboardSurface` `'finance-home'` — B2C consumer-finance home widgets are scoped to it and never leak onto the B2B `'home'` dashboard.
  - `plugin-financial`: opt-in `quickAdd` option (header buttons default OFF); Mobills-grade responsive quick-add/cards/receipt views; native home dashboard widgets.
  - `plugin-agenda`: `eventMode: 'simple'` (Google-Calendar-style events) + Lista view.
  - `@fayz-ai/saas`: mobile bottom tab bar + center action, transparent mobile header, brand sidebar derivation, explicit `__kind` theme discriminator with centralized `isSaasTheme()`.
  - `@fayz-ai/auth`: adapter contract extended (resetPassword redirectTo, updatePassword, handleCallback); auth pages/forms extracted into the new `@fayz-ai/plugin-auth` package (first release, consumed by saas).

### Patch Changes

- Updated dependencies [c88dd5c]
- Updated dependencies [d04bf96]
  - @fayz-ai/core@0.7.0
  - @fayz-ai/ui@0.7.0
  - @fayz-ai/saas@0.7.0

## 0.2.3

### Patch Changes

- Updated dependencies
  - @fayz-ai/ui@0.6.0
  - @fayz-ai/core@0.6.0
  - @fayz-ai/saas@0.6.0

## 0.2.2

### Patch Changes

- Fix the `./schema` export's `types` path — point it at `./dist/schema/index.d.ts` (where tsc emits the declaration for the nested `src/schema/index.ts`) instead of the non-existent flat `./dist/schema.d.ts`. Without this, consumers got TS7016 (implicit any) on `@fayz-ai/plugin-crm/schema` in published mode.

## 0.2.1

### Patch Changes

- Updated dependencies
  - @fayz-ai/core@0.5.0
  - @fayz-ai/ui@0.5.0
  - @fayz-ai/saas@0.5.0

## 0.2.0

### Minor Changes

- Expose the CRM Drizzle schema on a `@fayz-ai/plugin-crm/schema` subpath so apps can `export * from '@fayz-ai/plugin-crm/schema'` in published (npm) mode, not just via local-source aliases. Adds the `./schema` export + tsup entry and moves `@fayz-ai/db` to a runtime dependency (kept external so there's a single drizzle-orm instance).

## 0.1.4

### Patch Changes

- Updated dependencies
  - @fayz-ai/saas@0.3.0

## 0.1.3

### Patch Changes

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

- Updated dependencies [bd8e8cd]
  - @fayz-ai/core@0.2.0
  - @fayz-ai/saas@0.2.0
  - @fayz-ai/ui@0.2.0

## 0.1.2

### Patch Changes

- Ship package READMEs to npm. Republish the SaaS foundation packages so their
  npm pages render the new story-driven READMEs (npm only shows a README for a
  freshly published version). No code changes — docs only.
- Updated dependencies
  - @fayz-ai/core@0.1.7
  - @fayz-ai/ui@0.1.7
  - @fayz-ai/saas@0.1.7

## 0.1.1

### Patch Changes

- 413842d: Publish the SaaS app foundation to public npm: core, auth, ui, saas, db, and the
  agenda, financial, inventory, crm, dashboard, marketing, forms, and tasks plugins.
  This unblocks client repos (and the Fayz generator) installing the full plugin set
  as normal npm dependencies instead of via local source links.
- Updated dependencies [413842d]
  - @fayz-ai/core@0.1.6
  - @fayz-ai/ui@0.1.6
  - @fayz-ai/saas@0.1.6
