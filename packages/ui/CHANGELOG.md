# @fayz-ai/ui

## 0.6.0

### Minor Changes

- Add shared build-config helpers so apps stop hand-maintaining vite/tailwind SDK wiring:

  - `@fayz-ai/sdk/vite` exports `fayzVite(opts)` — resolves `@fayz-ai/*` from local SDK source when checked out next to the app (and `FAYZ_SDK_SOURCE !== 'published'`), else from node_modules (Fayz sandbox / published). Encapsulates the alias map, dedupe, conditions, optimizeDeps and `server.fs` once.
  - `@fayz-ai/ui/tailwind` exports `fayzTailwind(opts)` — the Fayz UI preset + SDK content globs (node_modules + sibling checkout) in one call.

  Eliminates the per-app existsSync guard, alias lists and content globs (and the drift that caused sandbox resolution failures).

### Patch Changes

- @fayz-ai/core@0.6.0
- @fayz-ai/auth@0.6.0

## 0.5.0

### Minor Changes

- Re-align the whole SDK suite onto a single version line (0.5.0). The linked group had drifted across separate release runs (sdk 0.2.0 … storefront 0.4.0); this bumps every suite package together so "the SDK" has one coherent version. `@fayz-ai/portal` and `@fayz-ai/courses` are added to the linked group. No behavioural changes — version hygiene only.

### Patch Changes

- Updated dependencies
  - @fayz-ai/core@0.5.0
  - @fayz-ai/auth@0.5.0

## 0.2.0

### Patch Changes

- Updated dependencies [bd8e8cd]
  - @fayz-ai/core@0.2.0
  - @fayz-ai/auth@0.2.0

## 0.1.8

### Patch Changes

- Financial ERP extract: bill vs payment split (each payment is its own ledger row),
  real bank-style extract with opening/closing balance + transfers + card net settlement,
  account-linked payments, and a per-person statement tab (DetailTab.requiresWidgetZone +
  person.detail.financial widget zone). Includes supporting core/saas detail-tab wiring.
- Updated dependencies
  - @fayz-ai/core@0.1.8

## 0.1.7

### Patch Changes

- Ship package READMEs to npm. Republish the SaaS foundation packages so their
  npm pages render the new story-driven READMEs (npm only shows a README for a
  freshly published version). No code changes — docs only.
- Updated dependencies
  - @fayz-ai/core@0.1.7
  - @fayz-ai/auth@0.1.7

## 0.1.6

### Patch Changes

- 413842d: Publish the SaaS app foundation to public npm: core, auth, ui, saas, db, and the
  agenda, financial, inventory, crm, dashboard, marketing, forms, and tasks plugins.
  This unblocks client repos (and the Fayz generator) installing the full plugin set
  as normal npm dependencies instead of via local source links.
- Updated dependencies [413842d]
  - @fayz-ai/core@0.1.6
  - @fayz-ai/auth@0.1.6
