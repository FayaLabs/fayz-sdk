# 21 — Implementation Plan

Status: **narrow Panel/API proof verified locally; review/cleanup needed before broader work**

Date: 2026-06-12

This plan follows `20-architecture-lock.md`. It is intentionally narrower than the original mission.

## Objective

Build the smallest safe Fayz SDK/Fayz integration slice:

```txt
@fayz/core AppManifest/provider contract
  -> Fayz API ProjectAppManifest binding + active resolver
  -> Fayz editor dashboard renders a manifest surface section
  -> generated project scaffold path prepared after runtime package is stable
```

## Workstream 0 — Safety guard

### Goal

Avoid overwriting existing uncommitted foundation work.

### Tasks

1. Capture current git status for:
   - `/Users/fayalabs/dev/fayz-sdk`
   - `/Users/fayalabs/dev/fayz`
   - `/Users/fayalabs/dev/fayz-app/beauty-saas`
2. Do not edit unrelated dirty files unless they are part of the slice.
3. Prefer small targeted patches.
4. Run package-specific builds before root builds.

### Validation

```bash
git status --short
```

## Workstream 1 — Stabilize SDK core/runtime contract

### Goal

Make the manifest/provider/runtime foundation safe enough for Fayz and generated projects.

### Files likely touched

In `/Users/fayalabs/dev/fayz-sdk`:

- `packages/core/src/manifest/index.ts`
- `packages/core/src/manifest/app-manifest.schema.json`
- `packages/core/src/data/types.ts`
- `packages/core/src/data/resolve.ts`
- `packages/core/src/data/index.ts`
- new: `packages/core/src/data/fayz-api.ts`
- `packages/core/src/index.ts`
- `packages/app-runtime/src/index.ts`
- runtime/package CSS config or generated-project CSS import decision

### Tasks

1. Add backend provider union:

```ts
'supabase' | 'fayz-api' | 'mock' | 'custom'
```

2. Update JSON schema to allow the same providers.
3. Strengthen `validateManifest()`:
   - supported provider;
   - duplicate page paths;
   - duplicate plugin refs;
   - non-empty paths/ids;
   - preserve renderer exclusivity.
4. Add Fayz API CRUD provider compatible with current `DataProvider`.
5. Extend `resolveDataProvider()` with optional backend/options while preserving current signature behavior.
6. Fix `@fayz/runtime` export collisions.
7. Make CSS import path real:
   - preferred: `@fayz/runtime/styles.css` works for generated apps;
   - acceptable fallback: generated templates import `@fayz/ui/styles.css` explicitly.

### Tests/build

Run in `/Users/fayalabs/dev/fayz-sdk`:

```bash
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/ui typecheck
pnpm --filter @fayz/ui build
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/saas build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Root build only after filtered builds pass:

```bash
pnpm build
```

### Done when

- `@fayz/core` and `@fayz/runtime` typecheck/build pass.
- Provider ids are aligned between TypeScript and JSON schema.
- Validation catches duplicate page/plugin basics.

### Supervisor verification update — 2026-06-12

Completed successfully in `/Users/fayalabs/dev/fayz-sdk`:

```bash
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Observed runtime build behavior:

- core package typecheck/build pass with the current manifest/provider changes;
- declaration/export collision is no longer blocking `@fayz/runtime`;
- build now emits JS bundles and copies `@fayz/ui` CSS to `packages/app-runtime/dist/styles.css`;
- `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`, but it did not block local typecheck/build.

Remaining before Workstream 1 is fully done:

- re-run `@fayz/ui` and `@fayz/saas` targeted checks after current dirty changes settle;
- verify provider ids and manifest validation behavior in core;
- then run broader root validation only after targeted packages pass.

## Workstream 2 — Fayz API manifest storage/resolver

### Goal

Store and resolve active app manifests per project/customer/environment/surface.

### Files likely touched

In `/Users/fayalabs/dev/fayz`:

- `packages/db/prisma/schema.prisma`
- new migration under `packages/db/prisma/migrations/`
- `apps/api/src/modules/projects/**`
- API route/service/controller files matching existing project module conventions
- tests under project module if present

### Proposed model

```prisma
model ProjectAppManifest {
  id            String   @id @default(cuid())
  projectId     String
  tenantKey     String   @default("default")
  environment   String   @default("preview")
  surface       String   @default("panel")
  status        String   @default("active")
  versionNumber Int      @default(1)
  manifestJson  Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, tenantKey, environment, surface, status])
}
```

Uniqueness decision:

- ideal: one active binding per `projectId + tenantKey + environment + surface`;
- Prisma partial unique indexes are limited depending on DB/provider;
- implement app-level enforcement first if partial unique is awkward.

### Endpoint

```http
GET /api/projects/:projectId/app-manifests/active?surface=panel&environment=preview&tenantKey=default
```

Potential later endpoints:

```http
POST /api/projects/:projectId/app-manifests
POST /api/projects/:projectId/app-manifests/:id/activate
GET  /api/projects/:projectId/app-manifests
```

For first slice, active read + seed/manual creation may be enough.

### Validation

- validate stored manifests with SDK schema/helper if dependency boundary allows;
- otherwise use minimal API validation and add SDK validation integration later.

### Tests/build

Run in `/Users/fayalabs/dev/fayz`:

```bash
npx prisma generate
npm run build
npm test
```

If targeted tests exist, run project module tests first.

### Done when

- Prisma model/migration exists.
- API can return active manifest for a project.
- Missing manifest returns clear empty/404 behavior.

### Supervisor review update — 2026-06-12

Observed in `/Users/fayalabs/dev/fayz`:

- `ProjectAppManifest` model has been started in `packages/db/prisma/schema.prisma`.
- Migration exists at `packages/db/prisma/migrations/20260613010000_add_project_app_manifest/migration.sql`.
- API route is wired in `apps/api/src/modules/projects/projects.routes.ts`:
  - `GET /:projectId/app-manifests/active`
  - `POST /:projectId/app-manifests`
- New controller/service files exist under `apps/api/src/modules/projects/app-manifests.*`.

Alignment with lock:

- Good: model name, default `tenantKey`, default `environment`, default `surface`, status/version fields, and project relation match the lock.
- Good: active resolver is project-scoped and read-only.
- Needs review before migration is treated as approved: API currently also includes create/activate behavior, and service archives prior active rows in app code. This is probably acceptable, but it crosses from read-only proof into write/version management.
- Needs validation follow-up: `manifestJson` is accepted as an arbitrary object today; it should use SDK schema/helper or an explicit minimal validator before broad use.
- Needs build follow-up in Fayz: run Prisma generate/build/tests after reviewing the migration and route ownership.

### Supervisor verification update — 2026-06-13

Reviewed the active Fayz API/DB manifest slice against the architecture lock:

- `ProjectAppManifest` model/migration aligns with the lock: `projectId`, `tenantKey`, `environment`, `surface`, `status`, `versionNumber`, `manifestJson`, timestamps, and project cascade relation are present.
- Active resolver route is wired at `GET /:projectId/app-manifests/active` and maps to the planned `/api/projects/:projectId/app-manifests/active` shape under the existing router prefix.
- Defaults match the lock: `tenantKey = default`, `environment = preview`, `surface = panel`, `status = active`.
- The implementation added a `POST /:projectId/app-manifests` write path plus app-level archival of previous active rows. This is acceptable as a narrow seed/manual-creation helper, but should not be expanded into broad version-management UX before Panel read/render is verified.
- `manifestJson` is still validated only as a generic object via Zod. Before real customer use, route creation should call SDK-owned manifest validation/schema or a tightly scoped equivalent.

Verification completed in `/Users/fayalabs/dev/fayz`:

```bash
npm run db:generate
npm run build:api
```

Both passed. No DB migration was applied.

### Supervisor verification update — 2026-06-13 late run

Completed the remaining targeted SDK package checks in `/Users/fayalabs/dev/fayz-sdk`:

```bash
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/ui typecheck
pnpm --filter @fayz/ui build
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/saas build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

All passed. The only recurring noise was the existing `.npmrc` warning for missing `${NODE_AUTH_TOKEN}`. This closes the previously noted targeted SDK verification gap for `@fayz/ui` and `@fayz/saas`.

Fayz API manifest slice review remains aligned with the lock:

- `ProjectAppManifest` model/migration uses the locked key fields and defaults.
- Active resolver route remains project-scoped at `/:projectId/app-manifests/active` under the existing projects API router.
- The write helper archives prior active rows in app code and enforces unique `projectId + tenantKey + environment + surface + versionNumber`.
- Still needs before customer/broad use: SDK-owned manifest validation instead of only `z.record(z.unknown())` for `manifestJson`.

## Workstream 3 — Fayz editor Panel rendering

### Goal

Render manifest content as an additive section inside current dashboard/panel.

### Files likely touched

In `/Users/fayalabs/dev/fayz`:

- editor/dashboard panel components under `apps/web/src/**`
- API client/store hooks for project app manifest endpoint
- potentially shared types/client utilities

### Tasks

1. Find current `DashboardPanel` component.
2. Add manifest fetch hook for active panel surface.
3. Render a small manifest section:
   - surface title/name;
   - pages list or simple page cards;
   - plugin refs list;
   - a minimal renderer if existing SDK runtime can be imported safely.
4. Keep host-owned sections visible.
5. Add loading/error/empty state.

### First render target

Do not attempt full app runtime rendering immediately if package boundary is hard.

Acceptable first Panel render:

- read active `AppManifest`;
- find `surface = panel`;
- render surface name + pages/plugins in a structured panel section.

Better if feasible:

- use `@fayz/runtime`/surface renderer for blocks/pages.

### Tests/build/browser

```bash
npm run build
npm test
```

Browser verify on externally running dev server:

- open project editor;
- dashboard/panel still loads;
- Cloud/host-owned sections still visible;
- manifest section appears for seeded project;
- empty state appears for project without manifest.

### Done when

- Panel consumes real API data.
- Manifest display is project/tenant/environment aware.
- Existing dashboard controls remain.

### Supervisor implementation update — 2026-06-13 cron run

Implemented the smallest additive Fayz web Panel manifest surface preview in `/Users/fayalabs/dev/fayz`:

- Added `apps/web/src/services/api/app-manifests.ts` for the active resolver call:
  - `GET /projects/:projectId/app-manifests/active?surface=panel&environment=preview&tenantKey=default`
  - treats 404 as an empty state, not a dashboard failure.
- Added `apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`:
  - renders active `AppManifest` / `SurfaceManifest` metadata, pages, plugins, version, and loading/empty/error states;
  - uses degraded UI states instead of blanking the dashboard;
  - keeps Fayz host-owned dashboard controls intact.
- Wired the section into `OverviewSection` as an additive dashboard card; no new top-level tab and no replacement of Cloud/host controls.

Verification completed in `/Users/fayalabs/dev/fayz`:

```bash
npm run build:web
```

Result: passed. Existing Vite/Tailwind/font/chunk warnings remain non-blocking and unrelated to this slice.

Remaining before calling Workstream 3 fully done:

- seed/create an active manifest binding in a safe dev/test project;
- browser-verify dashboard overview shows the manifest section for a bound project and empty state for an unbound project;
- avoid applying DB migrations until manifest validation is tightened or explicitly approved.

### Supervisor verification update — 2026-06-13 current run

Re-verified the narrow Fayz API + web Panel manifest slice in `/Users/fayalabs/dev/fayz`:

```bash
npm run build:api && npm run build:web
```

Result: passed. Existing web build warnings remain non-blocking: Tailwind arbitrary-class ambiguity warnings, unresolved runtime font asset warning, dynamic/static import chunk warning, and large chunk warnings.

Current Workstream 3 status:

- API active resolver and create helper still build cleanly.
- Web additive `ManifestSurfaceSection` still builds cleanly inside `OverviewSection`.
- No DB migration was applied.
- Remaining proof gap is runtime/browser verification with real data: create or seed one safe active `ProjectAppManifest` binding, verify the bound project shows pages/plugins, and verify an unbound project shows the empty state without hiding host-owned controls.

### Supervisor status refresh — 2026-06-13 cron run

Current file-state check across repos:

- `/Users/fayalabs/dev/fayz-sdk` branch `weekend-fayz-sdk-architecture-lock` remains dirty with core manifest/provider, runtime CSS/export, SaaS/UI, workspace, and discovery-doc changes. This is expected foundation work, but should stay narrowly reviewed before merge.
- `/Users/fayalabs/dev/fayz` branch `weekend-fayz-sdk-panel-manifest` remains dirty with the active Panel/API slice: Prisma schema/migration, project app-manifest controller/service/routes, additive dashboard section, and web API client.
- `/Users/fayalabs/dev/fayz-app/beauty-saas` branch `main` is behind `origin/main` by 2 commits and has broad dirty app/page changes. Do not start the Beauty proof from this state until Panel real-data/browser proof is complete and the Beauty worktree is reconciled.

Research/output check:

- All five research files exist under `docs/discovery/research/`.
- `20-architecture-lock.md` was refreshed this run to reflect the current implementation state without changing the locked decisions.

Next concrete action for Workstream 3:

1. Identify a safe dev/test project in Fayz for manifest binding.
2. Create or seed exactly one active `ProjectAppManifest` using the existing write helper only if DB migration/application is safe in that environment.
3. Browser-verify the dashboard overview renders the manifest section for the bound project and empty state for an unbound project.
4. If DB migration cannot be safely applied, defer seeding and instead tighten SDK-owned manifest validation before any broader write path usage.

### Supervisor verification update — 2026-06-13 04:57 -03

Re-inspected the active Panel/API slice and re-ran targeted Fayz builds:

```bash
npm run build:api && npm run build:web
```

Result: passed.

Confirmed implementation state:

- API service still resolves active `ProjectAppManifest` by `projectId + tenantKey + environment + surface + status`, defaults to `default/preview/panel`, and archives old active rows only through the narrow create helper.
- Migration still matches the locked model fields and indexes, including the unique version key for `projectId + tenantKey + environment + surface + versionNumber`.
- Web API client still calls `GET /projects/:projectId/app-manifests/active?surface=panel&environment=preview&tenantKey=default` and treats 404 as empty state.
- `ManifestSurfaceSection` still renders additively inside the dashboard with loading, empty, error, missing-surface, pages, plugins, and version states.

Remaining gap is not compilation; it is proof with data/browser:

- no DB migration was applied by the supervisor;
- no active manifest binding was seeded by the supervisor;
- browser verification remains pending for a bound project and an unbound-project empty state.

### Supervisor verification update — 2026-06-13 06:00 -03

Re-ran the targeted Fayz compile gate in `/Users/fayalabs/dev/fayz`:

```bash
npm run build:api && npm run build:web
```

Result: passed. Existing web build warnings remain non-blocking and unrelated to the manifest slice.

Checked whether the local database path is safe/available for the next real-data proof:

```bash
npx prisma migrate status --schema packages/db/prisma/schema.prisma
```

Result: blocked. Prisma loaded the local `DATABASE_URL` for `ymaia_dev` at `localhost:5432`, but the database server is unreachable (`P1001`). Therefore this run did **not** apply the migration, seed `ProjectAppManifest`, or attempt browser/data proof.

Updated next action while the database is unavailable:

1. Do not expand Beauty/scaffold work yet.
2. Do not apply migrations against production/sandbox URLs from `.env.mcp` as a cron fallback.
3. Tighten manifest validation at the SDK/API boundary next, so the write helper cannot accept arbitrary JSON before broad/customer use.
4. Return to real-data/browser verification once a safe reachable local/dev database is available.

### Supervisor implementation update — 2026-06-13 07:04 -03

Completed the safe fallback action from the previous run: tightened the Fayz API manifest create boundary without touching DB state.

Changed in `/Users/fayalabs/dev/fayz`:

- `apps/api/src/modules/projects/app-manifests.controller.ts`
  - `manifestJson` now uses a Zod `superRefine` guard instead of accepting any arbitrary record.
  - Minimum AppManifest-shape checks now reject missing `id`/`name`, missing or empty `surfaces`, unsupported backend provider ids, duplicate page paths, missing page paths, pages with zero/multiple renderers, missing plugin ids, duplicate plugin ids, and non-array pages/plugins.

Verification:

```bash
npm run build:api
```

Result: passed.

Remaining before Workstream 2/3 can be called demo-proven:

- local/dev DB is still needed for migration + seed + browser proof;
- validation is intentionally minimal and local to the API boundary for now — the preferred final state is still SDK-owned validation/schema reuse once dependency boundaries are settled;
- do not expand Beauty/scaffold work until the Panel slice has real-data/browser proof.

### Supervisor verification update — 2026-06-13 08:07 -03

Advanced the real-data proof path in `/Users/fayalabs/dev/fayz` now that the local dev DB is reachable:

```bash
npm run build:api && npm run build:web
npx prisma migrate status --schema packages/db/prisma/schema.prisma
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Results:

- API + web build passed.
- Prisma reports the local `ymaia_dev` schema is up to date.
- API manifest service tests passed: 3/3.
- Web manifest section component tests passed: 4/4.

Real-data state verified:

- Bound proof project exists: `ede4a8e6-3869-458d-a908-2a5062fbe7aa` / `Churrascaria Rodízio Texas`.
- Active default/preview/panel binding exists: `2d653852-8bea-4712-8dbf-86dbccba8c74`, source `hermes-weekend-panel-proof`, `versionNumber=1`.
- The manifest uses backend provider `fayz-api` and has visible Panel content: pages `Agenda`, `Clientes`; plugins `Calendário de Reservas`, `CRM de Clientes`.
- Unbound comparison project verified: `5e088385-5399-43b0-9d9c-d1d70ebe69b2` / `Teresópolis Wine Shop` has no active default/preview/panel binding.

Updated status:

- Workstream 2 is no longer blocked on DB reachability for local/dev verification.
- Workstream 3 has compile, unit/component, bound-data, and empty-state data proof.
- Remaining before demo-ready claim: browser verification in the editor UI that the bound project renders the manifest card and that host-owned dashboard/Cloud controls remain visible.

### Supervisor browser verification update — 2026-06-13 08:59 -03

Completed the remaining Workstream 3 browser proof against the running local editor UI and local API/database.

Pre-check:

```bash
lsof -nP -iTCP -sTCP:LISTEN | egrep '(:3000|:3001|:5173|:5174|:8080|:5432)' || true
```

Observed local services:

- Postgres on `5432`;
- Fayz API on `3001`;
- web dev servers on `5173` and `5174`.

Browser verification covered:

- bound project `ede4a8e6-3869-458d-a908-2a5062fbe7aa` / `Churrascaria Rodízio Texas`;
- unbound comparison project `5e088385-5399-43b0-9d9c-d1d70ebe69b2` / `Teresópolis Wine Shop`;
- authenticated local guest sessions matching each project's owner device id;
- editor route `/editor/:projectId?view=dashboard`;
- additive `Manifest surface` card;
- bound-state page rendering (`Agenda`);
- unbound empty state (`No active panel manifest yet`);
- host-owned dashboard navigation remaining visible (`Overview`, `Data`, `Storage`).

Result:

```json
{
  "ok": true,
  "bound": {
    "hasManifestSurface": true,
    "expectedText": "Agenda",
    "absentText": "No active panel manifest yet",
    "absentCount": 0,
    "hasOverview": true,
    "hasDataNav": true,
    "hasStorageNav": true,
    "errorCount": 0
  },
  "empty": {
    "hasManifestSurface": true,
    "expectedText": "No active panel manifest yet",
    "absentText": "Agenda",
    "absentCount": 0,
    "hasOverview": true,
    "hasDataNav": true,
    "hasStorageNav": true,
    "errorCount": 1
  }
}
```

The one empty-state browser console error was the expected active-manifest `404` for the unbound project; the web API client handles this as a normal empty state.

Workstream 3 is now locally proof-complete for the narrow Panel manifest slice. Remaining work is review/cleanup, not new feature breadth.

## Workstream 4 — Generated project scaffold prep

### Goal

Prepare generated projects to use SDK vocabulary without destabilizing AI prompts.

### Timing

After Workstream 1 passes, because `@fayz/runtime` currently fails.

### Files likely touched

In `/Users/fayalabs/dev/fayz`:

- `apps/api/src/modules/projects/scaffold/index.ts`
- `apps/api/src/modules/projects/scaffold-libraries.ts`
- scaffold template utilities
- tests around `package.json` mutation

### Tasks

1. Add SDK/runtime dependency to scaffold package generation.
2. Add starter `app.manifest.json`.
3. Add `src/registry.tsx`.
4. Add `src/plugins.generated.ts`.
5. Add generated project `AGENTS.md`.
6. Do not structurally rewrite Boris-owned prompts in this workstream.

### Tests

Targeted package/scaffold tests plus build:

```bash
npm run build
npm test
```

### Done when

- new project scaffold includes SDK manifest files;
- package merge tests still pass;
- no prompt rewrite required.

## Workstream 5 — Beauty proof prep

### Goal

Prepare the Monday demo path without converting full Beauty SaaS.

### Timing

After Panel/API slice is working.

### Files likely touched

In `/Users/fayalabs/dev/fayz-app/beauty-saas` and maybe SDK plugin agenda:

- `src/App.tsx`
- partial manifest fixture
- registry mapping file
- agenda provider files
- Supabase migration/view if needed

### Tasks

1. Extract partial Beauty manifest for shell + agenda only.
2. Create registry IDs for non-JSON pieces.
3. Resolve `saas_core.bookings` vs `saas_core.orders` agenda mismatch.
4. Verify booking read/write.
5. Demo manifest-only visible change.

### Done when

- Beauty agenda visible.
- Booking creation persists.
- Manifest-only change affects UI.

## Workstream 6 — Updates and coordination

### Goal

Keep Vini informed without slowing the work.

### Existing automation

- Hourly supervisor cron: `75570b15f81d`
- Update protocol: `docs/discovery/14-update-routing-protocol.md`
- Active run state: `docs/discovery/16-active-run-state.md`

### Update rules

Send compact updates:

- when a workstream completes;
- when a build/test fails with architectural implication;
- before DB migration;
- before broad implementation starts;
- hourly via supervisor.

Do not ask permission for reversible file/docs/test work.

## Immediate next task

Move from proof to review/cleanup:

> Keep the Panel/API slice narrow, reconcile the dirty Fayz worktree, and prepare the smallest reviewable changeset before starting Beauty/scaffold implementation.

Concrete next actions:

1. Review `/Users/fayalabs/dev/fayz` diff for accidental scope expansion, especially the `POST /:projectId/app-manifests` helper and Prisma migration.
2. Re-run the targeted gate before handoff:
   ```bash
   npm run build:api && npm run build:web
   npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
   npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
   ```
3. Do not broaden version-management UX or create Linear mutations before review.
4. After review, the next narrow implementation candidate is Beauty proof prep, starting with the `saas_core.bookings` vs `saas_core.orders` agenda read/write mismatch—not full Beauty migration.
