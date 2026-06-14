# 20 — Architecture Lock

Status: **architecture lock present; narrow Panel/API implementation slice in progress**

Date: 2026-06-12

Last supervisor refresh: 2026-06-13 08:59 -03

Decision update: 2026-06-13 21:53 -03

This document consolidates the five research lanes and freezes the minimum architecture for the weekend. It intentionally locks only the decisions required for the first implementation slice.

## Executive lock

We are not building the whole plugin marketplace, SAP replacement, or full Beauty migration this weekend.

We are locking this foundation:

> Fayz SDK owns one canonical `AppManifest`. Fayz API stores project/customer/environment bindings to that manifest. Fayz editor Panel renders one `SurfaceManifest` from it, while host-owned Fayz controls remain visible.

Everything else is secondary.

## Locked decisions

### 1. Canonical contract

**Decision:** `AppManifest` in `@fayz/core` is the canonical app contract.

Do not create:

- `PanelManifest`
- `GeneratedAppConfig`
- `PluginConfigSchema` as a separate app-level format
- AI-only schema vocabulary

Consumers should converge on `AppManifest`:

- Fayz Panel
- generated apps
- SDK runtime
- agents
- plugins/modules
- future importers

### 2. Surfaces

**Decision:** Fayz Panel renders a `SurfaceManifest` from the canonical `AppManifest`.

The data model should not know about today's UI tab name.

Panel/admin/storefront/portal/mobile/headless are all surfaces, not separate manifest universes.

### 3. Fayz DB binding

**Decision:** Fayz should store manifest bindings in a model named `ProjectAppManifest` unless implementation finds a hard naming conflict.

Minimum conceptual key:

```txt
projectId + tenantKey + environment + surface + status/version
```

Recommended fields:

- `id`
- `projectId`
- `tenantKey`
- `environment`
- `surface`
- `status`
- `versionNumber`
- `manifestJson`
- timestamps

`tenantKey = default` is the v1 bridge because Fayz does not currently have a first-party customer/tenant model for this use case.

### 4. Fayz API resolver

**Decision:** Add a project-scoped active-manifest resolver.

Recommended endpoint:

```http
GET /api/projects/:projectId/app-manifests/active?surface=panel&environment=preview&tenantKey=default
```

This endpoint returns the active manifest/binding. It should not:

- run migrations;
- mutate app state;
- replace host-owned Panel sections;
- invent a new manifest shape.

### 5. Host-owned Panel controls

**Decision:** Manifest content is additive inside the editor dashboard/panel.

Cloud Features, Analytics, settings, deployment, logs, and other Fayz-owned operational controls remain host-owned.

A tenant/customer manifest must not be able to erase or hide critical Fayz platform controls.

### 6. Provider boundary

**Decision:** Add Fayz API as a `DataProvider` option first. Do not create a god provider interface.

Core provider ids should support:

```ts
'supabase' | 'fayz-api' | 'mock' | 'custom'
```

Minimum path:

- keep existing CRUD `DataProvider` interface;
- add `createFayzApiProvider()`;
- make `resolveDataProvider()` manifest/backend-aware without breaking existing callers;
- preserve existing Supabase/global-client fallback when no backend is passed.

Future contracts remain separate:

- `ActionProvider`
- `MigrationProvider`
- `RealtimeProvider`
- `FileProvider`

Do not force those into v1.

### 6a. Open-source SDK and plugin auth boundary

**Decision:** Fayz SDK is open source; plugin authentication uses OAuth through Fayz/server-side infrastructure.

The SDK may expose public interfaces, manifest declarations, provider adapters, and OAuth redirect helpers. It must not contain:

- OAuth client secrets;
- third-party refresh tokens;
- partner API keys;
- tenant-authority decisions;
- privileged Fayz runtime token minting.

OAuth connection records, refresh/revocation, provider grants, audit logs, and tenant membership checks belong in Fayz-controlled server-side infrastructure. Generated apps and SDK plugins should reference connection requirements and consume short-lived capabilities, not own long-lived secrets.

This updates the `FAY-1182` direction: the production runtime-session path is an OAuth-backed Runtime Session Broker, not a browser token pattern and not plugin-owned secret storage.

### 7. Manifest validation

**Decision:** Strengthen `validateManifest()` before agents generate or Fayz stores manifests broadly.

Minimum additional validation:

- supported backend provider;
- duplicate page paths within a surface;
- duplicate plugin ids within a surface;
- non-empty page paths;
- non-empty plugin ids;
- renderer exclusivity already exists and stays;
- reject obvious non-serializable manifest-owned fields where possible.

Important unresolved issue:

`AppManifest.entities` currently uses `EntityDef[]`, and `EntityDef` may allow React/function escape hatches. That is risky for DB-stored JSON. For the first slice, avoid relying on complex embedded entity definitions until a JSON-safe entity subset is locked.

### 8. Generated project scaffold

**Decision:** generated projects should converge on a manifest-first shape, but scaffold changes come after core/runtime stability.

Recommended future files:

```txt
app.manifest.json
src/registry.tsx
src/plugins.generated.ts
AGENTS.md
```

Do not rewrite Boris-owned AI prompts yet. Prompt vocabulary changes need Boris ownership/review.

### 9. Runtime/package stability before standardization

**Decision:** fix `@fayz/runtime` before teaching generated projects to depend on it as the umbrella package.

Research found, and the 2026-06-12 supervisor re-check updated:

- `@fayz/core` typecheck passes.
- `@fayz/ui` typecheck/build passes.
- `@fayz/saas` typecheck/build passes when `@fayz/ui` has built.
- `@fayz/runtime` previously failed on duplicate `SaasTheme` / `CreateThemeOptions`, but now passes:
  - `pnpm --filter @fayz/runtime typecheck`
  - `pnpm --filter @fayz/runtime build`
- `@fayz/runtime/styles.css` is now produced in the runtime build by copying the UI stylesheet into `dist/styles.css`.

Minimum guard before scaffold lock:

- keep explicit `@fayz/runtime` exports stable;
- keep `@fayz/runtime/styles.css` real;
- theme ownership decision documented.

### 10. Theme ownership

**Decision:** `@fayz/ui` owns low-level tokens/CSS. `@fayz/saas` owns admin-friendly theme adapters.

`AppManifest.theme` remains loose in core for now, with surface-specific normalization handled by surface packages.

### 11. Beauty proof sequencing

**Decision:** Beauty is the first vertical proof, but not the first architecture implementation.

Order:

1. Panel manifest slice.
2. Runtime/package stabilization.
3. Beauty partial manifest proof.

Minimum Beauty proof:

- manifest-rendered Beauty shell or surface;
- agenda/calendar visible;
- booking creation persists;
- at least one visible app/surface change is manifest-driven.

Critical Beauty data risk:

- agenda SQL `v_bookings` reads from `saas_core.bookings`;
- current SDK agenda provider appears to write bookings into `saas_core.orders` as unified booking/order model.

This mismatch must be resolved before a reliable demo.

## Explicit no-go decisions for now

Do not start yet:

- plugin marketplace;
- plugin certification;
- Medusa module implementation;
- Cal.diy module implementation;
- Tannat migration;
- full Beauty migration;
- broad Linear issue creation;
- structural Boris-owned prompt rewrites;
- database migrations before implementation plan is final.

## Implementation gates

### Gate 1 — Core/runtime stability

Before generated projects depend on the SDK path:

- `@fayz/core` typecheck/build passes;
- `@fayz/runtime` typecheck/build passes;
- CSS import path is real;
- manifest validation supports provider changes.

### Gate 2 — Fayz API DB migration

Before DB migration:

- confirm `ProjectAppManifest` schema shape;
- confirm `tenantKey` v1;
- confirm active binding uniqueness rules;
- confirm rollback/version minimum.

Given Vini's instruction to stop low-value questions, Hermes can proceed with recommended defaults unless the implementation uncovers conflict.

### Gate 3 — Panel slice

Before calling the first slice done:

- active manifest endpoint exists;
- editor dashboard fetches manifest;
- manifest section renders;
- Cloud/host-owned sections remain visible;
- build/tests pass.

### Gate 4 — Beauty proof

Before Monday demo claim:

- agenda booking read/write model is consistent;
- booking creation persists;
- demo flow is manually verified.

## Supervisor refresh — 2026-06-13

The five required research outputs are present and still align with this lock:

- SDK manifest/provider lane: keep `AppManifest` canonical, add `fayz-api` as a `DataProvider`, strengthen validation, avoid a god provider.
- Fayz Panel/API lane: use `ProjectAppManifest`, resolve by `projectId + tenantKey + environment + surface`, render additively inside the current dashboard.
- Generated scaffold lane: future generated projects should include `app.manifest.json`, `src/registry.tsx`, `src/plugins.generated.ts`, and `AGENTS.md`, but scaffold changes should follow runtime/package stability.
- Beauty proof lane: do Beauty after Panel slice; agenda booking is the narrow demo, with a known `saas_core.bookings` vs `saas_core.orders` read/write mismatch to resolve.
- Package/design-system lane: `@fayz/ui` owns tokens/CSS, `@fayz/saas` owns admin-friendly adapters, and `@fayz/runtime/styles.css` must remain real for generated apps.

Current implementation state observed by supervisor:

- `/Users/fayalabs/dev/fayz-sdk` has active uncommitted foundation changes on branch `weekend-fayz-sdk-architecture-lock`, including core provider/manifest work, runtime CSS/export work, SaaS/UI de-bridge work, and discovery docs.
- `/Users/fayalabs/dev/fayz` has active uncommitted Panel/API slice work on branch `weekend-fayz-sdk-panel-manifest`, including `ProjectAppManifest` schema/migration, API controller/service/routes, and additive web dashboard manifest section.
- `/Users/fayalabs/dev/fayz-app/beauty-saas` remains dirty on `main` and is behind `origin/main` by 2 commits; Beauty should not be advanced until the Panel slice has real-data/browser proof.

This does not change the architecture decisions. It reinforces the next gate: verify the already-started Panel/API slice with safe active-manifest data before widening scope.

## Current risk rating

**Yellow-green.**

Reason: direction is coherent, the runtime umbrella has passed targeted typecheck/build, and the Fayz Panel slice now has real-data/browser proof. Risk remains because all three repos are dirty and the implementation still needs review/cleanup before merge or broader Beauty/scaffold expansion.

The correct next move is not new platform breadth. It is review/cleanup of the already-started Fayz Panel/API manifest slice, then a controlled handoff into the next narrow proof only after the dirty worktrees are reconciled.

## Supervisor refresh — 2026-06-13 04:57 -03

Current verification confirms the architecture lock is still current and does not need decision changes.

- All five research outputs still exist under `docs/discovery/research/` and align with the lock.
- Re-inspected the active Fayz Panel/API implementation files:
  - `apps/api/src/modules/projects/app-manifests.service.ts`
  - `apps/web/src/services/api/app-manifests.ts`
  - `apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`
  - `packages/db/prisma/migrations/20260613010000_add_project_app_manifest/migration.sql`
- Re-ran Fayz targeted builds:

```bash
npm run build:api && npm run build:web
```

Result: passed. Existing web build warnings remain non-blocking and unrelated to this slice: Tailwind arbitrary-class ambiguity, unresolved runtime font asset, mixed dynamic/static import chunking, and large chunk warnings.

The remaining gate is unchanged: do not expand Beauty/scaffold work yet. Next progress should be either safe real-data/browser verification of the Panel manifest section or, if DB migration/application is not safe in the current environment, SDK-owned manifest validation tightening before broader write-path use.

## Supervisor refresh — 2026-06-13 06:00 -03

Current verification confirms the architecture lock remains current; no locked decision changed.

- All five research outputs still exist under `docs/discovery/research/` and still align with the lock.
- Re-ran Fayz targeted build verification in `/Users/fayalabs/dev/fayz`:

```bash
npm run build:api && npm run build:web
```

Result: passed. Existing non-blocking web warnings remain the same class of warnings as prior runs: Tailwind arbitrary-class ambiguity, unresolved runtime font asset, mixed dynamic/static import chunking, and large chunk warnings.

- Re-checked the local migration/data proof path with:

```bash
npx prisma migrate status --schema packages/db/prisma/schema.prisma
```

Result: blocked because the configured local database `ymaia_dev` at `localhost:5432` is unreachable. The supervisor did not apply any DB migration and did not seed any manifest binding.

This reinforces the current gate: the implementation compiles, but the Panel slice is not yet fully demo-proven with real active-manifest data/browser verification. Until a safe reachable dev/test database is available, the next safe engineering action is to tighten SDK/Fayz API manifest validation rather than broaden Beauty/scaffold work.

## Supervisor refresh — 2026-06-13 07:04 -03

Current verification confirms the architecture lock remains current; no locked decision changed.

- All five research outputs still exist under `docs/discovery/research/` and still align with the lock.
- Since the local DB remained unavailable in the previous run, the supervisor advanced the safe fallback action instead of seeding data: tightened the Fayz API `POST /:projectId/app-manifests` boundary in `apps/api/src/modules/projects/app-manifests.controller.ts`.
- The create helper no longer accepts only arbitrary `z.record(z.unknown())`; it now performs minimum AppManifest-shape validation before persistence:
  - required `id` and `name`;
  - at least one object-shaped `surfaces` entry;
  - supported backend providers: `supabase`, `fayz-api`, `mock`, `custom`;
  - surface `pages` must be arrays when present;
  - page paths are required and unique per surface;
  - each page must specify exactly one renderer: `blocks`, `entity`, or `component`;
  - surface `plugins` must be arrays when present;
  - plugin ids are required and unique per surface.
- Re-ran the API compile gate in `/Users/fayalabs/dev/fayz`:

```bash
npm run build:api
```

Result: passed.

The remaining proof gap is still real-data/browser verification: apply the migration only against a safe reachable dev/test database, seed exactly one active `ProjectAppManifest`, then verify the dashboard shows bound-project content and unbound-project empty state while host-owned controls remain visible.

## Supervisor refresh — 2026-06-13 08:07 -03

Current verification confirms the architecture lock remains current; no locked decision changed.

- All five research outputs still exist under `docs/discovery/research/` and still align with the lock.
- Re-ran the Fayz compile gate in `/Users/fayalabs/dev/fayz`:

```bash
npm run build:api && npm run build:web
```

Result: passed. Existing web build warnings remain non-blocking and unrelated to the manifest slice: Tailwind arbitrary-class ambiguity, unresolved runtime font asset, mixed dynamic/static import chunking, and large chunk warnings.

- Re-checked the local dev database path:

```bash
npx prisma migrate status --schema packages/db/prisma/schema.prisma
```

Result: database reachable and schema up to date.

- Verified real active-manifest data now exists for the narrow Panel proof:
  - bound project: `ede4a8e6-3869-458d-a908-2a5062fbe7aa` / `Churrascaria Rodízio Texas`;
  - active binding: `ProjectAppManifest` `2d653852-8bea-4712-8dbf-86dbccba8c74`;
  - scope: `tenantKey=default`, `environment=preview`, `surface=panel`, `status=active`, `versionNumber=1`;
  - manifest has two pages (`Agenda`, `Clientes`) and two plugin refs (`Calendário de Reservas`, `CRM de Clientes`) using backend provider `fayz-api`.
- Verified an unbound comparison project, `5e088385-5399-43b0-9d9c-d1d70ebe69b2` / `Teresópolis Wine Shop`, has no active default/preview/panel binding, preserving the empty-state path.
- Re-ran targeted tests for the slice:

```bash
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result: passed, 3 API tests and 4 web component tests.

This materially reduces the proof gap: the schema is migrated/up to date, a safe dev active binding exists, the unbound empty-state path exists, and compile/unit/component gates pass. Remaining before demo-ready claim is browser verification in the running editor UI that the bound project renders the manifest section and that host-owned dashboard/Cloud controls remain visible.

## Supervisor refresh — 2026-06-13 08:59 -03

Current verification confirms the architecture lock remains current; no locked decision changed.

- All five research outputs still exist under `docs/discovery/research/` and still align with the lock.
- Re-checked live local services before browser verification: Postgres is listening on `5432`, Fayz API on `3001`, and web dev servers on `5173`/`5174`.
- Completed browser verification against the running editor UI using the local dev API/database:
  - bound project `ede4a8e6-3869-458d-a908-2a5062fbe7aa` / `Churrascaria Rodízio Texas` renders the additive `Manifest surface` card with manifest page `Agenda`;
  - the bound project does not show the empty-state copy;
  - unbound comparison project `5e088385-5399-43b0-9d9c-d1d70ebe69b2` / `Teresópolis Wine Shop` renders `No active panel manifest yet` and does not show `Agenda`;
  - host-owned dashboard navigation/controls remain visible in both cases: `Overview`, `Data`, and `Storage` were present.
- Browser verification result was `ok: true`. The only observed browser console error was the expected 404 for the unbound-project active-manifest request, which the UI treats as empty state.

This closes the main Workstream 3 proof gap for the narrow Panel manifest slice: compile, unit/component tests, real active data, empty-state data, and browser UI checks have all passed locally.

Remaining before merge/demo handoff:

- keep scope narrow and review the dirty Fayz branch rather than expanding version-management UX;
- preserve `ProjectAppManifest`/`tenantKey=default` defaults unless implementation review finds conflict;
- reconcile dirty worktrees before Beauty/scaffold implementation;
- for Beauty, resolve the `saas_core.bookings` vs `saas_core.orders` agenda read/write mismatch before claiming a booking demo.
