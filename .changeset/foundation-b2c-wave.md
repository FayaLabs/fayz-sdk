---
"@fayz-ai/core": minor
"@fayz-ai/ui": minor
"@fayz-ai/saas": minor
"@fayz-ai/auth": minor
"@fayz-ai/storefront": minor
"@fayz-ai/shop": minor
"@fayz-ai/plugin-financial": minor
"@fayz-ai/plugin-agenda": minor
"@fayz-ai/plugin-crm": minor
"@fayz-ai/plugin-forms": minor
"@fayz-ai/plugin-marketing": minor
"@fayz-ai/plugin-menu": minor
"@fayz-ai/plugin-orders": minor
"@fayz-ai/plugin-tables": minor
"@fayz-ai/plugin-reports": minor
---

Foundation cleanup + mobile/B2C wave + auth extraction.

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
