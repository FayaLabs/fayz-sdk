# @fayz-ai/plugin-shop

## 0.2.5

### Patch Changes

- c88dd5c: Portfolio honesty pass: these plugins are marked **[experimental] (incubating)** in package.json + README — not capability-complete (no data-provider pair / registries / migrations per docs/PLUGIN-PATTERNS.md). APIs may change without notice; not ready for fresh installs or generated apps.
- Updated dependencies [c88dd5c]
- Updated dependencies [d04bf96]
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
