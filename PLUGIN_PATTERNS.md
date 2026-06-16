# Plugin patterns — the canonical plugin anatomy

Every `@fayz-ai/plugin-*` composes shared primitives instead of hand-rolling structure.
This keeps the foundation consistent and lets product-wide decisions (layout, animation,
back-button style) be made once. The `check:plugin-patterns` gate enforces the load-bearing
rules; the rest is convention. Apps stay config-only — anything reusable lives in the SDK.

## Anatomy of a plugin

```
plugins/plugin-x/src/
  index.ts          createXPlugin(options) → PluginManifest; resolveConfig(); provider; store; settings
  XContext.tsx      config/provider/store context — via createPluginContext (NOT hand-rolled)
  store.ts          zustand vanilla store; dedup from '@fayz-ai/saas'
  XPage.tsx         ModulePage host; useModuleNavigation; ModuleActionBar headerAction
  views/*           one component per view; tables via DataTable; detail headers via SubpageHeader
  data/{types,mock,supabase}.ts
  components/*       plugin-specific bits
  locales/{index,en,pt-BR}.ts
```

## The rules (what the gate enforces)

1. **Context trio → `createPluginContext`** (`@fayz-ai/saas`). One call returns
   `{ ContextProvider, useConfig, useProvider, useStore }`. Don't write `React.createContext`
   trios + hooks by hand.
   ```ts
   const ctx = createPluginContext<ResolvedXConfig, XDataProvider, XUIState>('XPage')
   export const XContextProvider = ctx.ContextProvider
   export const useXConfig = ctx.useConfig
   export const useXProvider = ctx.useProvider
   export const useXStore = ctx.useStore
   ```

   _Accepted variants (don't force the trio):_ a plugin without the full
   config+provider+store set may keep a minimal context — **store-only** (e.g.
   `plugin-conversations`) or a **single combined `{config,provider,…}` context**
   (e.g. `plugin-forms`, `plugin-reports` which has no store). The trio helper is the
   default for the standard three-part shape; these are legitimate, not drift.

2. **Provider resolution → `createSafeDataProvider`** (`@fayz-ai/core`). Lazy supabase-or-mock
   pick; don't re-implement the Proxy.
   ```ts
   const provider = options?.dataProvider ?? createSafeDataProvider(
     () => createSupabaseXProvider(opts),
     () => createMockXProvider(),
   )
   ```

3. **Currency → `formatCurrency` / `CurrencyConfig`** (`@fayz-ai/saas`). Re-export under a local
   alias if you want short call sites: `export { formatCurrency } from '@fayz-ai/saas'`.
   (Note: `@fayz-ai/core` also has a `formatCurrency(value, code?)` — different signature; the
   saas one takes a `{code,locale,symbol}` config and is the module-level one plugins use.)

4. **Request dedup → `dedup`** (`@fayz-ai/saas`). No local `src/lib/dedup.ts` copies. _[gate: local-dedup]_

5. **Tables → `DataTable`** (`@fayz-ai/ui`) with `ColumnDef[]`. Free sorting, loading skeletons,
   empty state. No hand-rolled `<table>` in `views/`. Genuine exceptions (interactive rows with
   drag/toggle/inline-edit) add an inline `{/* drift-allow: raw-table — reason */}`. _[gate: raw-table]_

6. **Top-right actions → `ModuleActionBar`** (`@fayz-ai/saas`) as `ModulePage.headerAction`.
   Owns the primary "New" (`QuickActionsButton`, layout-adaptive) + the settings gear. Don't
   hand-code a `window.location.hash = '/settings/<id>'` gear button. _[gate: settings-gear]_
   ```tsx
   headerAction={<ModuleActionBar quickActions={quickActions} settingsPath="/settings/x" settingsLabel="X Settings" />}
   ```

7. **Detail / back headers → `SubpageHeader`** (`@fayz-ai/ui`) with `title`/`subtitle`/`onBack`/
   `parentLabel`/`actions`. The back affordance style (`link` | `breadcrumb` | `icon`) is chosen
   **app-wide** via `<BackStyleProvider>` (default `link` = "← Back to {parent}", localized via
   `crud.detail.backTo`). Plugins never hand-roll a back arrow.

8. **Settings → SDK-core settings area**, not an in-module tab. Register `PluginManifest.settings`
   with the module name as the tab label; build the panel with `SettingsGroup`/`ToggleRow`/
   `SelectRow` (`@fayz-ai/saas`).

9. **Navigation → `useModuleNavigation(hashBase, depthMap, homeView)`** (`@fayz-ai/saas`).
   View routing is a switch on the `view` string; encode detail params as `'<id>-detail:<id>'`.

10. **No self-animation.** Page/view transitions are SDK-owned (`PageTransition` /
    `NavTransitionProvider`); plugins just pass `viewKey`/`direction` to `ModulePage`.

## App-wide switches (decide once, every plugin inherits)

- Module nav layout: `ModuleLayoutProvider` → `rail` (topbar products) | `tabs` (sidebar products).
- Page transition feel: `NavTransitionProvider` → `slide` | `fade` | `none`.
- Back-button style: `BackStyleProvider` → `link` | `breadcrumb` | `icon`.

## Capability anatomy (what makes a plugin a real capability, not a card)

`check:plugin-patterns` enforces the **UI** anatomy above. `check:plugin-capability`
classifies the **data/backend** anatomy — the half that makes "install" mean a real,
governed capability instead of a showcase card. A plugin is **capability-complete** when:

1. **provider** — a data path via `createSafeDataProvider(() => supabase, () => mock)`; no hand-rolled selection.
2. **entities** — a typed `EntityDef` bound to a real table (`registries[].entity.data.table`), not a bare `entities: string[]`.
3. **migrations** — schema lives in `src/migrations/*.sql` **and is wired into the manifest** (`migrations: [...]`). SQL files that aren't wired are drift (`⚠` in the gate).
4. **seed** — typed `seedData` / mock seed so the capability is useful the moment it's enabled.
5. **permissions** — declared grants (`declaredFeatures` / `requiredPermission`); deny-by-default in multi-tenant.
6. **tests** — at least one `*.test.ts` proving the slice end-to-end. See `plugins/plugin-tasks/src/data/capability.test.ts` — the **canonical reference**.

`plugin-tasks` is the reference implementation (smallest plugin that satisfies all six).
Copy its shape. The gate ratchets: as each plugin reaches the bar it is added to
`ENFORCED` in `scripts/check-plugin-capability.mjs` (never removed). Background:
`docs/discovery/PLUGIN-MODEL.md`.

## Verify

`pnpm typecheck` · `pnpm check:plugin-patterns` · `pnpm check:plugin-capability` · `pnpm check:generated-app` · `pnpm check:generated-dogfood`.
