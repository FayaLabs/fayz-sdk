# SDK Manifest / Provider Contract Research

Date: 2026-06-12

Scope: `@fayz/core` manifest and provider contracts for supporting canonical `AppManifest`, Fayz API as a provider option, stronger manifest validation, and future provider capability separation without overbuilding now.

## Implementation Update — 2026-06-13 12:10 BRT

This research has moved from proposal to partial implementation.

Implemented:

- `BackendProvider` now includes `supabase`, `fayz-api`, `mock`, and `custom`.
- `BackendRef` now supports `adapterId` and `options`.
- `app-manifest.schema.json` accepts the expanded backend provider set.
- `validateManifest()` now enforces strict AppManifest v2 fields and rejects unsupported top-level/backend/surface/page/plugin/permission/block keys.
- `createFayzApiProvider()` exists and is exported from root `@fayz/core`.
- `resolveDataProvider()` is backend-aware and can select `mock`, `fayz-api`, `custom`, or the existing Supabase/archetype path.
- The `fayz-api` provider now targets the real Fayz endpoint:
  `/api/projects/:projectId/database/tables/:tableName/rows`.
- Fayz database rows OpenAPI docs were aligned to the controller contract used by the provider.

Current limitation:

- SDK tenant guardrails are client-side only. `FAY-1182` tracks the required server-side tenant/permission enforcement before `backend.provider = "fayz-api"` is used as the production backend for generated end-user runtimes.
- Do not revive the old aspirational `/api/projects/:projectId/data/:entity` route assumption unless a deliberate `/data` façade is designed.

## 1. Current Architecture Facts

- `@fayz/core` already declares `AppManifest` as the canonical app contract. The comments in `packages/core/src/manifest/index.ts` explicitly describe it as the JSON-serializable app artifact committed as `app.manifest.json` and migrated across the fleet.
- Manifest versioning already exists through `CURRENT_MANIFEST_VERSION = 2`, `registerManifestMigration()`, and `migrateManifest()`.
- `BackendRef` currently supports only `provider: 'supabase' | 'mock'`, plus optional `projectRef` and `url`.
- The JSON Schema mirrors that limitation: `app-manifest.schema.json` only allows `supabase` and `mock` for `backend.provider`.
- `SurfaceManifest` is already the right high-level shape for Panel/admin/storefront/portal rendering: one app has named surfaces, each surface has `scaffold`, `plugins`, `pages`, and `options`.
- `PageManifest` already encodes the key renderer invariant: exactly one of `blocks`, `entity`, or `component`.
- Runtime validation is intentionally small today. `validateManifest()` checks required app fields, at least one surface, missing scaffold ids, and page renderer exclusivity. It does not check duplicate pages/plugins, backend provider validity, permission references, entity references, plugin references, or JSON serializability.
- The schema is exported as `appManifestSchema`, but runtime `defineApp()` / `renderApp()` only call `validateManifest()`. They do not run JSON Schema validation.
- `DataProvider` is currently CRUD-only: `list`, `create`, `update`, `remove`.
- `resolveDataProvider()` does not read `AppManifest.backend`. It detects a global Supabase client and an entity table, then chooses Supabase/archetype; otherwise it falls back to mock.
- Supabase support is global-client oriented through `setGlobalSupabaseClient()` / `getSupabaseClientOptional()`.
- The archetype provider is also Supabase-specific. It queries Supabase views/tables directly.
- `@fayz/core` public exports already expose manifest functions/types and data provider functions/types from `packages/core/src/index.ts`.
- Plugin manifests already have `migrations?: PluginMigration[]`, but those are raw SQL declarations on plugin metadata. There is no provider contract for planning/applying migrations.
- Plugin runtime already detects duplicate plugin manifests and dependency/runtime issues, but that validation happens after live plugin manifests are resolved, not at `AppManifest` validation time.
- Surface packages (`@fayz/saas`, `@fayz/storefront`, `@fayz/portal`) already convert config sugar to `AppManifest` and back, but they still assume Supabase/mock semantics when mapping backend fields.

## 2. Files Inspected

Required discovery context:

- `docs/discovery/07-vini-mission-brief.md`
- `docs/discovery/08-current-codebase-findings.md`
- `docs/discovery/10-architecture-visuals.md`
- `docs/discovery/11-fayz-core-structure.md`
- `docs/discovery/12-weekend-operating-plan.md`

Required SDK files:

- `packages/core/src/manifest/index.ts`
- `packages/core/src/manifest/app-manifest.schema.json`
- `packages/core/src/data/types.ts`
- `packages/core/src/data/index.ts`
- `packages/core/src/data/resolve.ts`
- `packages/core/src/data/supabase.ts`
- `packages/core/src/data/mock.ts`
- `packages/core/src/data/archetype.ts`
- `packages/core/src/data/cached.ts`
- `packages/core/src/types/plugins.ts`
- `packages/core/src/index.ts`

Additional files inspected for integration impact:

- `packages/core/src/app/render.tsx`
- `packages/core/src/registry/index.ts`
- `packages/core/src/types/crud.ts`
- `packages/saas/src/app/scaffold.tsx`
- `packages/saas/src/crud/createCrudPage.tsx`
- `packages/saas/src/shell/components/plugins/PluginSettingsPanel.tsx`
- `packages/storefront/src/scaffold.tsx`
- `packages/portal/src/scaffold.tsx`
- `package.json`
- `packages/core/package.json`
- `turbo.json`

Tests scan:

- `rg --files | rg '(^|/)(tests?|__tests__|spec|test)(/|$)|\.(test|spec)\.(ts|tsx)$'`
- No dedicated test files were found in the repo scan.

## 3. Recommended Minimum Implementation Path

### A. Keep `AppManifest` canonical

Do not create a second manifest shape for Fayz Panel or generated projects. Use the existing `AppManifest` and add only the fields needed for provider selection and validation.

Minimum type/schema change:

- Introduce a named provider union, for example `BackendProvider = 'supabase' | 'fayz-api' | 'mock' | 'custom'`.
- Update `BackendRef.provider` and `app-manifest.schema.json` to include `fayz-api` and `custom`.
- Keep existing `projectRef` and `url` for backwards compatibility.
- Add the smallest custom-provider escape hatch only if needed, likely `adapterId?: string` and `options?: Record<string, unknown>`.
- Do not put Fayz API secrets, access tokens, migration approvals, or tenant binding metadata inside `AppManifest`. Those belong in Fayz API/platform storage.

### B. Strengthen `validateManifest()` before adding broad runtime features

Add checks that are cheap and contract-level:

- supported backend provider;
- duplicate page paths within a surface;
- duplicate plugin ids within a surface;
- every page has a non-empty path;
- every plugin ref has a non-empty id;
- page renderer exclusivity, already present;
- if `page.entity` is set, the entity key should exist in `manifest.entities` or in a known registry contract when that is available;
- if `page.permission` is set, the permission feature/action should exist where `manifest.permissions` can prove it;
- reject obvious non-serializable values inside manifest-owned fields, especially `entities`, because `EntityDef` currently permits React/function escape hatches.

Do not make validation dependent on live React registries yet. A manifest should be statically valid before runtime packages are imported. Registry existence checks can be a later optional diagnostic layer.

### C. Add Fayz API as a CRUD `DataProvider` first

Do not expand `DataProvider` yet. Keep Fayz API provider compatible with the current CRUD interface:

- Add `packages/core/src/data/fayz-api.ts`.
- Implement `createFayzApiProvider<T>(tableOrEntityKey, config): DataProvider<T>` over `fetch`.
- Use active tenant context and manifest/backend config as request metadata.
- Keep server endpoint details behind config; do not bake Fayz API internals into the open manifest beyond provider selection and public routing hints.

Likely config shape:

```ts
interface FayzApiProviderConfig {
  baseUrl?: string
  projectId?: string
  tenantId?: string | (() => string | undefined)
  entityKey?: string
  table?: string
  headers?: () => HeadersInit | Promise<HeadersInit>
}
```

The exact HTTP route can be locked with Fayz API research. The SDK contract only needs a provider that can list/create/update/remove by entity/table with tenant/project context.

### D. Make provider resolution manifest-aware without breaking current callers

Current callers use `resolveDataProvider(entityDef, mockData)`. Preserve that signature.

Minimum safe extension:

- Add optional resolver options, for example `resolveDataProvider(entityDef, mockData, { backend })`.
- Add a small provider factory registry for `custom` and future provider ids.
- If no backend is provided, preserve current behavior: Supabase global client -> archetype -> mock.
- If backend is `supabase`, preserve current Supabase/archetype path.
- If backend is `fayz-api`, use `createFayzApiProvider()`.
- If backend is `mock`, use mock.
- If backend is `custom`, require a registered provider factory/adapter id.

The first implementation slice may also need a way for scaffolds to pass the active manifest backend into CRUD page/provider creation. That can be done in surface/runtime code after the core contract is locked.

### E. Separate provider capability types now, implement later

Define separate capability contracts only when needed. Do not turn `DataProvider` into a god interface.

Recommended future names:

- `DataProvider`: CRUD/query only, current interface.
- `ActionProvider`: business actions/RPC/tool calls, for example booking confirmation or checkout actions.
- `MigrationProvider`: plan/apply/status for plugin/app migrations. Fayz API should own approval and execution for managed projects.
- Later: `RealtimeProvider`, `FileProvider`.

For the minimum change, add at most type placeholders or comments if that helps architecture clarity. Do not require all providers to implement migrations/actions now.

## 4. Risks / Contradictions

- `AppManifest` is documented as strictly JSON-serializable, but `entities?: EntityDef[]` uses `EntityDef`, whose nested fields can include React components/functions such as `renderCell` and detail tab components. Validation or a JSON-safe entity subset is needed before manifests are stored in DB.
- TypeScript and JSON Schema can drift. Any backend/provider change must update both `manifest/index.ts` and `app-manifest.schema.json`.
- Runtime validation does not currently use the JSON Schema. If Fayz API stores manifests, server-side schema validation should use the exported schema or a generated schema from the same source.
- `resolveDataProvider()` currently ignores `AppManifest.backend`; just adding `fayz-api` to `BackendRef` will not change CRUD behavior.
- Supabase/archetype resolution is opportunistic and global-client based. Fayz API needs explicit backend context, otherwise Panel rendering may silently fall back to mock.
- The archetype provider is tightly coupled to Supabase tables/views. With `fayz-api`, archetype behavior should probably move server-side rather than duplicating Supabase implementation in the browser.
- `@fayz/storefront` maps `supabaseUrl: manifest.backend?.url` without checking provider. That becomes wrong once `fayz-api` and `custom` exist.
- `@fayz/saas` and `@fayz/portal` only pass Supabase URLs when provider is `supabase`; Fayz API behavior is currently undefined.
- Plugin migration declarations exist as raw SQL, but there is no safe execution path. Client SDK should not execute plugin migrations directly.
- `packages/saas/src/shell/types/plugins.ts` appears to duplicate plugin types that also exist in `@fayz/core`; this is a contract drift risk.
- There are no dedicated tests around manifest validation/provider resolution today.

## 5. Test / Build Commands Needed

Baseline command run during research:

```bash
pnpm --filter @fayz/core typecheck
```

Result: passed. It printed `.npmrc` warnings about missing `${NODE_AUTH_TOKEN}`, but `tsc --noEmit` completed successfully.

Commands needed for implementation validation:

```bash
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm build
```

Recommended tests to add before/with implementation:

- Manifest validation unit tests:
  - accepts `supabase`, `fayz-api`, `mock`, `custom`;
  - rejects unsupported backend provider;
  - rejects duplicate page paths in one surface;
  - rejects duplicate plugin ids in one surface;
  - rejects pages with zero or multiple renderers;
  - catches non-serializable entity escape hatches if the manifest stores entities.
- Provider resolver unit tests:
  - preserves existing Supabase fallback behavior when no backend is supplied;
  - uses mock when backend is `mock`;
  - uses Fayz API provider when backend is `fayz-api`;
  - requires a registered adapter/factory for `custom`;
  - preserves tenant id behavior.
- Fayz API provider unit tests with mocked `fetch`:
  - `list` builds expected query/body;
  - `create`, `update`, `remove` use the expected HTTP method;
  - API errors throw normalized errors.

There is currently no package-level `test` script in `@fayz/core`; either add a test runner or document that initial validation is typecheck/build only.

## 6. Open Questions for Vini / Hermes

1. Should the public provider id be exactly `fayz-api`, or should it be a more stable platform name such as `fayz`?
2. What is the minimum Fayz API CRUD route contract for SDK data providers: entity key based, table based, or manifest entity id based?
3. For `fayz-api`, should `AppManifest.backend` contain `url`, `projectRef`, both, or neither because Fayz host injects them?
4. What is the canonical tenant key for Panel resolution: `tenantId`, `customerId`, organization id, or project environment binding?
5. Should `AppManifest.entities` remain `EntityDef[]`, or should core introduce a stricter JSON-safe `EntityManifest` type?
6. Should server-side manifest validation in Fayz API use the SDK JSON Schema directly, or should `@fayz/core` export a compiled validator/helper for Node?
7. Are plugin migrations allowed to be raw SQL long-term, or should migration declarations become provider-neutral operations before marketplace/plugin expansion?
8. Does the first Panel slice need actions/RPC immediately, or can it prove the architecture with CRUD-only data access?
9. Should `custom` providers be referenced by `adapterId` in the manifest, or only registered in app code and selected outside the manifest?
10. What is the expected behavior when a manifest references a plugin/page/component that is not installed in the generated project: hard fail, warning with partial render, or Fayz-managed install prompt?
