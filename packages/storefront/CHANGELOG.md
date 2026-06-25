# @fayz-ai/storefront

## 0.6.0

### Patch Changes

- Updated dependencies
  - @fayz-ai/sdk@0.6.0
  - @fayz-ai/ui@0.6.0
  - @fayz-ai/core@0.6.0
  - @fayz-ai/shop@0.6.0
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
  - @fayz-ai/shop@0.5.0

## 0.4.0

### Minor Changes

- Front-door facades for storefront + member apps, mirroring `@fayz-ai/saas`.

  - `@fayz-ai/storefront` now re-exports `renderApp`/`getSupabaseClientOptional` from `@fayz-ai/core` and adds subpaths `@fayz-ai/storefront/ui` (→ `@fayz-ai/ui`), `@fayz-ai/storefront/catalog` (→ `@fayz-ai/shop/catalog`) and `@fayz-ai/storefront/shop` (→ `@fayz-ai/sdk/shop`). Adds `@fayz-ai/sdk` as a dependency. Storefront apps can now depend on `@fayz-ai/storefront` alone.
  - `@fayz-ai/portal` is now published (was private) and re-exports `renderApp`/`defineApp` from `@fayz-ai/core` plus the courses provider API (`setCoursesProvider`, `createMockCoursesProvider`, `useMyCourses`, …) from `@fayz-ai/courses`. Member apps can depend on `@fayz-ai/portal` alone.

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
  - @fayz-ai/auth@0.2.0
  - @fayz-ai/ui@0.2.0
