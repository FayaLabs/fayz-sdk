---
"@fayz-ai/storefront": minor
"@fayz-ai/shop": minor
"@fayz-ai/courses": minor
"@fayz-ai/plugin-menu": minor
"@fayz-ai/plugin-orders": minor
"@fayz-ai/plugin-tables": minor
"@fayz-ai/plugin-sites": minor
"@fayz-ai/plugin-shop": minor
"@fayz-ai/plugin-reputation": minor
"@fayz-ai/plugin-courses": minor
"@fayz-ai/plugin-conversations": minor
"@fayz-ai/plugin-automations": minor
"@fayz-ai/sdk": minor
"@fayz-ai/core": patch
---

Lock SDK/plugin architecture boundaries (FAY-1217).

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
