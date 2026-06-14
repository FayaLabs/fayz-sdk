# Package and Design-System Stability Research

Date: 2026-06-12

## 1. Current Architecture Facts

- `@fayz/core` already owns the canonical app contract path: `AppManifest`, `SurfaceManifest`, `PageManifest`, manifest migrations, validation, registries, `defineApp`, and `renderApp`.
- `@fayz/ui` is the shared component package. It exports primitives, layout shells, stores, CSS variables, theme provider/helpers, and a Tailwind preset.
- `@fayz/saas` is both an admin/SaaS runtime package and a migration surface. It currently exports:
  - a newer manifest-first admin path: `defineSaas`, `AdminScaffold`, `AdminShell`, `createFayzApp`;
  - a native de-bridged `createSaasApp`;
  - CRUD, org, permissions, billing, plugin UI helpers, and shell internals needed by vertical plugins.
- `@fayz/runtime` is intended as the generated-app umbrella package, re-exporting `@fayz/core`, `@fayz/auth`, `@fayz/saas`, `@fayz/ui`, `@fayz/shop`, and `@fayz/storefront`.
- The manifest-first rendering flow exists in code: surface packages self-register scaffolds through `registerScaffold`, then `renderApp(manifest, { surface })` resolves the scaffold by id.
- The current workspace includes external real app fixtures: `../../fayz-app/resto-saas` and `../../fayz-app/beauty-saas`.

## 2. Files Inspected

Source docs:

- `docs/discovery/07-vini-mission-brief.md`
- `docs/discovery/08-current-codebase-findings.md`
- `docs/discovery/10-architecture-visuals.md`
- `docs/discovery/11-fayz-core-structure.md`
- `docs/discovery/12-weekend-operating-plan.md`

Package and workspace files:

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `packages/core/package.json`
- `packages/app-runtime/package.json`
- `packages/auth/package.json`
- `packages/ui/package.json`
- `packages/saas/package.json`
- `packages/courses/package.json`
- `packages/portal/package.json`
- `plugins/plugin-courses/package.json`

UI package:

- `packages/ui/src/index.ts`
- `packages/ui/src/styles.css`
- `packages/ui/src/theme/index.ts`
- `packages/ui/src/theme/preset.ts`
- `packages/ui/src/stores/theme.store.ts`
- `packages/ui/src/layout/AppShell.tsx`
- `packages/ui/src/layout/Topbar.tsx`
- `packages/ui/src/primitives/Avatar.tsx`
- `packages/ui/tsconfig.json`
- `packages/ui/tsup.config.ts`

SaaS package:

- `packages/saas/src/index.ts`
- `packages/saas/src/app/config.ts`
- `packages/saas/src/app/createFayzApp.tsx`
- `packages/saas/src/app/scaffold.tsx`
- `packages/saas/src/app/AdminShell.tsx`
- `packages/saas/src/app/LoginPage.tsx`
- `packages/saas/src/app/routing.tsx`
- `packages/saas/src/shell/createSaasApp.tsx`
- `packages/saas/src/shell/config/theme/tokens.ts`
- `packages/saas/src/shell/config/theme/utils.ts`
- `packages/saas/src/shell/config/theme/light.ts`
- `packages/saas/src/shell/config/theme/dark.ts`
- `packages/saas/src/shell/config/tailwind-preset.ts`
- `packages/saas/src/shell/stores/theme.store.ts`
- `packages/saas/src/shell/styles.css`
- `packages/saas/src/org/adapters/supabase.ts`
- `packages/saas/src/permissions/context.tsx`
- `packages/saas/src/plugins/WidgetSlot.tsx`
- `packages/saas/tsconfig.json`
- `packages/saas/tsconfig.shell.json`
- `packages/saas/tsup.config.ts`

Core/runtime contract files:

- `packages/core/src/manifest/index.ts`
- `packages/core/src/app/render.tsx`
- `packages/core/src/registry/index.ts`
- `packages/core/src/types/theme.ts`
- `packages/core/src/types/permissions.ts`
- `packages/app-runtime/src/index.ts`
- `packages/app-runtime/tsup.config.ts`

## 3. Package Boundaries

Current internal dependency graph:

```txt
@fayz/core
  no @fayz deps

@fayz/auth
  -> @fayz/core

@fayz/ui
  -> @fayz/core
  -> @fayz/auth

@fayz/saas
  -> @fayz/core
  -> @fayz/auth
  -> @fayz/ui

@fayz/runtime
  -> @fayz/core
  -> @fayz/auth
  -> @fayz/ui
  -> @fayz/saas
  -> @fayz/shop
  -> @fayz/storefront

@fayz/storefront
  -> @fayz/core
  -> @fayz/auth
  -> @fayz/ui
  -> @fayz/shop

@fayz/portal
  -> @fayz/core
  -> @fayz/auth
  -> @fayz/courses

plugins mostly
  -> @fayz/core
  -> @fayz/ui
  -> @fayz/saas where they need admin shell/CRUD helpers
```

Boundary assessment:

- `@fayz/core` boundary is mostly clean and should remain the source of manifest, registry, provider, plugin runtime, permission, entity, i18n, and rendering contracts.
- `@fayz/ui` is not purely visual because it depends on `@fayz/core` for i18n in `DatePicker` and on `@fayz/auth`. This is acceptable for now but should be intentional. If UI is meant to be a low-level design system, auth should not leak into it.
- `@fayz/saas` has the largest boundary risk. It currently contains two generations of admin shell code:
  - top-level native admin path under `src/app`;
  - large de-bridged legacy shell under `src/shell`.
- Plugins still depend on `@fayz/saas` for admin/CRUD helpers. That is reasonable for admin plugins, but platform contracts should not move from `@fayz/core` into `@fayz/saas`.
- `@fayz/runtime` is the key standardization package, but it is currently unstable because export collisions make it fail typecheck.

## 4. Design Token and Theme Variation Strategy

Current facts:

- `@fayz/ui` defines full `ThemeTokens`, `SemanticColors`, `UIPerceptionTokens`, `CreateThemeOptions`, `lightTheme`, `darkTheme`, `ThemeProvider`, `useTheme`, and `fayzUiPreset`.
- `@fayz/saas/src/shell/config/theme` defines a richer admin theme API:
  - `SaasTheme`
  - `ThemeRadius = sharp | soft | round`
  - `ThemeDensity = compact | comfortable | spacious`
  - `ThemeShadow = none | subtle | medium | bold`
  - `ThemeFont` presets
  - `resolveTheme(theme: SaasTheme): CreateThemeOptions`
- `@fayz/core/src/types/theme.ts` also defines a smaller `SaasTheme`:
  - `brand?: ThemeBrand`
  - `radius?: none | sm | md | lg | full`
  - `primaryHsl?`
  - `secondaryHsl?`
- `AppManifest.theme` is currently `Record<string, unknown>`, explicitly loose so surface packages can own their theme shape.
- `packages/ui/src/styles.css` and `packages/saas/src/shell/styles.css` duplicate the same Polaris-like token base, dark-mode variables, and animation utility layer.
- `packages/ui/src/theme/preset.ts` and `packages/saas/src/shell/config/tailwind-preset.ts` also duplicate most color/radius/font/shadow token mappings.
- Two separate theme stores exist:
  - `@fayz/ui`: storage key `fayz-ui:theme-mode`, singleton key `__fayz_ui_theme_store__`.
  - `@fayz/saas`: storage key `saas-core:theme-mode`, singleton key `__saas_core_theme_store__`.

Recommended strategy before standardization:

- Choose one public theme contract for generated projects. I recommend `@fayz/ui` owns low-level tokens and CSS variable application.
- Keep `@fayz/saas` friendly presets as an adapter layer only: `SaasTheme -> @fayz/ui CreateThemeOptions`.
- Avoid exporting conflicting `SaasTheme` names from both `@fayz/core` and `@fayz/saas` through `@fayz/runtime`.
- Keep `AppManifest.theme` loose at the core layer, but document surface-specific expected shapes:
  - admin surface: friendly admin theme or normalized UI token overrides;
  - storefront surface: storefront theme;
  - future member/portal surface: portal theme.
- Generated projects should import one CSS entry. Today the CLI imports `@fayz/runtime/styles.css`, but `@fayz/runtime` does not currently build or ship that file.

## 5. Current Uncommitted Work Risk

`git status --short` shows active work in foundation files:

- Modified:
  - `cli/src/commands/create.ts`
  - `cli/src/index.ts`
  - `packages/core/src/types/permissions.ts`
  - `packages/saas/package.json`
  - `packages/saas/src/app/createFayzApp.tsx`
  - `packages/saas/src/index.ts`
  - `packages/saas/src/org/adapters/supabase.ts`
  - `packages/saas/src/permissions/context.tsx`
  - `packages/saas/src/plugins/WidgetSlot.tsx`
  - `packages/ui/src/index.ts`
  - `packages/ui/src/layout/AppShell.tsx`
  - `packages/ui/src/layout/Topbar.tsx`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- Untracked but architecturally relevant:
  - `packages/saas/src/app/AdminShell.tsx`
  - `packages/saas/src/app/LoginPage.tsx`
  - `packages/saas/src/app/routing.tsx`
  - `packages/saas/src/app/scaffold.tsx`
  - `packages/saas/src/shell/**`
  - `packages/saas/tsconfig.shell.json`
  - `packages/ui/src/primitives/Avatar.tsx`
  - `packages/courses/**`
  - `packages/portal/**`
  - `plugins/plugin-courses/**`
  - `docs/discovery/**`

Risk summary:

- The branch is in the middle of a major `@fayz/saas` de-bridge from `@fayz/saas-core`. This should not be treated as locked API yet.
- Permission profiles changed from `features` to `grants`. That is probably the right canonical shape, but it is a breaking contract and must be checked across existing app data, plugin code, and Fayz API expectations.
- `@fayz/runtime` has export collisions from duplicated theme type names. This directly blocks the generated-project umbrella package.
- `@fayz/runtime/styles.css` is declared and generated apps import it, but runtime does not currently have a source or build step that produces `dist/styles.css`.
- `pnpm-workspace.yaml` now includes external app fixtures from `../../fayz-app`. Root `turbo` commands will include more than just SDK packages if those projects are installable in the workspace.
- New `courses`, `portal`, and `plugin-courses` packages broaden the platform surface before the core admin/UI/theme contracts are locked.

## 6. Build and Typecheck Status

Commands run:

```bash
pnpm --filter @fayz/ui typecheck
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/ui build
pnpm --filter @fayz/saas build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Results:

- `@fayz/ui` typecheck: pass.
- `@fayz/saas` typecheck: pass.
- `@fayz/ui` build: pass.
- `@fayz/saas` build: pass when run after `@fayz/ui` build.
- `@fayz/runtime` typecheck: fail.
- `@fayz/runtime` build: fail during declaration generation.

`@fayz/runtime` errors:

```txt
src/index.ts(8,1): error TS2308: Module '@fayz/core' has already exported a member named 'SaasTheme'. Consider explicitly re-exporting to resolve the ambiguity.
src/index.ts(9,1): error TS2308: Module '@fayz/saas' has already exported a member named 'CreateThemeOptions'. Consider explicitly re-exporting to resolve the ambiguity.
```

Build caveats:

- All pnpm commands warn that `.npmrc` cannot replace `${NODE_AUTH_TOKEN}`. This did not block local builds, but it will matter for install/publish flows.
- Running dependent package builds in parallel can race on `dist` declarations because packages resolve workspace dependencies through built outputs during declaration generation. Sequential filtered builds avoided the false `@fayz/ui` declaration error.
- No root `pnpm typecheck` or `pnpm build` was run after discovering `@fayz/runtime` already fails. Root commands should be run only after runtime export collisions are fixed.

## 7. What Must Be Fixed Before SDK Standardization

1. Fix `@fayz/runtime` export collisions.
   - Decide whether `SaasTheme` comes from `@fayz/core`, `@fayz/saas`, or is renamed/re-exported explicitly.
   - Decide whether `CreateThemeOptions` is a UI-level type or SaaS-level type.

2. Make `@fayz/runtime/styles.css` real.
   - Either copy/re-export `@fayz/ui/styles.css` into runtime build output, or change the generated template to import the correct package CSS.
   - Do not lock the CLI template while it imports a non-existent runtime CSS export.

3. Lock the public theme contract.
   - Keep one low-level token API.
   - Keep surface-specific friendly theme adapters.
   - Remove or alias duplicate names that make umbrella imports ambiguous.

4. Decide the `@fayz/saas` public API surface.
   - `createFayzApp`, `defineSaas`, `AdminScaffold`, `AdminShell`, and `createSaasApp` are all public today.
   - Before agents learn this SDK, document which one is preferred for new projects and which are compatibility paths.

5. Finish or quarantine the `@fayz/saas-core` de-bridge.
   - Comments still reference `saas-core`.
   - Storage keys still use `saas-core:*`.
   - Several plugins include comments/localStorage keys based on `saas-core`.
   - That is not necessarily a runtime bug, but it is confusing for agent guidance and generated-project docs.

6. Validate the permission profile breaking change.
   - `PermissionProfile.features` became `PermissionProfile.grants`.
   - Existing persisted org/permission data and imported projects need a migration or adapter.

7. Strengthen manifest validation before agents generate manifests.
   - Duplicate plugin ids per surface.
   - Duplicate page paths.
   - Unknown/unsupported backend provider.
   - Unknown scaffold id if registry metadata is available.
   - Plugin config serializability and schema checks where plugin factories expose schema.

8. Decide package inclusion for generated projects.
   - The CLI now scaffolds only `@fayz/runtime` plus plugins/surface extras.
   - Fayz app scaffold may include SDK packages differently.
   - Lock one pattern so Fayz-generated projects and CLI-generated projects do not diverge.

## 8. What Can Wait

- Full cleanup of comments and storage keys that say `saas-core`, as long as the public docs do not teach `saas-core`.
- Marketplace/package certification.
- Full visual editor schema coverage for every component/block/plugin.
- Consolidating `packages/saas/src/shell/**` into smaller modules.
- Deep design polish on `courses`, `portal`, and `plugin-courses`.
- Full root `turbo build` across external `fayz-app` fixtures, until the runtime umbrella is fixed.
- Removing all duplicate CSS immediately. The minimum is choosing the public import path and preventing generated projects from importing a missing CSS file.

## 9. Recommended Minimum Implementation Path

1. Stabilize package exports.
   - Fix `@fayz/runtime` typecheck.
   - Add explicit re-exports for ambiguous names.
   - Make `@fayz/runtime/styles.css` available or update scaffolds to use `@fayz/ui/styles.css`.

2. Lock theme ownership.
   - Declare `@fayz/ui` as token/CSS owner.
   - Declare `@fayz/saas` as admin-friendly theme adapter.
   - Keep `AppManifest.theme` loose but document expected admin surface shape.

3. Lock admin app entry points.
   - Preferred new path: manifest-first `renderApp(defineSaas(config))` or direct `renderApp(app.manifest.json, { surface: 'admin' })`.
   - Compatibility path: `createSaasApp` for existing vertical apps until migrated.
   - Avoid teaching agents multiple equivalent paths without guidance.

4. Normalize permissions.
   - Confirm `grants` as canonical.
   - Add compatibility migration/adapters for old `features` profiles where needed.

5. Run validation in this order:
   - `pnpm --filter @fayz/core typecheck`
   - `pnpm --filter @fayz/ui typecheck`
   - `pnpm --filter @fayz/saas typecheck`
   - `pnpm --filter @fayz/runtime typecheck`
   - `pnpm --filter @fayz/runtime build`
   - Then root `pnpm typecheck` and `pnpm build`.

6. Only after that, lock generated-project docs and Fayz scaffold integration.

## 10. Open Questions for Vini/Hermes

1. Should generated projects import only `@fayz/runtime`, or should they import surface packages explicitly for clarity (`@fayz/saas`, `@fayz/storefront`, `@fayz/ui`)?

2. Is `createSaasApp` a long-term public API or a compatibility adapter while we move to manifest-first `renderApp`?

3. Which theme shape should agents write into `AppManifest.theme` for admin surfaces:
   - low-level UI token overrides;
   - friendly `SaasTheme`;
   - both, with one normalized before storage?

4. Should `@fayz/core` continue exporting a `SaasTheme` type at all, or should surface theme types live outside core?

5. Is the permission rename from `features` to `grants` approved as a breaking platform contract now?

6. Should `@fayz/ui` depend on `@fayz/auth`, or should auth-aware shell/user menu behavior live only in `@fayz/saas` and other surface packages?

7. Should `packages/courses`, `packages/portal`, and `plugins/plugin-courses` be included in the current lock-in scope, or quarantined until the admin/runtime/theme foundation passes root build?

8. For Fayz Panel, should it render through `@fayz/runtime` exactly like generated projects, or should Fayz import `@fayz/core` plus specific surface packages directly to avoid umbrella ambiguity?

9. Do we want one CSS package entry (`@fayz/runtime/styles.css`) for all generated apps, or per-surface CSS entries?

10. Should `pnpm-workspace.yaml` keep external `fayz-app` projects in the main workspace during SDK lock-in, or should fixture validation be a separate command to avoid destabilizing root builds?
