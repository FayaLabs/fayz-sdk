# @fayz-ai/plugin-reports

## 0.2.0

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

## 0.1.6

### Patch Changes

- Updated dependencies
  - @fayz-ai/ui@0.6.0
  - @fayz-ai/core@0.6.0
  - @fayz-ai/saas@0.6.0

## 0.1.5

### Patch Changes

- Updated dependencies
  - @fayz-ai/core@0.5.0
  - @fayz-ai/ui@0.5.0
  - @fayz-ai/saas@0.5.0

## 0.1.4

### Patch Changes

- Updated dependencies
  - @fayz-ai/saas@0.3.0

## 0.1.3

### Patch Changes

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
