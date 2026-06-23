# @fayz-ai/plugin-crm

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
