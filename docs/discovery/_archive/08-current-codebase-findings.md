# 08 — Current Codebase Findings

Findings from quick inspection after Vini Part 1.

## Fayz project scaffold

File inspected: `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/index.ts`

Current behavior:

- Reads scaffold template files from disk.
- Dynamically generates `package.json` via `getPackageJsonDependencies()` from `../scaffold-libraries.js`.
- New Fayz projects do not yet appear to have an obvious SDK manifest/project package hook in this file itself.

Implication:

- SDK inclusion likely belongs in scaffold dependency generation plus template files, not only `index.ts`.
- Need inspect `scaffold-libraries.js` and template tree before implementation.

## Beauty SaaS reference

File inspected: `/Users/fayalabs/dev/fayz-app/beauty-saas/src/App.tsx`

Current shape:

- Uses `createSaasApp` from `@fayz/saas`.
- Uses many plugin factories:
  - financial;
  - inventory;
  - CRM;
  - agenda;
  - reports;
  - forms;
  - dashboard;
  - tasks.
- Uses Supabase env vars directly in app config:
  - `VITE_SUPABASE_URL`;
  - `VITE_SUPABASE_ANON_KEY`.
- Config contains functions/closures, for example dashboard metric `compute` functions and plugin factory composition.

Implication:

- Beauty SaaS is a strong migration fixture because it proves real vertical complexity.
- It is not pure manifest data today. Need extraction strategy:
  - convert serializable config to manifest;
  - move functions/components to registries;
  - represent plugin config as JSON;
  - keep custom React/components behind registry IDs.

## Fayz SDK manifest baseline

File inspected: `/Users/fayalabs/dev/fayz-sdk/packages/core/src/manifest/index.ts`

Current shape already exists:

- `CURRENT_MANIFEST_VERSION = 2`
- `BackendRef` currently supports only:
  - `provider: 'supabase' | 'mock'`
- `AppManifest` includes:
  - `manifestVersion`;
  - `id`;
  - `name`;
  - `backend`;
  - `locale`;
  - `theme`;
  - `surfaces`;
  - `entities`;
  - `permissions`;
  - `billing`.
- `SurfaceManifest` includes:
  - `scaffold`;
  - `plugins`;
  - `pages`;
  - `options`.
- `PageManifest` supports exactly one of:
  - `blocks`;
  - `entity`;
  - `component`.
- `PluginRef` exists and is JSON-config oriented.
- `validateManifest()` currently validates only basic structural invariants.

Implication:

- We should not invent a second manifest model. Extend this existing `AppManifest`/`SurfaceManifest` model.
- Need extend `BackendRef.provider` to include Fayz API/custom provider strategy.
- Need possibly add manifest reference/storage metadata outside SDK in Fayz DB, not inside core manifest.

## Fayz SDK data provider baseline

Files inspected:

- `/Users/fayalabs/dev/fayz-sdk/packages/core/src/data/types.ts`
- `/Users/fayalabs/dev/fayz-sdk/packages/core/src/data/resolve.ts`

Current `DataProvider` interface:

```ts
interface DataProvider<T> {
  list(query): Promise<{ data; total }>
  create(data): Promise<T>
  update(id, data): Promise<T>
  remove(id): Promise<void>
}
```

Current resolver behavior:

- Supabase → Archetype → Mock.
- Uses global Supabase client if available.
- Uses active tenant id from SDK tenant context.

Implication:

- Vini's Fayz API resolver request maps cleanly to a provider abstraction extension.
- Current interface is CRUD-only. Need decide whether v1 provider also includes:
  - `get`;
  - `action/rpc`;
  - realtime subscription;
  - file/storage;
  - migrations.
- Do not overload `DataProvider` with migrations if that creates a god interface. Better separate `DataProvider`, `ActionProvider`, `MigrationProvider` if needed.

## Plugin system baseline

File inspected: `/Users/fayalabs/dev/fayz-sdk/packages/core/src/types/plugins.ts`

Current `PluginManifest` already includes:

- `apiVersion`;
- events;
- scaffold targeting;
- dependencies;
- navigation;
- settings;
- routes;
- widgets;
- capabilities;
- AI tools;
- registries;
- migrations;
- marketplace metadata.

Implication:

- The plugin system already contains many of the concepts from FAY-924.
- The work is more about aligning it with manifest-first, data-provider abstraction, tenant-specific Panel rendering, and migration/agent workflows than starting from scratch.

## Linear baseline

Fetched live:

- Team: `FAY` / Faya Labs.
- Cycle 21 exists:
  - id: `6e8f4087-8d73-4aff-9f29-6e13a75a2f87`
  - starts: `2026-06-15T03:00:00.000Z`
  - ends: `2026-06-22T03:00:00.000Z`
- FAY-924 exists as backlog epic under project `fayz.ai`.
- FAY-924 already has useful child issues for old SaaS-core/plugin vision.

Implication:

- We can either create a fresh Cycle 21 epic or update/clone/supersede FAY-924.
- I recommend creating a fresh parent epic for this new mission and linking FAY-924 as historical origin, instead of trying to mutate the old epic into the new architecture.
