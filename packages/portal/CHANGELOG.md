# @fayz-ai/portal

## 0.6.0

### Patch Changes

- @fayz-ai/core@0.6.0
- @fayz-ai/auth@0.6.0
- @fayz-ai/courses@0.6.0

## 0.5.0

### Minor Changes

- Re-align the whole SDK suite onto a single version line (0.5.0). The linked group had drifted across separate release runs (sdk 0.2.0 … storefront 0.4.0); this bumps every suite package together so "the SDK" has one coherent version. `@fayz-ai/portal` and `@fayz-ai/courses` are added to the linked group. No behavioural changes — version hygiene only.

### Patch Changes

- Updated dependencies
  - @fayz-ai/core@0.5.0
  - @fayz-ai/auth@0.5.0
  - @fayz-ai/courses@0.5.0

## 0.2.0

### Minor Changes

- Front-door facades for storefront + member apps, mirroring `@fayz-ai/saas`.

  - `@fayz-ai/storefront` now re-exports `renderApp`/`getSupabaseClientOptional` from `@fayz-ai/core` and adds subpaths `@fayz-ai/storefront/ui` (→ `@fayz-ai/ui`), `@fayz-ai/storefront/catalog` (→ `@fayz-ai/shop/catalog`) and `@fayz-ai/storefront/shop` (→ `@fayz-ai/sdk/shop`). Adds `@fayz-ai/sdk` as a dependency. Storefront apps can now depend on `@fayz-ai/storefront` alone.
  - `@fayz-ai/portal` is now published (was private) and re-exports `renderApp`/`defineApp` from `@fayz-ai/core` plus the courses provider API (`setCoursesProvider`, `createMockCoursesProvider`, `useMyCourses`, …) from `@fayz-ai/courses`. Member apps can depend on `@fayz-ai/portal` alone.

## 0.1.1

### Patch Changes

- Updated dependencies [bd8e8cd]
  - @fayz-ai/courses@0.2.0
  - @fayz-ai/core@0.2.0
  - @fayz-ai/auth@0.2.0
