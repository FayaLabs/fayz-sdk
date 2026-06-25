# @fayz-ai/sdk

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
