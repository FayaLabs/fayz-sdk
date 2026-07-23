# @fayz-ai/saas

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

- Updated dependencies [9c83f41]
- Updated dependencies [3b2a707]
  - @fayz-ai/db@0.8.1
  - @fayz-ai/core@0.8.2
  - @fayz-ai/sdk@0.8.2
  - @fayz-ai/auth@0.8.2

## 0.7.0

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

- d04bf96: Content planner wave (beauty-saas validation):

  **plugin-marketing**

  - Multi-platform accounts (`platforms text[]`, migration 002): one account/brand, many connections (Instagram, TikTok, YouTube, Facebook, LinkedIn, X, Pinterest, Threads); posts carry optional platform targets
  - Board never blanks without an account: master account dropdown with empty state + create/settings modal (name, handle, platforms, inline two-step delete confirm — no modal-over-modal)
  - Three views: Semanal (weeks anchored to real dates/months), Mensal (calendar with unscheduled tray, day-click create), Lista (audit table)
  - Post cards: hover trash + drag between weeks; new posts prefill scheduled date from the selected week
  - Plan brief opens as a right Sheet; new formats video/live/article with script templates; tenant-reactive reload (accounts no longer vanish after refresh)
  - `deleteAccount` across provider/store; content tab icon (Clapperboard) now renders

  - Recording-day ops: persisted shooting checklist per post ("generate from script" seeds one item per TAKE), expanded by default only on the post's release day; static posts get a Caption label + media upload (public `mkt-media` bucket, migration 003) and a social post preview (Instagram/Facebook/LinkedIn/X frames, one tab per platform)
  - Monthly view: days holding more posts than fit show a "+N" expander

  **saas**

  - `useModuleNavigation`: hash parser reconstructs `view:id` for `/x/post/<id>` routes and any trailing-UUID path — deep links no longer fall back to the module home

  **ui**

  - New `ContentSplit`/`ContentSplitTrigger` layout: main content + right companion panel, mobile-first (Sheet below `lg`, sticky docked column above, collapsible into a reopen rail); `MarkdownEditor` gains a `renderPreview` seam
  - `ICON_MAP` gains Clapperboard; Select/Dropdown menu items use the theme radius token (`rounded-button`) instead of near-square `rounded-sm`

- Updated dependencies [c88dd5c]
- Updated dependencies [d04bf96]
- Updated dependencies [c88dd5c]
  - @fayz-ai/core@0.7.0
  - @fayz-ai/ui@0.7.0
  - @fayz-ai/auth@0.7.0
  - @fayz-ai/plugin-auth@0.1.1

## 0.6.0

### Patch Changes

- Updated dependencies
  - @fayz-ai/sdk@0.6.0
  - @fayz-ai/ui@0.6.0
  - @fayz-ai/core@0.6.0
  - @fayz-ai/auth@0.6.0

## 0.5.0

### Minor Changes

- Re-align the whole SDK suite onto a single version line (0.5.0). The linked group had drifted across separate release runs (sdk 0.2.0 … storefront 0.4.0); this bumps every suite package together so "the SDK" has one coherent version. `@fayz-ai/portal` and `@fayz-ai/courses` are added to the linked group. No behavioural changes — version hygiene only.

### Patch Changes

- Updated dependencies
  - @fayz-ai/sdk@0.5.0
  - @fayz-ai/core@0.5.0
  - @fayz-ai/auth@0.5.0
  - @fayz-ai/ui@0.5.0

## 0.3.0

### Minor Changes

- saas: become the single app front door so apps can depend on `@fayz-ai/saas` alone.

  - Main entry re-exports curated `@fayz-ai/core` runtime (`renderApp`, `getSupabaseClientOptional`, `getActiveTenantId`, `setCurrentLocale`) plus `EntityDef`/`ConnectorDefinition` types, and `fayz` + `FayzTableFilter` from `@fayz-ai/sdk`.
  - New subpath exports `@fayz-ai/saas/ui` (re-exports `@fayz-ai/ui`) and `@fayz-ai/saas/db` (re-exports `@fayz-ai/db`), kept on their own module graphs to protect tree-shaking.
  - Adds `@fayz-ai/sdk` and `@fayz-ai/db` as dependencies.

  This is a facade over the existing package boundaries — no consolidation; the internal saas→ui→core edges are unchanged.

## 0.2.0

### Patch Changes

- Updated dependencies [bd8e8cd]
  - @fayz-ai/core@0.2.0
  - @fayz-ai/auth@0.2.0
  - @fayz-ai/ui@0.2.0

## 0.1.8

### Patch Changes

- Financial ERP extract: bill vs payment split (each payment is its own ledger row),
  real bank-style extract with opening/closing balance + transfers + card net settlement,
  account-linked payments, and a per-person statement tab (DetailTab.requiresWidgetZone +
  person.detail.financial widget zone). Includes supporting core/saas detail-tab wiring.
- Updated dependencies
  - @fayz-ai/core@0.1.8
  - @fayz-ai/ui@0.1.8

## 0.1.7

### Patch Changes

- Ship package READMEs to npm. Republish the SaaS foundation packages so their
  npm pages render the new story-driven READMEs (npm only shows a README for a
  freshly published version). No code changes — docs only.
- Updated dependencies
  - @fayz-ai/core@0.1.7
  - @fayz-ai/auth@0.1.7
  - @fayz-ai/ui@0.1.7

## 0.1.6

### Patch Changes

- 413842d: Publish the SaaS app foundation to public npm: core, auth, ui, saas, db, and the
  agenda, financial, inventory, crm, dashboard, marketing, forms, and tasks plugins.
  This unblocks client repos (and the Fayz generator) installing the full plugin set
  as normal npm dependencies instead of via local source links.
- Updated dependencies [413842d]
  - @fayz-ai/core@0.1.6
  - @fayz-ai/auth@0.1.6
  - @fayz-ai/ui@0.1.6
