# @fayz-ai/sdk

## 0.8.2

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

## 0.6.5

### Patch Changes

- fayzVite: drop `@tanstack/react-table` from `dedupe`. It's a transitive dep of the `@fayz-ai/*` plugins, not a direct app dep, so it isn't hoisted to the app's root `node_modules`; deduping it made Vite resolve it from the app root and 500 the aliased UI source (data-table) in local-source mode. Keep `lucide-react` dedupe (a direct dep) — that's what collapses the duplicate icon barrels and cuts the preview-container RAM peak.

## 0.6.4

### Patch Changes

- fayzVite: drop the `optimizeDeps.include` added in 0.6.3. Forcing `@tanstack/react-table` (a transitive dep of the `@fayz-ai/*` plugins, not a direct app dep) into `include` made Vite fail to resolve it and 500 any page using the data-table primitive. The `dedupe` of `lucide-react` + `@tanstack/react-table` — which is what actually collapses the duplicate copies and cuts the preview-container RAM peak — is kept.

## 0.6.3

### Patch Changes

- fayzVite: dedupe `lucide-react` + `@tanstack/react-table` and pre-`include` them in `optimizeDeps`. Collapses the dual `lucide-react` copies (~1,500 icon modules each) that a version skew between apps and `@fayz-ai/*` packages installed, cutting the editor preview-container install/optimize RAM peak.

## 0.6.2

### Patch Changes

- fix(sdk): restore preview-container server contract in `fayzVite()`

  The 0.6.0 `fayzVite()` helper stripped the dev-server hardening that the Fayz
  editor's preview containers depend on, so every migrated app returned
  `403 "Blocked request. This host is not allowed."` when reached via the real
  preview hostname (browser iframe through Caddy) or the Docker health probe.

  `fayzVite()` now emits the full template-equivalent `server` block —
  `allowedHosts: true`, `cors: true`, `host: true`, and CORS `headers` — and
  adds `server` / `resolve` override options (previously silently ignored) that
  merge over the SDK defaults without dropping the contract.

## 0.6.1

### Patch Changes

- fix(vite): remove `vite` + `@vitejs/plugin-react` peer dependencies from `@fayz-ai/sdk`. Since sdk sits in every dependency path (app → plugins → core → sdk), declaring build-tool peers made npm's peer resolution explode and the editor install hang. `fayzVite` no longer bundles the React plugin — apps pass their own via `plugins: [react()]`, so sdk carries no build-tool deps.

## 0.6.0

### Minor Changes

- Add shared build-config helpers so apps stop hand-maintaining vite/tailwind SDK wiring:

  - `@fayz-ai/sdk/vite` exports `fayzVite(opts)` — resolves `@fayz-ai/*` from local SDK source when checked out next to the app (and `FAYZ_SDK_SOURCE !== 'published'`), else from node_modules (Fayz sandbox / published). Encapsulates the alias map, dedupe, conditions, optimizeDeps and `server.fs` once.
  - `@fayz-ai/ui/tailwind` exports `fayzTailwind(opts)` — the Fayz UI preset + SDK content globs (node_modules + sibling checkout) in one call.

  Eliminates the per-app existsSync guard, alias lists and content globs (and the drift that caused sandbox resolution failures).

## 0.5.0

### Minor Changes

- Re-align the whole SDK suite onto a single version line (0.5.0). The linked group had drifted across separate release runs (sdk 0.2.0 … storefront 0.4.0); this bumps every suite package together so "the SDK" has one coherent version. `@fayz-ai/portal` and `@fayz-ai/courses` are added to the linked group. No behavioural changes — version hygiene only.

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
