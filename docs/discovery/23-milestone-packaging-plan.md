# 23 — Milestone Packaging Plan

Last updated: 2026-06-13 22:20 BRT

## Executive Summary

The weekend work is moving, but the delivery risk is now packaging, not implementation.

Current issue: `fayz-sdk`, `fayz`, and `beauty-saas` all have large dirty worktrees. Tests are mostly green, but review/rollback confidence drops every hour we keep adding work without milestone commits.

Decision: switch from micro-hardening to packaging mode. No broad new implementation until the current work is split into coherent reviewable commits.

## Commit Policy

- Commit only coherent milestone slices.
- Stage explicit files, never `git add .`.
- Do not mix SDK foundation, Fayz API/Panel, generated scaffold, Beauty proof, and docs-only work in one commit.
- Run the matching gate immediately before each commit.
- If a gate fails, fix the narrow cause or leave the commit unstaged.
- Do not commit `beauty-saas` while it is behind origin until the branch strategy is explicit.

## Milestone Groups

### M1 — SDK Core/Runtime Foundation

Status: committed as `c967b26` (`feat(sdk): lock app manifest runtime contract`) at 2026-06-13 22:04 BRT.

Repo: `/Users/fayalabs/dev/fayz-sdk`

Purpose: make the open-source SDK own the canonical AppManifest/runtime/provider contract.

Candidate files:

- `packages/core/src/manifest/*`
- `packages/core/src/data/*`
- `packages/core/src/index.ts`
- `packages/core/package.json`
- `packages/core/scripts/check-manifest-contract.mjs`
- `packages/runtime/*`
- root `package.json`
- `turbo.json`
- lockfile/workspace changes only if required by the above

Gate:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm check:manifest
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Result before commit: passed. Known non-blocking noise: `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

Suggested commit:

```txt
feat(sdk): lock app manifest runtime contract
```

### M2 — Fayz AppManifest API + Panel Foundation

Status: committed as `88f71e80` (`feat(panel): add db-backed app manifest surface`) at 2026-06-13 22:10 BRT.

Repo: `/Users/fayalabs/dev/fayz`

Purpose: store tenant/customer/environment/surface-specific AppManifest bindings and render them in the editor Panel without hiding Fayz-owned controls.

Candidate files:

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260613010000_add_project_app_manifest/`
- `apps/api/src/modules/projects/app-manifests.*`
- `apps/api/src/modules/projects/project-app-manifest.seed.ts`
- `apps/api/src/modules/projects/projects.*`
- `apps/api/src/docs/schemas/projects.ts`
- `apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`
- `apps/web/src/services/api/app-manifests.ts`
- related tests under `apps/api/src/modules/projects/__tests__/`, `apps/api/src/docs/__tests__/`, and `apps/web/src/__tests__/`

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx src/__tests__/services/app-manifests.test.ts
npm run build:api
npm run build:web
```

Result before commit: passed. Focused tests covered API, Web, route guard, and organization/share access; API and Web builds passed.

Suggested commit:

```txt
feat(panel): add db-backed app manifest surface
```

### M3 — Generated Project Scaffold + Agent Guardrails

Status: committed as `864005d2` (`feat(scaffold): seed sdk app manifest contract`) at 2026-06-13 22:13 BRT.

Repo: `/Users/fayalabs/dev/fayz`

Purpose: make new Fayz projects SDK-aware without hard-depending on unpublished `@fayz/runtime`.

Candidate files:

- `apps/api/src/modules/projects/scaffold/**`
- `apps/api/src/modules/projects/scaffold-libraries.ts`
- `apps/api/src/modules/projects/__tests__/scaffold.test.ts`
- `apps/api/src/modules/generations/**` only if directly tied to scaffold seed behavior

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result before commit: passed. `npm run build:api` also passed.

Suggested commit:

```txt
feat(scaffold): seed sdk app manifest contract
```

### M4 — Runtime Data/OAuth Broker Direction

Status: committed as `efa6e510` (`feat(runtime): add tenant-scoped data token foundation`) at 2026-06-13 22:16 BRT.

Repo: `/Users/fayalabs/dev/fayz` plus docs in `/Users/fayalabs/dev/fayz-sdk`

Purpose: keep `fayz-api` production runtime safe and align plugin auth with OAuth while SDK stays open source.

Candidate files:

- `apps/api/src/modules/database/runtime-data-*`
- runtime data tests under `apps/api/src/modules/database/__tests__/`
- database route/controller/service changes directly tied to runtime scope
- SDK/Fayz docs documenting OAuth-backed Runtime Session Broker
- generated `AGENTS.md` OAuth guardrail and scaffold test

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/runtime-data-auth.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/database.service.test.ts src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result before commit: passed. First gate caught an unsafe fixture assumption; final code keeps deny-by-default runtime permissions.

Suggested commit:

```txt
feat(runtime): add tenant-scoped data token foundation
```

Note: do not claim production runtime readiness until OAuth-backed broker implementation exists.

### M5 — Beauty Agenda Proof

Status: validated at 2026-06-13 22:20 BRT. No Beauty commit created because `/Users/fayalabs/dev/fayz-app/beauty-saas` is behind `origin/main` by 2 commits and this was validation-only.

Repo: `/Users/fayalabs/dev/fayz-sdk` and `/Users/fayalabs/dev/fayz-app/beauty-saas`

Purpose: prove the first vertical demo path: agenda, paid booking, dashboard consistency, and safe mutations.

Candidate files:

- SDK agenda/financial plugin files only if needed for Beauty behavior
- Beauty app/source/migrations only after branch strategy is clear
- screenshots/proof artifacts should be reviewed before committing; prefer docs references over committing large duplicate images unless needed

Gate:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-agenda typecheck
pnpm --filter @fayz/plugin-agenda build
pnpm --filter @fayz/plugin-financial typecheck
pnpm --filter @fayz/plugin-financial build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Result: passed in `/Users/fayalabs/dev/fayz-app/beauty-saas`.

Browser proof:

- `http://127.0.0.1:5180/#/agenda`
- Existing paid proof booking must remain visible: `TESTE-CODEX Agenda`
- Do not mutate that booking.

Suggested commit:

```txt
fix(agenda): stabilize beauty booking lifecycle proof
```

Commit not created in this cycle. Reconcile Beauty branch before committing Beauty source changes.

## Stop Conditions

Stop and ask Vini before:

- changing package publication/source strategy for `@fayz/*`;
- claiming public generated-app `fayz-api` production readiness;
- storing OAuth secrets or refresh tokens in SDK/generated app repos;
- broad Beauty branch pull/rebase/merge while it is behind origin;
- collapsing all milestones into one commit.

## Next Action

The five milestone packages are now either committed or validated. Next action: decide push/PR strategy and whether docs/discovery should be committed as one operating-record commit, then reconcile `beauty-saas` before any Beauty commit.
