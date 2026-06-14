# 16 — Active Run State

Last updated: 2026-06-14 08:47 BRT

## Mode

Active autonomous execution is approved. This file is the fast resume snapshot for Codex/Hermes agents.

The heartbeat is a fallback/resume mechanism, not the main worker. The active thread should keep executing in continuous small cycles: inspect, run the next gate, fix the narrow failure, update docs, repeat. Stop only for blockers that require Vini's product/architecture approval.

Research is complete; architecture lock and implementation plan exist. Narrow Panel manifest slice is in progress/review on feature branches. Generated-project scaffold is SDK-ready and the package-source decision is now locked to public npm. Beauty agenda lifecycle proof is broad and was revalidated after the runtime/API work.

- SDK branch: `weekend-fayz-sdk-architecture-lock`
- Fayz branch: `weekend-fayz-sdk-panel-manifest`

## Fast snapshot

Status: **green for FAY-1178 cleanup, green for FAY-1181 npm package-source implementation with npm publish blocked only by npm `@fayz` scope/org permission, green/yellow for FAY-1182 provider onboarding after OAuth broker read/write Calendar proxy and revocation/audit foundation**.

Linear anchor:

- Current active issues: `FAY-1178` — `[SDK] DB-backed AppManifest foundation for generated panels`; `FAY-1182` — `[SDK] Server-side tenant enforcement for Fayz API data provider`
- Completed related issues: `FAY-1179`, `FAY-1180`
- Reactivated related issue: `FAY-1181` — package real `fayz-sdk` on public npm with lean `@fayz/sdk` default package
- Historical origin: `FAY-924`

Current focus:

1. Packaging mode is active: use `/Users/fayalabs/dev/fayz-sdk/docs/discovery/23-milestone-packaging-plan.md` before staging or committing.
2. Report progress in executive format: Resultado, Impacto, Risco, Proximo. Technical detail is evidence, not the headline.
3. Continue `FAY-1181` package implementation from the public npm decision: lean `@fayz/sdk`, public package metadata, generated scaffold dependency update, and release checklist.
4. Continue `FAY-1182` from the committed OAuth-backed broker foundation, exchange route, Google Calendar read/write proxy, revocation/audit foundation, and SDK helper into provider onboarding UI after product approval.
5. Treat Fayz SDK as open source; keep secrets, OAuth refresh tokens, provider credentials, and tenant authority in Fayz/server-side infrastructure.
6. Treat `AppManifest + renderApp(manifest)` as the recommended repo x SDK contract. `createSaasApp` is legacy compatibility only; do not use it for new generated apps or templates.
7. Keep Beauty paid demo proof booking intact; use separate seeded bookings for destructive tests.
8. Keep docs/Linear updated before and after each gated slice so the 30-minute status agent has a clean snapshot.

Idle-loop rule:

- While provider onboarding is awaiting final UX approval, heartbeat executions should stay lightweight unless package/publication work is actively unblocked.
- Do not create new provider onboarding UI/product routes until Vini approves option 1 or chooses another direction.
- Notify immediately if a process is stuck, Beauty stops serving `127.0.0.1:5180`, a new user decision arrives, or an unblocked packaging/publication path appears.

Executive answer to Vini's latest check:

- Are we committing? Yes. First milestone commit is done: `c967b26`.
- Are we moving fast enough? Yes after the packaging correction: M1-M4 are committed, M5 Beauty proof is validated, M6-M12 OAuth broker/scaffold slices are committed/pushed in Fayz, and M13 is committed locally in SDK.
- Are we stuck/rabbit-looping? No stuck process was found. The main risk is reviewability, not runtime blocking.
- Next target: finish and gate the public npm / lean `@fayz/sdk` implementation, then approve provider onboarding direction in `25-provider-onboarding-decision-brief.md`.

## M18 Public npm + lean SDK package lock — 2026-06-14 08:47 BRT

Result:

- Vini approved npm public as the SDK package-source standard.
- `@fayz/sdk` is now the lean always-safe package for generated projects.
- `@fayz/runtime` remains the manifest app-rendering package.
- GitHub Packages / `NODE_AUTH_TOKEN` is no longer the generated-project path.
- Created GitHub repo: `https://github.com/FayaLabs/fayz-sdk`
- Pushed SDK commits to `main` and `weekend-fayz-sdk-architecture-lock`.

Impact:

- `FAY-1181` is unblocked from decision state into implementation/gating.
- Generated projects can normalize API access, app params, shared types, and Runtime OAuth broker calls through `@fayz/sdk`.
- This follows the Base44-style pattern without making every simple project install the heavy runtime/UI bundle.

Risk:

- Keep `@fayz/sdk` lean. Do not add React, UI, Supabase, or provider SDKs to it.
- Do not refactor Beauty destructively before package gates pass.
- Npm publish now passes auth/2FA but is blocked by scope permission. Current npm account authenticates as `fayalabs`; `npm publish --access public --otp <recovery-code>` returns npm `E404` on `@fayz/sdk`, and `npm org ls fayz` returns `E403`, meaning this account/token cannot publish under the `@fayz` scope yet.

Gate:

- Passed:
  - `pnpm --filter @fayz/sdk typecheck`
  - `pnpm --filter @fayz/sdk test`
  - `pnpm --filter @fayz/sdk build`
  - `pnpm --filter @fayz/core typecheck`
  - `pnpm --filter @fayz/runtime typecheck`
  - `pnpm --filter @fayz/runtime build`
  - `pnpm check:manifest`
  - `npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts`
  - `npm publish --dry-run --access public` in `packages/sdk`

Publish:

- `npm publish --access public` blocked by npm `@fayz` scope/org permission before publishing `@fayz/sdk@0.1.0`.
- Required human action: create/enable the npm org/scope `fayz` and add account `fayalabs` with publish rights, or approve switching the npm scope to `@fayalabs/*`.

Tracking:

- Linear `FAY-1181` comment `197e46fa-fca0-4b9a-8bae-6e3a5000c5a1`
- Linear `FAY-1182` comment `295f0885-7d2a-414b-95dd-f29e64a9ab70`

## M17 createSaasApp deprecation stance — 2026-06-14 08:25 BRT

Result:

- Hardened `docs/discovery/26-app-contract-and-integrations-decision.md`.
- `createSaasApp` is now explicitly classified as a legacy compatibility adapter, not strategic architecture.
- New generated apps/templates should use `AppManifest + renderApp(manifest)`.
- `create*Plugin` factories remain plugin-package internals/developer API, while generated apps reference plugin ids and JSON config.

Impact:

- Removes ambiguity from the contract decision.
- Prevents future agents/templates from making `createSaasApp` the long-term public API.

Risk:

- Do not break Beauty/resto before extraction. Use Beauty as the golden migration specimen.

Gate:

- Docs-only milestone. No runtime code changed.

## M16 App contract and integrations decision brief — 2026-06-14 08:20 BRT

Result:

- Added `docs/discovery/26-app-contract-and-integrations-decision.md`.
- Recommendation: `AppManifest` is the official generated-app contract; Beauty `App.tsx` is the migration specimen, not the final shape.
- Recommendation: classify `createSaasApp` as legacy compatibility only; do not use it in new generated apps/templates.
- Recommendation: replace direct plugin bridges with domain events, declared capabilities, and plugin grants.
- Captured integration lessons from Slack, Notion, SAP, and AppFlowy.

Impact:

- Stops the architecture loop around whether Beauty's current `App.tsx` should become the durable SDK API.
- Gives the next worker a concrete path: tiny `App.tsx`, `app.manifest.json`, and `registry.tsx` for custom code.

Risk:

- Do not aggressively refactor Beauty until Vini approves manifest-first as the official generated-app contract and SDK package destination is confirmed.

Gate:

- Docs-only milestone. Process check found no stuck test/build jobs; Beauty Vite server remains healthy on `127.0.0.1:5180`.

## M15 Provider onboarding decision brief — 2026-06-14 00:51 BRT

Result:

- Added `docs/discovery/25-provider-onboarding-decision-brief.md`.
- Converted the provider onboarding blocker into three explicit product options.
- Recommended option 1: Fayz-owned Integrations surface plus inline plugin CTA.
- Tracking updated: Linear `FAY-1182` comment `fdb6b0b5-3a87-4809-bf7c-0e2f5ec54475`.

Impact:

- Vini can approve the next product direction from mobile without opening backend code.
- The next engineering slice becomes narrow: authenticated list/revoke routes, settings UI, and Panel missing-grant CTA.

Risk:

- No product route/UI should be exposed until Vini approves the onboarding surface and permission names.

Gate:

- Docs-only milestone. Process check found no stuck test/build jobs; Beauty Vite server remains healthy on `127.0.0.1:5180`.

## M14 Runtime OAuth helper contract docs — 2026-06-14 00:42 BRT

Result:

- Added `docs/discovery/24-runtime-oauth-helper-contract.md`.
- Updated `docs/agent-guide.md` with the blessed runtime helper path for agents and generated apps.
- Updated discovery README so the other status agent can find the contract quickly.
- Tracking updated: Linear `FAY-1182` comment `49a2fd2d-9978-4747-a4b4-308e5557b03f`.

Impact:

- Agents now have one readable source of truth for how to call Plugin OAuth broker flows without leaking provider credentials.
- This reduces drift while the SDK remote/package-source decision is still pending.

Risk:

- Docs only. The SDK helper remains local-only until the open-source repo remote is confirmed.

Gate:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
```

Result: passed. Known non-blocking noise: `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

## M13 Packaged SDK runtime OAuth helper — 2026-06-14 00:35 BRT

Result:

- SDK commit `fdb2d22` created locally: `feat(core): add runtime oauth broker helper`.
- Tracking updated: Linear `FAY-1182` comment `e55b109e-d0e7-4055-bbd0-1d2519f534ca`.
- Added `createFayzRuntimeClient()` and typed Plugin OAuth/Google Calendar broker helpers under `@fayz/core`.
- Added `@fayz/core/runtime` subpath and root exports; `@fayz/runtime` receives it through the umbrella re-export.

Impact:

- The scaffold helper now has a real SDK home.
- Once SDK remote/package-source is confirmed, generated apps can stop carrying the temporary local helper and import from `@fayz/runtime`.

Risk:

- SDK repo still has no remote configured, so this is local-only until Vini confirms the open-source repo destination.
- This commit does not touch provider onboarding UI.

Gate:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Result: passed. Known non-blocking noise: `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

## M12 Runtime helper behavior tests — 2026-06-14 00:28 BRT

Result:

- Fayz commit `79b9cdd5` pushed to PR `#927`: `test(scaffold): cover brokered runtime oauth helper`.
- Tracking updated: Linear `FAY-1182` comment `bd1b12eb-d7df-45d3-85c0-c4e5227952b8`; PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700579037`.
- Added behavior tests for generated `src/lib/fayz-runtime.ts`.
- Tests verify runtime-data token exchange, broker-token Calendar calls, route/method selection, non-JSON error handling, and absence of provider credential fields in helper requests.

Impact:

- The scaffold helper is now validated as behavior, not just checked as a present file.
- This reduces risk that future generated apps or agents drift from the broker contract.

Risk:

- This is hardening only; it does not unblock SDK remote/package publication.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/scaffold-runtime-helper.test.ts
npm run build:api
```

Result: passed.

## M11 Generated-app runtime helper contract — 2026-06-14 00:24 BRT

Result:

- Fayz commit `efcc5bee` pushed to PR `#927`: `feat(scaffold): add brokered runtime oauth helper`.
- Tracking updated: Linear `FAY-1182` comment `ef707734-8c40-4aef-9ca1-586894340226`; PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700571162`.
- Added `src/lib/fayz-runtime.ts` to generated project scaffold.
- Helper standardizes short-lived runtime-data token usage, Plugin OAuth exchange, and Google Calendar broker calls.
- Generated-agent guide now points agents to the helper and forbids ad hoc OAuth clients/provider API calls from browser code.

Impact:

- New Fayz projects have a safe default path for agenda/calendar plugin calls.
- This reduces the chance that future agents reintroduce provider tokens or tenant authority into generated apps.

Risk:

- This is a scaffold helper, not the final packaged open-source SDK helper. The package-source/SDK remote decision still blocks publishing it as `@fayz/runtime`.
- Full template typecheck still has pre-existing missing dependency noise for shadcn/Radix files; the new helper was typechecked in isolation with template-compatible compiler options.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npx tsc --noEmit --skipLibCheck --target ES2020 --module ESNext --moduleResolution bundler --lib ES2020,DOM apps/api/src/modules/projects/scaffold/template/src/lib/fayz-runtime.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result: passed.

Self-improvement:

- Full template typecheck surfaced pre-existing missing dependency noise and one real helper type issue. Future template helper work should run isolated helper typecheck plus scaffold test/build until template dependency installation is validated end-to-end.

## M10 Plugin OAuth revocation/audit foundation — 2026-06-14 00:17 BRT

Result:

- Fayz commit `75376e4b` pushed to PR `#927`: `feat(runtime): add plugin oauth revocation audit foundation`.
- Tracking updated: Linear `FAY-1182` comment `f4dc640f-2d3d-4e79-9d61-08ed1b7994e4`; PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700557206`.
- Added append-only `PluginOAuthAuditEvent` table and migration.
- Added service-level revocation for project/plugin grants and provider connections.
- Revocation writes redacted audit events and soft-revokes active grants without exposing provider tokens.

Impact:

- The broker now has a safety path for disconnecting providers or tenant/plugin grants.
- This closes the biggest operational risk left after Calendar read/write: tokens can be made unusable and the action has evidence.

Risk:

- No public/admin UI route was exposed yet. That is deliberate: the permission model and provider onboarding UX should be locked before exposing revocation controls.
- Remaining production gaps: SDK helper wrapper, provider onboarding UI, and broader audit read/admin surface.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npx prisma validate --schema packages/db/prisma/schema.prisma
npm run db:generate
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-auth.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run build:api
```

Result: passed.

Self-improvement:

- Build caught a Prisma JSON readonly mutation before commit. Fixed by constructing audit metadata immutably; future broker work should keep `npm run build:api` as mandatory even when unit tests pass.

## M9 Google Calendar write proxy — 2026-06-14 00:10 BRT

Result:

- Fayz commit `6e53926b` pushed to PR `#927`: `feat(runtime): proxy google calendar writes through oauth broker`.
- Tracking updated: Linear `FAY-1182` comment `f5f1a69d-9a74-40ed-9133-4d0e879dfef0`; PR comment `https://github.com/FayaLabs/ymaia/pull/927#issuecomment-4700545142`.
- Added broker-proxied Google Calendar create/update/delete event routes:
  - `POST /api/v1/runtime/projects/:projectId/oauth/google-calendar/events`
  - `PATCH /api/v1/runtime/projects/:projectId/oauth/google-calendar/events/:eventId`
  - `DELETE /api/v1/runtime/projects/:projectId/oauth/google-calendar/events/:eventId`
- The routes require a runtime-plugin-oauth Bearer token with a Google Calendar write grant.
- Fayz resolves and refreshes Google provider tokens server-side; runtime/plugin code still receives no provider token.

Impact:

- Agenda plugins can now create, edit, and cancel Google Calendar events through the broker.
- This moves the OAuth broker from read-only proof to the minimum operational path for booking workflows.

Risk:

- Still incomplete for production-grade public plugin platform: revocation, audit trail, SDK helper wrapper, and provider onboarding UI remain.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-auth.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: passed.

Self-improvement:

- First M9 gate caught a schema composition issue before runtime. The fix separated base event validation from refined create/update validation; future slices should run the smallest controller test before broader gates.

## M8 Google Calendar provider proxy — 2026-06-13 22:52 BRT

Result:

- Fayz commit `d651e111` pushed to PR `#927`: `feat(runtime): proxy google calendar through oauth broker`.
- Added `GET /api/v1/runtime/projects/:projectId/oauth/google-calendar/events`.
- The route requires a runtime-plugin-oauth Bearer token with a Google Calendar read grant.
- Fayz resolves and refreshes the Google Calendar provider token server-side.
- Response returns calendar events only; no provider access token, refresh token, or client secret is exposed.

Impact:

- Agenda plugins now have the first real provider read path through the broker.
- This moves OAuth from "stored/exchanged safely" to "usable without leaking provider credentials".

Risk:

- Still incomplete for full calendar product workflows: create/update/delete, revocation, detailed audit trail, and SDK helper contract remain.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-auth.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth-provider-token.service.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: passed.

## M7 OAuth broker exchange route — 2026-06-13 22:45 BRT

Result:

- Fayz commit `25e4f3e2` pushed to PR `#927`: `feat(runtime): add plugin oauth exchange route`.
- Added `POST /api/v1/runtime/projects/:projectId/oauth/exchange`.
- The route requires an existing runtime-data Bearer token and returns a short-lived Plugin OAuth broker token.
- Response includes redacted grant descriptors only; no provider access token, refresh token, client secret, or caller-provided tenant authority is exposed.

Impact:

- Generated apps now have a server-side exchange boundary for plugin OAuth.
- This is the first usable broker handshake between SDK/runtime plugins and Fayz-owned provider credentials.

Risk:

- Still not the complete broker. Provider proxy calls, provider-specific refresh/revocation, and audit trail remain next.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts src/modules/plugin-oauth/__tests__/runtime-plugin-oauth-token.test.ts src/modules/plugin-oauth/__tests__/plugin-oauth.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: passed.

## M6 OAuth broker foundation — 2026-06-13 22:39 BRT

Result:

- Fayz commit `09ffa8b4` pushed to PR `#927`: `feat(runtime): add plugin oauth broker foundation`.
- Added server-side Plugin OAuth connection storage with encrypted access/refresh tokens.
- Added project/plugin/tenant/environment grants with redacted summaries.
- Added runtime grant resolver descriptors that expose capability metadata, not provider tokens.

Impact:

- Fayz now has the persistence layer needed for community plugins to authenticate through OAuth while `fayz-sdk` remains open source.
- This avoids repeating the old pattern of plugin/generated code owning provider credentials.

Risk:

- This is still the foundation, not the full Runtime Session Broker.
- Remaining FAY-1182 work: runtime exchange route, provider-specific refresh/revocation, audit trail, and final SDK helper contract.

Gate:

```bash
cd /Users/fayalabs/dev/fayz
npx prisma validate --schema packages/db/prisma/schema.prisma
npm run test -w @wowsome/api -- src/modules/plugin-oauth/__tests__/plugin-oauth-broker.service.test.ts
npm run build:api
```

Result: passed.

## Remote publication checkpoint — 2026-06-13 22:30 BRT

Result:

- Fayz branch `weekend-fayz-sdk-panel-manifest` was pushed to `origin`.
- Draft PR created: `https://github.com/FayaLabs/ymaia/pull/927`.
- Fayz branch now tracks `origin/weekend-fayz-sdk-panel-manifest`.

Impact:

- M2, M3, and M4 are no longer local-only.
- Fayz implementation is now reviewable as a draft PR against `dev`.

Risk:

- `/Users/fayalabs/dev/fayz-sdk` has no git remote configured, so M1/docs cannot be pushed from this repo yet.
- Do not guess the SDK remote URL; confirm before adding/pushing because the SDK is intended to be open source.

Next:

- Keep PR `#927` draft until OAuth broker gap and SDK remote decision are explicit.
- Configure/push the SDK branch only after the repo remote is explicit.
- Keep `beauty-saas` validation-only until its branch is reconciled with origin.

## Docs operating record packaging — 2026-06-13 22:22 BRT

Package scope:

- `/Users/fayalabs/dev/fayz-sdk/docs/discovery/`
- `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`

Purpose:

- Preserve the weekend mission, architecture decisions, milestone gates, OAuth/open-source guardrails, Linear status, and Beauty proof in repo history.
- Reduce reliance on the long thread and make the 30-minute status agent faster and more accurate.

This is docs-only. It should not include SDK UI/plugin/shell experimental files.

## Executive packaging checkpoint — 2026-06-13 21:58 BRT

Created `/Users/fayalabs/dev/fayz-sdk/docs/discovery/23-milestone-packaging-plan.md`.

Purpose: convert the current large dirty branches into reviewable milestone commits and stop rabbit-loop contract polishing.

Plan:

- M1: SDK core/runtime manifest + data provider foundation.
- M2: Fayz AppManifest API + Panel renderer.
- M3: generated-project scaffold + agent guardrails.
- M4: runtime data/OAuth broker direction.
- M5: Beauty agenda proof/fixes.

Rules:

- Stage explicit files only; never `git add .`.
- Run the listed gate before each commit.
- Do not mix SDK, Fayz API/Panel, scaffold, Beauty, and docs-only work in one commit.
- Do not commit `beauty-saas` while it is behind origin until branch strategy is explicit.
- No new broad implementation before at least one coherent milestone is packaged.

Process check: no stuck test/build process; Beauty Vite remains healthy on `127.0.0.1:5180`.

## First milestone commit — 2026-06-13 22:04 BRT

M1 packaged and committed in `/Users/fayalabs/dev/fayz-sdk`:

```txt
c967b26 feat(sdk): lock app manifest runtime contract
```

What this protects:

- SDK `AppManifest` v2 validation and exported JSON Schema strictness.
- `fayz-api` data provider entrypoint in `@fayz/core`.
- Manifest-aware `resolveDataProvider()` backend routing.
- Runtime umbrella export cleanup and real `@fayz/runtime/styles.css` build output.
- Repeatable root `pnpm check:manifest` gate scoped to `@fayz/core`.

Gate run before commit:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm check:manifest
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Result: passed. Known non-blocking noise: SDK `.npmrc` warns about missing `${NODE_AUTH_TOKEN}`.

Operational impact: weekend work now has its first reviewable milestone commit. Remaining dirty SDK files belong to later packages: app shell/UI, agenda/financial proof, docs, and experimental packages.

## Second milestone commit — 2026-06-13 22:10 BRT

M2 packaged and committed in `/Users/fayalabs/dev/fayz`:

```txt
88f71e80 feat(panel): add db-backed app manifest surface
```

What this protects:

- DB-backed `ProjectAppManifest` storage by project, tenant, environment, and surface.
- Active manifest resolver and versioned writes.
- Project AppManifest routes guarded by project access plus VIEWER/EDITOR role checks.
- OpenAPI schema for strict AppManifest v2 writes.
- Editor Panel renderer that consumes active manifests additively.
- Initial Panel manifest seeding from base scaffold project creation.

Gate run before commit:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx src/__tests__/services/api/app-manifests.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/project-route-guard.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
npm run build:web
```

Result: passed. Known non-blocking Web build warnings are unchanged from existing build posture.

Operational impact: Fayz now has a reviewable Panel/AppManifest foundation. Remaining dirty Fayz files belong to M3 scaffold, M4 runtime/OAuth, agent status docs, and proof screenshots.

## Third milestone commit — 2026-06-13 22:13 BRT

M3 packaged and committed in `/Users/fayalabs/dev/fayz`:

```txt
864005d2 feat(scaffold): seed sdk app manifest contract
```

What this protects:

- Generated projects include `app.manifest.json`.
- Generated projects include `AGENTS.md`, `src/registry.tsx`, and `src/plugins.generated.ts`.
- Generated `package.json` exposes `test`, `typecheck`, and `build` scripts for coding agents.
- Programmatic generation seeds the same Panel manifest contract as normal project creation.
- Agent guardrails encode the open-source SDK/OAuth rule: no secrets, refresh tokens, or tenant authority in generated app/browser code.

Gate run before commit:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: passed.

Operational impact: new Fayz projects now start SDK-aware. Remaining dirty Fayz files are M4 runtime/OAuth, agent status docs, and proof screenshots.

## Fourth milestone commit — 2026-06-13 22:16 BRT

M4 packaged and committed in `/Users/fayalabs/dev/fayz`:

```txt
efa6e510 feat(runtime): add tenant-scoped data token foundation
```

What this protects:

- Short-lived runtime-data Bearer tokens.
- Dedicated generated-runtime database routes.
- Signed tenant row scope, never caller-provided tenant authority.
- Deny-by-default runtime row permissions.
- Runtime schema override rejection.
- OpenAPI coverage for runtime token and runtime row routes.

Gate run before commit:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/runtime-data-auth.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/database.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result: passed. Self-improvement: kept deny-by-default service behavior and fixed tests that assumed tenant scope without explicit permissions.

Operational impact: generated apps now have a safer runtime data foundation. `FAY-1182` still needs the OAuth-backed broker before public production readiness.

## Fifth milestone validation — 2026-06-13 22:20 BRT

M5 Beauty agenda proof validated in `/Users/fayalabs/dev/fayz-app/beauty-saas`.

What this proves:

- Agenda route loads at `http://127.0.0.1:5180/#/agenda`.
- Paid demo booking remains intact:
  - `TESTE-CODEX Agenda`;
  - `Corte de cabelo`;
  - `sábado, 13 de junho · 09:00 – 09:25`;
  - `Mano Capurro`;
  - `Barra da Tijuca`;
  - `R$ 120,00 · Pago`;
  - `Confirmed`.
- `./node_modules/.bin/tsc --noEmit` passed.
- `./node_modules/.bin/vite build` passed.

No Beauty commit was created because the branch is behind `origin/main` by 2 commits and this was validation-only.

Browser screenshot capture timed out twice at the browser layer; DOM proof and build/typecheck are the accepted evidence for this slice.

## Executive architecture update — 2026-06-13 21:53 BRT

Vini decision captured:

- Fayz SDK is open source.
- Plugin/integration authentication uses OAuth.
- SDK/generated apps/plugins must not own secrets, OAuth client secrets, refresh tokens, partner API keys, or tenant-authority decisions.
- Fayz-owned server-side infrastructure owns OAuth apps, token exchange, refresh/revocation, encrypted token storage, tenant grants, audit logs, and runtime token issuance.
- `FAY-1182` is no longer a vague production-session blocker; the direction is an OAuth-backed Runtime Session Broker.

Docs updated:

- `/Users/fayalabs/dev/fayz-sdk/docs/discovery/18-fay-1182-runtime-session-decision.md`
- `/Users/fayalabs/dev/fayz-sdk/docs/discovery/20-architecture-lock.md`
- `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`
- `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`
- `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`

Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: 10 tests passed.

Execution note: this was a strategy/doc/test alignment slice only. No runtime OAuth implementation was added yet. First focused scaffold test run failed because it still expected the old non-OAuth secret warning; the test was updated to lock the stronger OAuth-specific warning and then passed. Final process snapshot showed no stuck test/build process.

## Executive operating checkpoint — 2026-06-13 21:48 BRT

Decision: progress is real, but the branches are now too heavy to keep accumulating uncommitted work.

- Do not keep polishing manifest contracts unless a milestone explicitly needs it.
- Next unblocked work should be packaging mode: split current work into reviewable milestone groups, run the right gates, then commit only coherent slices.
- Recommended commit groups:
  1. `fayz-sdk` core/runtime manifest + data provider foundation.
  2. Fayz API `ProjectAppManifest` storage/resolver + Panel renderer.
  3. Generated-project scaffold/agent guidance.
  4. Beauty agenda proof/fixes, kept separate from SDK/API foundation.
  5. Docs/Linear operating record.
- Current operational risk: large dirty worktrees make rollback/review hard even though tests are green.
- Process check: no test/build process is stuck; Beauty Vite remains healthy on `127.0.0.1:5180`; terminal-log tool is unavailable in the current thread.

Latest `FAY-1178` SDK JSON Schema strictness gate passed at 2026-06-13 21:43 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.
- Root `pnpm check:manifest` now asserts the exported SDK `appManifestSchema` keeps `additionalProperties: false` at all strict manifest nodes:
  - root AppManifest;
  - `backend`;
  - `surface`;
  - `pluginRef`;
  - `page`;
  - `block`.
- This complements the runtime `validateManifest()` field-drift checks: agents/OpenAPI/schema consumers should learn the same strict shape the runtime enforces.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz/core`; 2 successful tasks; build cache hit; manifest contract check passed.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: app terminal tool was unavailable in this heartbeat, but process snapshots showed no stuck test/build process before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: schema drift is as dangerous as validator drift because generated agents and docs can learn from exported JSON Schema. Keep schema strictness in the same repeatable contract gate.

Latest `FAY-1178` SDK forbidden-field manifest gate passed at 2026-06-13 21:40 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.
- Root `pnpm check:manifest` now explicitly proves SDK `validateManifest()` rejects the remaining legacy Panel/API drift fields that agents were told not to write:
  - `surfaces.panel.id`;
  - `surfaces.panel.name`;
  - `plugins[0].title`;
  - `plugins[0].label`.
- This extends the prior drift gate that already covered top-level `manifest.title`, `surfaces.panel.title`, `pages[0].id`, `pages[0].title`, and `plugins[0].pluginId`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz/core`; 2 successful tasks; build cache hit; manifest contract check passed.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: whenever agent docs prohibit a manifest field, the repeatable SDK contract gate should assert that exact field is rejected, not rely on generic unsupported-key coverage.

Latest `FAY-1178` SDK manifest structural invariant gate passed at 2026-06-13 21:36 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.
- Root `pnpm check:manifest` now also proves SDK `validateManifest()` rejects structural AppManifest states that would make runtime/scaffold behavior ambiguous:
  - `backend.provider = "custom"` without `backend.adapterId`;
  - page with multiple renderers (`component` plus `entity`);
  - duplicate page path in a surface;
  - duplicate plugin id in a surface.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz/core`; 2 successful tasks; manifest contract check passed.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: SDK manifest contract gates should cover runtime ambiguity, not only schema/version drift. If agents create ambiguous pages or duplicate plugin/page ids, fail in `@fayz/core` before the manifest reaches scaffold/runtime.

Latest `FAY-1178` SDK manifest drift contract gate passed at 2026-06-13 21:31 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.
- Root `pnpm check:manifest` now also proves SDK `validateManifest()` rejects the legacy v2 drift fields that previously caused API/Panel mismatch:
  - top-level `manifest.title`;
  - `surfaces.panel.title`;
  - `pages[0].id`;
  - `pages[0].title`;
  - `plugins[0].pluginId`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz/core`; 2 successful tasks; manifest contract check passed.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: manifest contract gates should lock both version compatibility and forbidden legacy write-shape drift, otherwise agents can pass version checks while reintroducing fields the API/Panel cleanup already removed.

Latest `FAY-1178` generated-project validation command guidance passed at 2026-06-13 21:27 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- Generated-project agents now see the exact validation loop before claiming changes done: `npm run test`, `npm run typecheck`, and `npm run build`.
- Scaffold tests now prove the generated package exposes `test`, `typecheck`, and `build` scripts and that the generated `AGENTS.md` points agents at those commands.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: focused scaffold test passed, 10 tests.
- Build intentionally not repeated because this was generated-agent guide/template/test coverage only.
- Runtime/log check: no app terminal session attached; no stuck test/build process found before or after this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: when scaffold package scripts exist for agents, generated `AGENTS.md` should name the exact commands rather than generic "run build/tests" language.

Latest `FAY-1178` root manifest gate optimization passed at 2026-06-13 21:21 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/package.json`.
- Updated `/Users/fayalabs/dev/fayz-sdk/turbo.json`.
- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- Root `pnpm check:manifest` now runs `turbo check:manifest --filter @fayz/core`.
- Added a `check:manifest` turbo task depending on `build`, so the root command builds/checks only `@fayz/core` before importing `dist`.
- Corrected an inefficient first attempt: unfiltered `turbo check:manifest` ran 23 successful tasks across unrelated packages. The fixed root command ran only 2 cached tasks: `@fayz/core:build` and `@fayz/core:check:manifest`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm check:manifest
```

Result: packages in scope `@fayz/core`; 2 successful tasks; manifest contract check passed.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck test/build process remains after the optimization. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: never run unfiltered `turbo check:manifest` for a core-only manifest contract. Use root `pnpm check:manifest`, which is now filtered, to avoid broad package builds in heartbeat loops.

Latest `FAY-1178` SDK agent-guide validation loop update passed at 2026-06-13 21:16 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- The guide now tells SDK agents changing `@fayz/core` AppManifest runtime/schema behavior to run:

```bash
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/core check:manifest
```

- This makes the new repeatable manifest contract gate discoverable from the primary agent guide, not only package metadata or progress docs.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core check:manifest
```

Result: manifest contract check passed using the previously built `dist`.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: after adding a package gate, put the exact command sequence in the primary agent guide so future agents do not rediscover or retype ad hoc smoke commands.

Latest `FAY-1178` SDK AppManifest contract check script passed at 2026-06-13 21:11 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/package.json`.
- Added `/Users/fayalabs/dev/fayz-sdk/packages/core/scripts/check-manifest-contract.mjs`.
- The manual SDK AppManifest smoke is now a repeatable package command: `pnpm --filter @fayz/core check:manifest`.
- The check imports the built `packages/core/dist/index.js`, confirms `CURRENT_MANIFEST_VERSION === 2`, confirms exported JSON schema `manifestVersion.const === 2`, validates a canonical v2 manifest, and rejects v1/v3 manifests with `manifest.manifestVersion must be 2`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/core check:manifest
```

Result: typecheck passed; build passed; manifest contract check passed.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: replace ad hoc SDK dist smokes with package scripts so future heartbeat runs can execute the same gate quickly and consistently.

Latest Beauty agenda paid booking DOM proof refreshed at 2026-06-13 21:08 BRT:

- No code or data mutation in this slice.
- Browser-verified `http://127.0.0.1:5180/#/agenda`.
- Page-level proof confirmed the existing paid demo booking still renders with:
  - `TESTE-CODEX Agenda`;
  - `Corte de cabelo`;
  - `09:00 – 09:25`;
  - `Mano Capurro`;
  - `Barra da Tijuca`.
- Opening the booking popover confirmed:
  - `sábado, 13 de junho · 09:00 – 09:25`;
  - `Corte de cabelo`;
  - `Mano Capurro`;
  - `Barra da Tijuca`;
  - `Total`;
  - `R$ 120,00 · Pago`;
  - `Confirmed`.
- Browser console error log count for the tab: `0`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this proof. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle.
- Self-improvement: when revalidating Beauty popovers, assert the DOM's current split text (`Total` plus `R$ 120,00 · Pago`) instead of stale combined strings like `Total R$ 120,00`, and use unique browser-session variable names to avoid persistent-kernel redeclare errors.

Previous `FAY-1178` generated-agent v2 validator guidance passed at 2026-06-13 21:02 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- Agent-facing guidance now says `manifestVersion` must stay at `2` and explicitly notes SDK `validateManifest()` plus Fayz API public writes reject any other version.
- This closes the loop after the SDK/API v2 validation locks: generated-project agents should not try `manifestVersion: 1`, `3`, or any manual bump to signal feature work.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 10 passed; integrated API AppManifest/scaffold/generation gate 66 passed.
- Build intentionally not repeated because this was agent-guide/template/test coverage only.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: after enforcing a runtime/API contract, immediately mirror it in SDK guide plus generated `AGENTS.md` and lock the generated copy with scaffold tests.

Previous `FAY-1178` SDK AppManifest version lock passed at 2026-06-13 20:57 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/src/manifest/index.ts`.
- Updated `/Users/fayalabs/dev/fayz-sdk/packages/core/src/manifest/app-manifest.schema.json`.
- SDK `validateManifest()` now rejects any `manifestVersion` different from `CURRENT_MANIFEST_VERSION` (`2`).
- SDK exported `appManifestSchema` now documents the v2 schema with `manifestVersion.const = 2` instead of loose `minimum: 1`.
- This aligns SDK validation with the Fayz API public write lock: old/future manifest versions require explicit SDK/API migrations before they can validate or be persisted.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module -e "import { validateManifest, CURRENT_MANIFEST_VERSION, appManifestSchema } from './packages/core/dist/index.js'; /* v2 valid, v1/v3 rejected, schema const smoke */"
```

Result: `@fayz/core` typecheck passed; build passed; Node smoke returned `validProblems: 0`, v1/v3 problems `manifest.manifestVersion must be 2`, and `schemaConst: 2`.
- Known non-blocking noise: SDK `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: do not use `pnpm exec tsx` for SDK smokes unless `tsx` is installed in the SDK workspace; build first and smoke `packages/core/dist/index.js` with Node.

Previous `FAY-1178` public AppManifest version lock passed at 2026-06-13 20:53 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.constants.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/project-app-manifest.seed.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/app-manifest-openapi-schema.test.ts`.
- Added shared `CURRENT_APP_MANIFEST_VERSION = 2` for Fayz API AppManifest code paths.
- Public AppManifest writes now reject legacy/future `manifestVersion` values before persistence. The API no longer accepts v1 or v3 manifests that the current SDK runtime cannot safely render without registered migrations.
- OpenAPI now documents the AppManifest v2 lock instead of a loose `manifestVersion >= 1` contract.
- Internal scaffold seed still normalizes malformed generated manifest versions to v2 before DB writes.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts src/docs/__tests__/app-manifest-openapi-schema.test.ts src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: focused controller/OpenAPI tests 29 passed; integrated API AppManifest/scaffold/generation/OpenAPI parity gate 72 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: do not let public writes store manifest versions the current runtime cannot render. Keep old/future version handling behind explicit SDK/API migrations; seed sanitization can normalize generated JSON, but the public API should fail fast.

Previous `FAY-1178` scaffold AppManifest write-boundary guardrail passed at 2026-06-13 20:49 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- No runtime, scaffold output, or SDK package wiring changed in this slice.
- Added a controller regression that loads the generated scaffold `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/app.manifest.json` through `getBaseFiles()` and writes it through the real `createManifest` request validation path.
- This proves the template given to generated-project agents is accepted by the Fayz API AppManifest write boundary before it reaches `ProjectAppManifest` persistence.
- Did not add a hard test dependency on `@fayz/core` from the Fayz repo; `FAY-1181` package-source remains deferred. The cross-repo SDK `validateManifest()` smoke remains documented/manual until package wiring is locked.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused controller test 23 passed; integrated API AppManifest/scaffold/generation gate 64 passed.
- Build intentionally not repeated because this was test-only controller/scaffold coverage.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: when SDK package-source is blocked, prefer a Fayz API write-boundary regression over a brittle cross-repo test import; keep the SDK validator smoke manual/documented until `@fayz/core` source/version is locked.
- Linear `FAY-1178` consolidated checkpoint comment updated with this scaffold AppManifest write-boundary guardrail.

Previous `FAY-1178` scaffold surface set guardrail passed at 2026-06-13 20:41 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- No runtime or scaffold output changed in this slice.
- Added regression coverage proving the generated scaffold `app.manifest.json` starts with exactly `panel` and `admin` surfaces.
- The test also proves every generated scaffold surface id is one of the supported operational binding surfaces from `MANIFEST_SURFACES`.
- This complements the seed sanitizer: generated templates should start valid, while seed sanitization remains the safety net for malformed generated JSON.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 10 passed; integrated API AppManifest/scaffold/generation gate 63 passed.
- Build intentionally not repeated because this was test-only scaffold coverage.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: after adding sanitizer safety nets, add template regression tests so generated projects start correct instead of only being repaired during seed.
- Linear `FAY-1178` consolidated checkpoint comment updated with this scaffold surface set guardrail.

Latest `FAY-1178` generated-agent manifestVersion guidance guardrail passed at 2026-06-13 20:37 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- Agent-facing guidance now explicitly says to keep `manifestVersion` at `2` unless a real SDK/API manifest migration is registered and approved.
- Generated agents are told not to bump `manifestVersion` manually to signal feature work.
- This mirrors the scaffold seed sanitizer, which now emits a v2-shaped manifest and normalizes generated versions to `2` before `ProjectAppManifest` persistence.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 9 passed; integrated API AppManifest/scaffold/generation gate 62 passed.
- Build intentionally not repeated because this was agent-guide/template/test coverage only.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: every runtime/seed contract lock must be mirrored in agent-facing docs and protected by scaffold tests so generated project agents do not reintroduce drift.
- Linear `FAY-1178` consolidated checkpoint comment updated with this generated-agent manifestVersion guidance guardrail.

Latest `FAY-1178` scaffold seed manifestVersion lock passed at 2026-06-13 20:31 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/project-app-manifest.seed.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/project-app-manifest.seed.test.ts`.
- Internal scaffold seed now always writes the current AppManifest v2 version after sanitizing generated JSON.
- Legacy (`manifestVersion: 1`), invalid (`0`), and future (`3`) generated versions normalize to `2` before internal `ProjectAppManifest` persistence.
- Public AppManifest validation was not changed; this is scoped to generated-project seed safety because the sanitizer emits a v2-shaped manifest.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused seed test 14 passed; integrated API AppManifest/scaffold/generation gate 62 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: if a sanitizer emits a v2-shaped manifest, it must also normalize `manifestVersion` to v2; do not persist future/legacy generated versions without an explicit migration path.
- Linear `FAY-1178` consolidated checkpoint comment updated with this scaffold seed manifestVersion lock.

Latest `FAY-1178` scaffold surface-id sanitization passed at 2026-06-13 20:27 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/project-app-manifest.seed.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/project-app-manifest.seed.test.ts`.
- Internal scaffold seed now trims generated manifest surface keys, keeps the first normalized duplicate, and drops unsupported generated surfaces before writing `ProjectAppManifest`.
- Supported scaffold seed surfaces now stay aligned with the operational binding surfaces: `panel`, `admin`, `storefront`, and `portal`.
- Public AppManifest validation was not broadened or made stricter in this slice; the change is scoped to internal generated-project seed safety.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused seed test 12 passed; integrated API AppManifest/scaffold/generation gate 60 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: keep seed sanitization narrower than public AppManifest validation unless the SDK schema itself changes; internal generated files should normalize to supported Fayz binding surfaces before DB writes.
- Linear `FAY-1178` consolidated checkpoint comment updated with this scaffold surface-id sanitization.

Latest `FAY-1178` generated-agent scope guidance guardrail passed at 2026-06-13 20:21 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- Agent-facing guidance now explicitly teaches the `ProjectAppManifest` scope contract: `tenantKey + environment + surface`.
- Generated project agents now see the default scope `default / preview / panel`, trim-before-read/write behavior, failure on unsupported environments/surfaces, and the supported values `preview`, `production`, `panel`, `admin`, `storefront`, and `portal`.
- This keeps future coding agents aligned with the layered runtime contract now enforced in service, controller, adapter, and renderer.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 9 passed; integrated API AppManifest/scaffold/generation gate 59 passed.
- Build intentionally not repeated because this was agent-guide/template/test coverage only.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: when runtime contracts are locked, mirror them in both SDK agent guide and generated `AGENTS.md`, then add scaffold tests so future scaffold edits cannot silently drop the guidance.
- Linear `FAY-1178` consolidated checkpoint comment updated with this generated-agent scope guidance guardrail.

Latest Beauty agenda paid booking DOM proof refreshed at 2026-06-13 20:16 BRT:

- No code or data mutation in this slice.
- Browser-verified `http://127.0.0.1:5180/#/agenda`.
- Agenda page-level proof confirmed the existing booking still renders with:
  - `TESTE-CODEX Agenda`;
  - service `Corte de cabelo`;
  - time `09:00 – 09:25`;
  - staff/location `Mano Capurro` / `Barra da Tijuca`.
- Opening the booking popover confirmed:
  - `sábado, 13 de junho · 09:00 – 09:25`;
  - `Corte de cabelo (25min)`;
  - `Mano Capurro` / `Barra da Tijuca`;
  - `Total R$ 120,00 · Pago`;
  - status `Confirmed`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this proof. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: keep Beauty proof refresh non-mutating and open the popover before asserting payment/status. In the in-app browser API, locator waits need an explicit `state: "visible"`.
- Linear `FAY-1178` consolidated checkpoint comment updated with this Beauty proof refresh.

Latest `FAY-1178` AppManifest service scope normalization passed at 2026-06-13 20:12 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.service.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.
- The AppManifest service now trims and validates `environment` and `surface` for direct service callers before DB reads/writes, not only at the HTTP controller boundary.
- Unsupported service-level scope values now fail before Prisma queries/transactions; blank scope values still fall back to `preview` and `panel`.
- Service writes now trim `source`, reject blank source, and enforce the same 120-character provenance cap used by the HTTP contract.
- This protects internal seed/generation/future callers from bypassing the HTTP scope normalization contract.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused service test 16 passed; integrated API AppManifest/scaffold/generation gate 58 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: AppManifest scope normalization is now layered: service protects DB callers, controller protects HTTP callers, adapter/renderer protect Panel UI callers. For service runtime changes, run focused service, integrated API AppManifest/scaffold/generation gate, and `npm run build:api`.
- Linear `FAY-1178` consolidated checkpoint comment updated with this service scope normalization.

Latest `FAY-1178` AppManifest HTTP scope normalization passed at 2026-06-13 20:07 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/app-manifest-openapi-schema.test.ts`.
- The AppManifest HTTP boundary now trims `environment` and `surface` for active reads and writes, matching the previously locked `tenantKey/source` behavior and the web adapter/Panel renderer scope contract.
- Blank/unsupported `environment` and `surface` values are still rejected before service calls; whitespace-wrapped valid values now resolve to canonical enum values.
- Bound-surface validation uses the normalized `surface`, so a write with `surface: " admin "` correctly validates against `manifestJson.surfaces.admin`.
- OpenAPI now documents trim/blank behavior for `environment` and `surface` on request schemas and active-manifest query params.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: focused controller test 22 passed; focused OpenAPI schema test 3 passed; integrated API AppManifest/scaffold/generation gate 53 passed; OpenAPI schema plus route/OpenAPI parity gate 5 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: keep all four scope dimensions consistent across HTTP controller, OpenAPI, web adapter, and Panel renderer. For API runtime plus OpenAPI scope changes, run focused controller, focused OpenAPI schema, integrated API gate, schema+route parity, and `npm run build:api`.
- Linear `FAY-1178` consolidated checkpoint comment updated with this AppManifest HTTP scope normalization.

Latest `FAY-1178` Panel renderer scope normalization passed at 2026-06-13 20:02 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`.
- Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.
- The Panel renderer now trims `surface`, `environment`, and `tenantKey` props before API calls, scope labels, empty/missing-surface copy, and surface resolution.
- Blank/whitespace props now fall back to `panel`, `preview`, and `default`, matching the web API adapter and backend HTTP boundary behavior.
- Binding `surface` is also normalized before resolving the SurfaceManifest, so a blank/corrupt binding value cannot force a bad lookup when the requested scope is valid.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result: focused Panel renderer test 9 passed; web adapter plus Panel renderer gate 14 passed; web build passed.
- Known build warnings only: existing Tailwind arbitrary class ambiguity, Kallisto font runtime resolution, dynamic/static admin import chunk note, and large chunks.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before this slice. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: keep adapter and renderer scope normalization in lockstep; for web Panel runtime changes, run the focused renderer test, combined adapter+Panel gate, and `npm run build:web`.
- Linear `FAY-1178` consolidated checkpoint comment updated with this Panel renderer scope normalization.

Latest `FAY-1178` web AppManifest scope normalization passed at 2026-06-13 19:55 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/web/src/services/api/app-manifests.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/services/api/app-manifests.test.ts`.
- The Panel AppManifest API adapter now trims `surface`, `environment`, and `tenantKey` before building the active-manifest query string.
- Blank/whitespace scope params now fall back to `panel`, `preview`, and `default` instead of sending blank values to the API.
- This aligns the frontend adapter with the backend HTTP boundary normalization and avoids accidental Panel misses/400s from whitespace props.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result: focused web adapter test 5 passed; web adapter plus Panel renderer gate 13 passed; web build passed.
- Known build warnings only: existing Tailwind arbitrary class ambiguity, Kallisto font runtime resolution, dynamic/static admin import chunk note, and large chunks.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: `git diff` will stay empty for this slice while AppManifest web files are untracked; use direct file reads/status for verification until the files are staged. For web runtime adapter changes, run focused adapter test, Panel renderer gate, and `npm run build:web`.
- Linear `FAY-1178` consolidated checkpoint comment updated with this web scope normalization.

Latest `FAY-1181` generated scaffold package-source guardrail passed at 2026-06-13 19:49 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- No runtime/scaffold output changed in this slice; this is regression coverage for the existing blocked state.
- Added scaffold coverage proving generated projects remain free of hard `@fayz/*` package dependencies and static executable `@fayz/*` imports until package source is locked.
- The test still allows agent-facing guidance in `AGENTS.md` to mention future `@fayz/runtime` usage after package-source setup.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused scaffold test 8 passed; integrated API AppManifest/scaffold/generation gate 51 passed.
- Build intentionally not repeated because this was a test-only scaffold guardrail.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: FAY-1181 should stay a hard guard until package-source is approved. For test-only scaffold guardrails, focused scaffold plus integrated AppManifest/scaffold/generation gate is enough; save API builds for runtime/scaffold-output source edits.
- Linear `FAY-1178` consolidated checkpoint comment updated with this package-source guardrail because it protects generated AppManifest/scaffold rollout.

Latest Beauty agenda paid booking DOM proof refreshed at 2026-06-13 19:44 BRT:

- No code or data mutation in this slice.
- Browser-verified `http://127.0.0.1:5180/#/agenda`.
- Agenda page-level proof confirmed the existing booking still renders with:
  - `TESTE-CODEX Agenda`;
  - service `Corte de cabelo`;
  - time `09:00 – 09:25`;
  - staff/location `Mano Capurro` / `Barra da Tijuca`.
- Opening the booking popover confirmed:
  - `sábado, 13 de junho · 09:00 – 09:25`;
  - `Total R$ 120,00 · Pago`;
  - status `Confirmed`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before or after the proof. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: keep Beauty proof refresh non-mutating and open the popover before asserting payment/status; page-level text remains sufficient only for booking/service/time/staff/location.
- Linear `FAY-1178` consolidated checkpoint comment updated with this Beauty proof refresh.

Latest `FAY-1178` custom-scope active manifest write regression passed at 2026-06-13 19:39 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.
- No runtime code changed in this slice.
- Added service regression coverage proving an active manifest write in a custom `tenantKey + environment + surface` scope:
  - trims `tenantKey` before write;
  - archives only the previous active binding in that same custom scope;
  - creates the next active version with the requested `manifestJson`, `source`, and `activatedAt`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 11 passed; integrated API AppManifest/scaffold/generation gate 50 passed.
- Build intentionally not repeated because this was a test-only service contract slice.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: the custom-scope write path is now explicitly covered for active writes, so avoid more manifest-write scope tests unless runtime behavior changes; move next to Panel/scaffold or Beauty proof gaps.
- Linear `FAY-1178` consolidated checkpoint comment updated with this custom-scope write regression.

Latest `FAY-1178` OpenAPI AppManifest schema regression passed at 2026-06-13 19:36 BRT:

- Added `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/app-manifest-openapi-schema.test.ts`.
- No runtime/OpenAPI source behavior changed in this slice; this is a contract regression for the generated document.
- The test locks generated OpenAPI schema constraints for:
  - `CreateProjectAppManifest.tenantKey`;
  - `CreateProjectAppManifest.source`;
  - `ProjectAppManifest.tenantKey`;
  - nullable `ProjectAppManifest.source`;
  - active manifest lookup query `tenantKey`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/app-manifest-openapi-schema.test.ts src/docs/__tests__/route-doc-parity.test.ts
```

Result: focused OpenAPI schema regression 2 passed; OpenAPI schema regression plus route/OpenAPI parity 4 passed.
- Build intentionally not repeated because this was test-only, and the previous OpenAPI schema source/API build gate passed at 19:29 BRT.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found before the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: manual generated-document smokes that protect a contract should become focused regression tests before moving on. Keep route/OpenAPI parity for integrated revalidation, but use this new schema test for fast AppManifest OpenAPI contract checks.
- Linear `FAY-1178` consolidated checkpoint comment updated with this schema regression.

Latest `FAY-1178` OpenAPI AppManifest tenant/source constraints passed at 2026-06-13 19:29 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts`.
- No route/runtime behavior changed in this slice.
- OpenAPI now documents the AppManifest `tenantKey` and `source` constraints that the HTTP controller enforces:
  - request/response `tenantKey` and write `source` have `minLength: 1` and `maxLength: 120`;
  - active manifest lookup query `tenantKey` has `minLength: 1` and `maxLength: 120`;
  - descriptions mention trim behavior and blank-string rejection.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
node --input-type=module <OpenAPI tenantKey/source min-max smoke>
```

Result: route/OpenAPI parity 2 passed; API build passed; OpenAPI smoke confirmed create/response/query `tenantKey` and create/response `source` expose `minLength: 1` and `maxLength: 120`.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: for schema-only OpenAPI changes, use route/OpenAPI parity plus API build, and add a direct generated-document smoke when the change is about schema shape rather than route presence.
- Linear `FAY-1178` consolidated checkpoint comment updated with this OpenAPI constraints alignment.

Latest `FAY-1178` HTTP manifest source normalization passed at 2026-06-13 19:24 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- AppManifest HTTP write now trims explicit `source` at the controller schema boundary and rejects whitespace-only `source` before service calls. This keeps manifest provenance useful and avoids blank source strings in `ProjectAppManifest` rows.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused controller test 20 passed; integrated API AppManifest/scaffold/generation gate 49 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: `tenantKey` and `source` are now normalized at the HTTP boundary. Prefer moving to another AppManifest contract gap instead of adding more scalar trim-only tests unless a new runtime input is introduced.
- Linear `FAY-1178` consolidated checkpoint comment updated with this HTTP source normalization.

Latest `FAY-1178` HTTP tenantKey normalization passed at 2026-06-13 19:19 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.controller.ts`.
- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- AppManifest HTTP read/write now trims explicit `tenantKey` at the controller schema boundary and rejects whitespace-only `tenantKey` before service calls. This prevents accidental writes/reads falling through to the `default` tenant when a caller sends a blank tenant key.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: focused controller test 18 passed; integrated API AppManifest/scaffold/generation gate 47 passed; API build passed.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: because this touched controller runtime code, `npm run build:api` was required and passed. Continue reserving API builds for runtime/API source edits rather than test-only slices.
- Linear `FAY-1178` consolidated checkpoint comment updated with this HTTP tenantKey normalization.

Latest `FAY-1178` non-concurrent manifest write failure regression passed at 2026-06-13 19:13 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.
- No runtime code changed in this slice.
- Added service regression coverage proving `createProjectAppManifest()` does not retry non-concurrent Prisma write failures such as `P2003`; this prevents the retry loop from hiding real integrity/project-scope errors behind repeated work.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 10 passed; integrated API AppManifest/scaffold/generation gate 43 passed.
- Build intentionally not repeated because this was a test-only service contract slice.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: retry guard tests are now covering both positive and negative retry paths; continue with focused service first plus integrated AppManifest/scaffold/generation gate, but avoid adding more retry-only tests unless runtime behavior changes.
- Linear `FAY-1178` consolidated checkpoint comment updated with this non-concurrent failure regression.

Latest `FAY-1178` serializable manifest write retry regression passed at 2026-06-13 19:08 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.
- No runtime code changed in this slice.
- Added service regression coverage proving `createProjectAppManifest()` retries when Prisma aborts the serializable transaction boundary with `P2034`, not only when the inner create hits a scoped version collision.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 9 passed; integrated API AppManifest/scaffold/generation gate 42 passed.
- Build intentionally not repeated because this was a test-only service contract slice.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: service-only retry/normalization tests remain sub-second; keep using the focused service gate first, then the integrated AppManifest/scaffold/generation gate before updating docs/Linear.
- Linear `FAY-1178` consolidated checkpoint comment updated with this retry regression.

Latest `FAY-1178` active manifest tenant lookup regression passed at 2026-06-13 19:03 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.
- No runtime code changed in this slice.
- Added service regression coverage proving `getActiveProjectAppManifest()` trims `tenantKey` before querying an active binding, while preserving explicit `environment` and `surface` scope.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 8 passed; integrated API AppManifest/scaffold/generation gate 41 passed.
- Build intentionally not repeated because this was a test-only service contract slice.
- Runtime/log check: no app terminal session attached; no stuck/redundant test or build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: the established integrated API AppManifest/scaffold/generation gate is currently cheap enough for narrow service/controller test changes, so keep using it after focused AppManifest unit tests. Save API builds for runtime/API source edits.
- Linear `FAY-1178` consolidated checkpoint comment updated with this tenant lookup regression.

Latest SDK core AppManifest validator smoke passed at 2026-06-13 18:13 BRT:

- No code change in this slice.
- Rebuilt `/Users/fayalabs/dev/fayz-sdk/packages/core` and ran a Node smoke against `packages/core/dist/index.js`.
- Validated `validateManifest()` behavior for 7 cases:
  - valid manifest has `0` problems;
  - unsupported top-level `title` is rejected;
  - unsupported surface `id`, `name`, `title` are rejected;
  - unsupported page `id`, `title` are rejected;
  - unsupported plugin `pluginId`, `title`, `label` are rejected;
  - duplicate page paths/plugin ids are detected after trim normalization;
  - `backend.provider = "custom"` without `adapterId` is rejected.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core build
node --input-type=module <validateManifest smoke>
```

Result: `@fayz/core` build passed; smoke checked 7 cases successfully.
- Known non-blocking warning: `.npmrc` still references missing `${NODE_AUTH_TOKEN}` while reading config.
- Runtime/log check: no app terminal session attached; no stuck SDK build/test process found after the gate. Build did not add `dist` git churn.
- Self-improvement: `@fayz/core` currently has no package-local test script/runner. Do not add a new test runner opportunistically inside a heartbeat; first choose a repo-wide test standard. Also, avoid fragile `xargs sh -c node -e ...` quoting for package-script inventory; use direct `node` scripts or `jq` when available.
- Linear `FAY-1178` consolidated checkpoint comment updated with this SDK validator smoke.

Latest `FAY-1178` AppManifest route guard coverage passed at 2026-06-13 18:08 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/__tests__/project-route-guard.test.ts`.
- No runtime code changed in this slice.
- Added a specific guardrail asserting the Fayz SDK AppManifest project routes do not appear in the unguarded project route inventory:
  - `GET /api/projects/{}/app-manifests/active`;
  - `POST /api/projects/{}/app-manifests`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/project-route-guard.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: project-access guard ratchet 2 passed; route/OpenAPI parity 2 passed.
- Build intentionally not repeated because this was a test-only security/docs contract slice.
- Runtime/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: `project-route-guard` and route/OpenAPI parity both import the app. Keep them serialized, not parallel, to avoid redundant app boot work and noisy timing.
- Linear `FAY-1178` consolidated checkpoint comment updated with this route guard coverage.

Latest Beauty agenda paid booking DOM proof passed at 2026-06-13 18:04 BRT:

- No code change in this slice.
- Browser-verified `http://127.0.0.1:5180/#/agenda` without creating, editing, deleting, or cancelling bookings.
- Agenda loaded with the existing proof booking `TESTE-CODEX Agenda`.
- Opening the booking popover confirmed:
  - service `Corte de cabelo`;
  - time `sábado, 13 de junho · 09:00 – 09:25`;
  - staff/location `Mano Capurro` / `Barra da Tijuca`;
  - payment/status `R$ 120,00 · Pago` and `Confirmed`.
- Runtime/log check: no app terminal session attached; process snapshot showed no stuck test/build process. Beauty Vite on port `5180` remains healthy; long-lived Codex/browser MCP daemons remain idle at 0% CPU.
- Self-improvement: page-level agenda text shows the booking but not all financial/status detail. Open the booking popover before asserting `Pago` or `Confirmed`; do not count missing page-level payment text as a product regression.
- Linear `FAY-1178` consolidated checkpoint comment updated with this Beauty proof refresh.

Latest `FAY-1178` API active-manifest read contract coverage passed at 2026-06-13 17:58 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- No runtime code changed in this slice.
- Added controller coverage for `GET /projects/:projectId/app-manifests/active` behavior:
  - viewer authorization is required before returning an active binding;
  - tenant/environment/surface query scope is passed to the active resolver;
  - missing active binding returns `404` with `{ error: 'active manifest not found' }`;
  - empty query keeps undefined scope for service-side default normalization.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused controller test 14 passed; integrated API AppManifest/scaffold/generation gate 40 passed.
- Build intentionally not repeated because this was a test-only controller contract slice; last API build passed earlier in the FAY-1178 cleanup sequence.
- Runtime/log check: no app terminal session attached; no stuck test/build process found after the gate. Long-lived Codex/browser MCP daemons remain idle at 0% CPU. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: after a test-only API coverage slice, prefer the focused test plus the established integrated AppManifest/scaffold/generation gate. Save `npm run build:api` for runtime/API source changes or broader schema/doc edits.
- Linear `FAY-1178` consolidated checkpoint comment updated with this API read contract coverage.

Latest `FAY-1178` web AppManifest API adapter coverage passed at 2026-06-13 17:53 BRT:

- Added `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/services/api/app-manifests.test.ts`.
- No runtime code changed in this slice.
- New coverage locks the frontend AppManifest API adapter contract:
  - default active lookup sends `surface=panel`, `environment=preview`, `tenantKey=default`;
  - custom tenant/environment/surface params are preserved and URL-encoded;
  - 404 returns `null` for the Panel empty state;
  - non-404 API errors are rethrown.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts
npm run test -w @wowsome/web -- src/__tests__/services/api/app-manifests.test.ts src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result: focused adapter test 4 passed; adapter + Panel renderer gate 12 passed.
- Build intentionally not repeated because this was a test-only file; last web build passed at 17:50 BRT after the runtime renderer hardening.
- Runtime/log check: no app terminal session attached; no stuck test/build process found after the gate. Long-lived Codex/browser MCP daemons remain idle at 0% CPU. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: first adapter-test run failed because the new test used one too many `../` segments (`../../../../services/...`). For tests under `src/__tests__/services/api`, the correct relative import root back to `src` is `../../../`.
- Linear `FAY-1178` consolidated checkpoint comment updated with this adapter coverage.

Latest `FAY-1178` Panel title fallback hardening passed at 2026-06-13 17:50 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`.
- Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.
- Panel renderer now normalizes `manifest.name` and `binding.surface` before using them as card titles. Blank/corrupt manifest app names fall back to `Manifest app`; blank binding surface labels fall back to the requested surface id.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build -w @wowsome/web
```

Result: Panel renderer test 8 passed; web build passed.
- Runtime/log check: no app terminal session attached; no stuck test/build process found after the gate. Long-lived Codex/browser MCP daemons are idle at 0% CPU and should be treated as tool infrastructure, not product server health. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: process hygiene checks should distinguish idle Codex/browser daemons from stuck test/build commands. Do not start a new browser MCP just to verify a small renderer unit change; reuse browser tooling only when there is a real DOM/product proof to capture.
- Linear `FAY-1178` consolidated checkpoint comment updated with this title fallback hardening.

Latest `FAY-1178` Panel blank-display fallback cleanup passed at 2026-06-13 17:45 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`.
- Updated `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.
- Panel renderer now normalizes optional page/plugin display strings before rendering list cards:
  - blank `pages[].label` falls back to non-empty `pages[].path`, then `Page n`;
  - blank page `path`, `entity`, and `component` do not create blank descriptions;
  - blank `plugins[].config.label` falls back to non-empty `plugins[].id`, then `Plugin n`;
  - blank plugin `id` falls back to `manifest plugin ref` in the description.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build -w @wowsome/web
```

Result: Panel renderer test 8 passed; web build passed.
- Known non-blocking warnings: existing Tailwind ambiguous classes, unresolved runtime font path, dynamic import/static import chunk warning, and large chunk warnings.
- Runtime/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: `ManifestSurfaceSection` files are still untracked in this branch, so `git diff -- <file>` does not show new hunks. Use `git status --short` and direct reads for newly added files. Also, when a renderer intentionally shows the same fallback text as title and description, use `getAllByText` in RTL tests; a first assertion with `getByText('analytics')` failed on duplicate matches before the successful retry.
- Linear `FAY-1178` consolidated checkpoint comment updated with this Panel fallback cleanup.

Latest route/OpenAPI parity revalidation passed at 2026-06-13 17:39 BRT:

- No code change in this slice.
- Re-ran route/OpenAPI parity after the service row-domain regression coverage to keep docs/schema routing checks green.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: route/OpenAPI parity 2 passed in ~5.2s.
- Runtime/log check: no app terminal session attached; process snapshot showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: route/OpenAPI parity is slower than the tiny AppManifest unit gates. Keep it in integrated/revalidation checkpoints, not every tiny code-edit heartbeat.
- Linear not updated for this no-code revalidation to avoid checkpoint noise.

Latest `FAY-1178` service row-domain regression passed at 2026-06-13 17:35 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts`.
- No runtime code changed in this slice.
- Added regression coverage proving the AppManifest service rejects corrupt DB rows whose persisted domain values are outside the locked contract:
  - invalid `environment`, e.g. `staging`;
  - invalid `surface`, e.g. `mobile`;
  - invalid `status`, e.g. `published`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: focused service test 7 passed; integrated API AppManifest/scaffold/generation gate 38 passed.
- Runtime/log check: no app terminal session attached; process snapshot showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: `apps/api/src/modules/projects/__tests__/app-manifests.service.test.ts` is still untracked in this branch, so `git diff -- <file>` does not show this new hunk. Use `git status --short` and direct file reads for newly added tests unless/until staged.
- Linear `FAY-1178` consolidated checkpoint comment updated with this service row-domain regression.

Latest Fayz scaffold x SDK validator contract smoke passed at 2026-06-13 17:29 BRT:

- No code change in this slice.
- Rebuilt `@fayz/core` and validated Fayz generated-project template `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/app.manifest.json` with the real SDK `validateManifest()` from `/Users/fayalabs/dev/fayz-sdk/packages/core/dist/index.js`.
- Result: `problemCount: 0`; the generated scaffold manifest remains SDK-valid while `@fayz/runtime` package-source is intentionally deferred.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core build
node --input-type=module <validate Fayz scaffold app.manifest.json with SDK validateManifest>
```

- Runtime/log check: no app terminal session attached; process snapshot showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains the only expected product dev server.
- Self-improvement: this cross-repo smoke is a cheap way to catch scaffold/schema drift without installing unpublished runtime packages. It did not add `packages/core/dist` git churn in this run.
- Linear not updated for this no-code smoke to avoid checkpoint noise.

Latest Beauty agenda lookup smoke passed at 2026-06-13 17:27 BRT:

- No code change in this slice.
- Opened the agenda create modal without saving anything.
- Client lookup now returns existing `TESTE` options plus the quick-create row; the old B1 "client search never queries/results" backlog item does not reproduce in the current app.
- Service lookup returns `Corte de cabelo` for `Corte`; the old B2 "service search inert" backlog item does not reproduce in the current app.
- Reloaded `#/agenda` after the probe to clear typed modal state.
- Browser console check: no new warning/error logs during the lookup probe.
- Self-improvement: service lookup placeholder is `Buscar serviço para adicionar...`, not `Buscar serviço...`; use the actual placeholder from the accessibility snapshot before filling fields.
- Linear not updated for this no-code smoke to avoid checkpoint noise.

Latest Beauty agenda non-destructive browser proof passed at 2026-06-13 17:25 BRT:

- No code change in this slice.
- Reloaded `http://127.0.0.1:5180/#/agenda`, waited for the agenda data, and opened the exact `TESTE-CODEX Agenda` booking once.
- DOM/snapshot proof confirmed:
  - booking `TESTE-CODEX Agenda`;
  - service `Corte de cabelo`;
  - time `09:00 – 09:25`;
  - staff/location `Mano Capurro` / `Barra da Tijuca`;
  - payment/status buttons `R$ 120,00 · Pago` and `Confirmed`;
  - actions `Editar` and `Excluir`.
- Runtime/log check: no app terminal session attached; process snapshot showed no stuck/redundant test or build process. Beauty Vite on port `5180` remains the only expected product dev server.
- Browser console check: no new warning/error logs after reload.
- Self-improvement: Beauty payment strings can contain non-breaking spaces (`R$ 120,00`). Normalize whitespace or use the accessibility snapshot line/button label (`R$ 120,00 · Pago`) to avoid false-negative DOM text checks.
- Linear not updated for this no-code proof to avoid checkpoint noise.

Latest SDK core AppManifest validator smoke passed at 2026-06-13 17:17 BRT:

- No code change in this slice.
- Rebuilt `@fayz/core` and ran a Node smoke against `validateManifest()` from `packages/core/dist/index.js`.
- Smoke asserted the SDK validator rejects all documented legacy/non-v2 display fields:
  - top-level `title`;
  - `surfaces.*.id`, `surfaces.*.name`, `surfaces.*.title`;
  - page `id`, page `title`;
  - plugin `pluginId`, plugin `title`, plugin `label`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core build
node --input-type=module <validateManifest legacy-field smoke>
```

Result: core build passed; smoke checked 9 expected validator problems and found all 9. Known `.npmrc` `${NODE_AUTH_TOKEN}` warning remains non-blocking.
- Process/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite remains the only expected product dev server.
- Self-improvement: rebuilding `@fayz/core` did not add `packages/core/dist` git churn in this run. For no-code validator checks, prefer build + Node smoke over adding package-level test infra during heartbeat loops.
- Linear not updated for this no-code SDK validation to avoid checkpoint noise.

Latest AppManifest controller regression coverage passed at 2026-06-13 17:12 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts`.
- No runtime code changed in this slice.
- Expanded the existing unsupported-field rejection case to explicitly cover the same legacy/non-v2 display fields now documented for agents:
  - `surfaces.*.id`;
  - `surfaces.*.name`;
  - page `id`;
  - plugin `label`.
- Existing coverage already rejected top-level `title`, `surfaces.*.title`, page `title`, plugin `pluginId`, and plugin `title`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: controller test 12 passed; integrated API AppManifest/scaffold/generation gate 35 passed.
- Process/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite remains the only expected product dev server.
- Self-improvement: `apps/api/src/modules/projects/__tests__/app-manifests.controller.test.ts` is still untracked in this branch, so `git diff -- <file>` does not show the hunk. Use `git status --short` for these newly added test files unless/until they are staged.
- Linear `FAY-1178` consolidated checkpoint comment updated with this controller regression coverage.

Latest agent-guide/scaffold guidance lock passed at 2026-06-13 17:08 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- Updated Fayz generated project template `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/scaffold/template/AGENTS.md`.
- Added regression coverage in `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- Agent-facing contract now explicitly rejects legacy/non-v2 display fields:
  - top-level `title`;
  - `surfaces.*.id`, `surfaces.*.name`, `surfaces.*.title`;
  - page `id`, page `title`;
  - plugin `pluginId`, plugin `title`, plugin `label`.
- Canonical guidance now says:
  - page display text belongs in `pages[].label`;
  - plugin display/config metadata belongs in `plugins[].config`, such as `config.label`;
  - surface display/config metadata belongs in `surfaces.*.options`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 7 passed.
- Process/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite remains the only expected product dev server.
- Self-improvement: when searching docs/tests for strings that contain Markdown backticks, use `rg -F` with single-quoted patterns. A double-quoted `rg` pattern containing backticks triggered zsh command substitution noise before the successful retry.
- Linear `FAY-1178` consolidated checkpoint comment updated with this agent-guidance lock.

Latest OpenAPI AppManifest wording cleanup passed at 2026-06-13 17:02 BRT:

- Updated `/Users/fayalabs/dev/fayz/apps/api/src/docs/schemas/projects.ts` descriptions only.
- The generated OpenAPI schema now explicitly teaches canonical display metadata placement:
  - app display name: `manifest.name`;
  - surface display metadata: `surfaces.*.options`;
  - page display text: `pages[].label`;
  - plugin display/config metadata: `plugins[].config` such as `config.label`.
- It also explicitly warns against legacy/non-v2 fields: page `id/title`, plugin `pluginId/title/label`, and surface `id/name/title`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: route/OpenAPI parity 2 passed; API build passed.
- Process/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite remains the only expected product dev server.
- Self-improvement: this was a schema-description-only change. Do not update Linear for this micro-slice; keep it covered by the 16:59 BRT `FAY-1178` checkpoint unless behavior or tests change.

Latest `FAY-1178` Panel renderer canonical-contract cleanup passed at 2026-06-13 16:59 BRT:

- Tightened Fayz web `ManifestSurfaceSection` and its API client types so the Panel renderer no longer teaches forbidden AppManifest v2 fields.
- Canonical display mapping now uses:
  - app title from `manifest.name`;
  - surface title from `surfaces.*.options.title`;
  - page label from `pages[].label`;
  - plugin display label from `plugins[].config.label`, falling back to `plugins[].id`.
- Removed read/display fallback for forbidden new-write fields: top-level `title`, `surfaces.*.title`, `pages[].id`, `pages[].title`, `plugins[].pluginId`, `plugins[].title`, and `plugins[].label`.
- Kept narrow legacy array-surface resolution only for old read compatibility (`surface.id/name`), without using it as the canonical write/display contract.
- Files:
  - `/Users/fayalabs/dev/fayz/apps/web/src/components/dashboard/sections/ManifestSurfaceSection.tsx`;
  - `/Users/fayalabs/dev/fayz/apps/web/src/services/api/app-manifests.ts`;
  - `/Users/fayalabs/dev/fayz/apps/web/src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build -w @wowsome/web
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: web Panel renderer 7 passed; web build passed; API AppManifest/scaffold/generation gate 34 passed; route/OpenAPI parity 2 passed.
- Known non-blocking warnings: web build still emits existing Tailwind ambiguous class warnings, unresolved runtime font path, dynamic import/static import chunk warning, and large chunk warnings.
- Self-improvement: `@wowsome/web` has no `typecheck` script. Do not run `npm run typecheck -w @wowsome/web`; use `npm run build -w @wowsome/web` because it runs `tsc -b && vite build`.
- Process/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite remains the only expected product dev server.

Latest integrated `FAY-1178` gate revalidation passed at 2026-06-13 16:53 BRT:

- No code change in this slice.
- Re-ran the focused AppManifest/Panel/scaffold parity gates after SDK auth singleton hardening and Beauty client cleanup.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: API AppManifest/scaffold/generation gate 34 passed; web Panel renderer gate 7 passed; route/OpenAPI parity 2 passed.
- Process/log check: no app terminal session attached; no stuck test/build process found after the gate. Beauty Vite remains the only expected product dev server.
- Self-improvement: this gate can run as three parallel focused commands; route/OpenAPI parity is the slowest slice at ~5.6s wall time and should stay in integrated checkpoints, not every tiny no-code heartbeat.
- Linear not updated for this no-code revalidation to avoid checkpoint noise.

Latest SDK auth singleton type-hardening passed at 2026-06-13 16:46 BRT:

- Narrowed the injected `@fayz/auth` Supabase client type from `unknown` to `SupabaseClient`.
- This keeps the singleton fix from 16:42 BRT, but removes the broad escape hatch from the public auth config.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/auth typecheck
pnpm --filter @fayz/auth build
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/saas build
```

Result: all passed. Known `.npmrc` `${NODE_AUTH_TOKEN}` warning remains non-blocking.
- No Linear update for this micro-hardening; it is covered by the 16:42 BRT `FAY-1178` checkpoint.
- Self-improvement: there is no package-level test runner in `packages/auth` or `packages/saas` yet. Do not add test infra in heartbeat loops; use focused typecheck/build unless a real regression test surface already exists.

Latest SDK Supabase auth singleton cleanup passed at 2026-06-13 16:42 BRT:

- Fixed a structural version of the Beauty GoTrue duplicate-client issue in Fayz SDK:
  - `@fayz/auth` `createSupabaseAuthAdapter()` can now receive an already-initialized Supabase client;
  - `@fayz/saas` `createFayzApp` passes the SDK Supabase singleton into `@fayz/auth` instead of letting auth create a second browser client.
- Files:
  - `/Users/fayalabs/dev/fayz-sdk/packages/auth/src/adapters/supabase.ts`;
  - `/Users/fayalabs/dev/fayz-sdk/packages/saas/src/app/createFayzApp.tsx`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/auth typecheck
pnpm --filter @fayz/auth build
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/saas build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
npm run build
```

Result: all passed. Known non-blocking warnings remain: SDK `.npmrc` `${NODE_AUTH_TOKEN}` and Beauty/Vite chunk/dynamic-import warnings.
- Browser DOM/log proof after reload:
  - `http://127.0.0.1:5180/#/agenda` still shows `TESTE-CODEX Agenda`, `Corte de cabelo`, `09:00 – 09:25`, `Mano Capurro`, and `Barra da Tijuca`;
  - no new browser warning/error logs after reload.
- Self-improvement: when using the persistent Browser/Node REPL, use `var` or unique names for repeated proof variables. A reused `const proof` caused a false tool error before the successful retry.
- Linear `FAY-1178` consolidated checkpoint comment updated with this SDK auth singleton cleanup.

Latest lightweight scaffold revalidation passed at 2026-06-13 16:35 BRT:

- No code change in this slice.
- Re-ran the cheap generated-project scaffold gate after the Beauty singleton cleanup and the FAY-1182 AGENTS guardrail regression.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 6 passed in 430ms.
- Process/log check: no app terminal session attached; no stuck test/build process found. Beauty Vite remains the only expected product dev server.
- Linear was not updated for this no-code revalidation to avoid checkpoint noise.

Latest Beauty Supabase-client hygiene + paid proof passed at 2026-06-13 16:33 BRT:

- Fixed `/Users/fayalabs/dev/fayz-app/beauty-saas/src/integrations/supabase/client.ts` to reuse the Fayz SDK `@fayz/saas` Supabase singleton instead of creating a second browser GoTrue client.
- Reason: Beauty browser console had a Supabase warning for multiple GoTrueClient instances under the same storage key. This can produce undefined auth behavior and makes heartbeat browser checks noisier.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
npm run build
```

Result: build passed. Vite still emits existing chunk/dynamic-import size warnings; no TypeScript error after the singleton bridge cast fix.
- Browser DOM proof after reload:
  - no new warning/error logs after reload;
  - `TESTE-CODEX Agenda` visible on `http://127.0.0.1:5180/#/agenda`;
  - popover confirms Saturday, June 13, 2026, `09:00 – 09:25`;
  - service `Corte de cabelo (25min)`;
  - staff/location `Mano Capurro` / `Barra da Tijuca`;
  - payment `R$ 120,00 · Pago`;
  - status `Confirmed`;
  - edit/delete actions still present.
- Self-improvement: on Beauty agenda checks, wait ~3s after `domcontentloaded` before asserting booking text. The first DOM read can be too early and falsely report the booking missing.
- Linear `FAY-1178` consolidated checkpoint comment updated with this Beauty demo stability note.

Latest scaffold guardrail regression passed at 2026-06-13 16:25 BRT:

- Added a scaffold regression test in `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/__tests__/scaffold.test.ts`.
- The test now locks the generated `AGENTS.md` wording for public `fayz-api` runtime safety:
  - requires `createFayzApiProvider({ runtimeToken })`;
  - requires the Runtime Session Broker / server-side exchange warning;
  - requires the "do not claim production readiness" guardrail while `FAY-1182` is pending;
  - rejects browser-side partner `ApiToken`, raw Fayz secrets, or caller-provided tenant authority.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 6 passed.
- Linear `FAY-1182` guardrail checkpoint comment updated with this regression coverage.
- Process/log check: no thread terminal was attached; process snapshot showed no stuck test/build process. Only expected Beauty Vite server and Codex/browser tooling were active.
- Next unblocked work: keep tightening FAY-1178 contract/docs or repeat Beauty DOM proof if needed; do not implement public production `fayz-api` runtime exchange until Vini approves `FAY-1182`.

Latest `FAY-1182` agent guardrail passed at 2026-06-13 16:14 BRT:

- Updated `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md`.
- Updated Fayz generated project template `apps/api/src/modules/projects/scaffold/template/AGENTS.md`.
- Both now explicitly say public generated apps must not claim production readiness on `backend.provider = "fayz-api"` until the Runtime Session Broker / server-side exchange is approved and enabled.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: scaffold test 5 passed.
- Linear `FAY-1182` updated with this agent guardrail checkpoint.

Latest Beauty agenda non-destructive proof passed at 2026-06-13 16:10 BRT:

- In-app browser opened `http://127.0.0.1:5180/#/agenda`.
- Agenda rendered without login redirect.
- DOM proof confirms `TESTE-CODEX Agenda` is visible on Saturday, June 13, 2026 at 09:00–09:25.
- Popover proof confirms:
  - service: `Corte de cabelo (25min)`;
  - staff/location: `Mano Capurro` / `Barra da Tijuca`;
  - financial status: `Total R$ 120,00 · Pago`;
  - edit/action affordance still present.
- No data mutation was performed.

Self-improvement: the in-app Browser screenshot path timed out on `Page.captureScreenshot`, matching the earlier known issue. For heartbeat proof loops, use DOM proof first and only spend time on screenshots when acceptance specifically requires image evidence.

Latest `FAY-1178` stability revalidation passed at 2026-06-13 16:04 BRT:

- No code change in this slice.
- Revalidated the AppManifest/Panel contract after documenting the `FAY-1182` runtime-session blocker.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: API AppManifest/scaffold/generation gate 33 passed; web Panel renderer gate 7 passed; route/OpenAPI parity 2 passed.
- No stuck/redundant build or test process found after the gate.
- Linear `FAY-1178` checkpoint comment updated with this stability revalidation.

Latest `FAY-1182` decision note created at 2026-06-13 16:00 BRT:

- Added `/Users/fayalabs/dev/fayz-sdk/docs/discovery/18-fay-1182-runtime-session-decision.md`.
- Recommendation: default to a Fayz-hosted Runtime Session Broker for public generated apps.
- Alternatives documented: external deployment BFF, direct Supabase/RLS runtime, and rejected browser-minted/secret-in-browser flow.
- Minimum gates documented before production `backend.provider = "fayz-api"` can be marked done: server-derived tenant, runtime principal model, short-lived scoped tokens, refresh/revocation, SDK retrieval pattern, and negative/positive tests.
- This is an architecture approval blocker, not an implementation blocker for editor/preview or FAY-1178.
- Linear `FAY-1182` updated with this decision checkpoint.

Latest `FAY-1178` entity-definition cleanup passed at 2026-06-13 15:55 BRT:

- Closed another AppManifest schema drift: `entities` was documented as an array of objects, but API/SDK only checked that it was an array.
- SDK `validateManifest` now reports scalar entity entries as `manifest.entities[n] must be an object`.
- Fayz API AppManifest writes now reject scalar `entities[]` entries before DB writes.
- Scaffold seed now filters non-object `entities[]` entries before internal `ProjectAppManifest` writes.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module -e 'import { validateManifest } from "./packages/core/dist/index.js"; /* entity item validation smoke */'
```

Result: controller + seed tests 23 passed; API build passed; integrated API AppManifest/scaffold/generation gate 33 passed; SDK core typecheck/build/smoke passed.
- Linear `FAY-1178` checkpoint comment updated with this entity-definition cleanup.

Latest `FAY-1178` schema-only renderer/permission cleanup passed at 2026-06-13 15:49 BRT:

- Closed a canonical JSON Schema drift: API/OpenAPI/SDK already required non-empty page `entity`, page `component`, and `permission.feature/action`; `app-manifest.schema.json` now also marks those strings with `minLength: 1`.
- No Fayz API behavior changed in this slice; this was SDK schema contract alignment.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module -e 'import fs from "node:fs"; import { validateManifest } from "./packages/core/dist/index.js"; /* schema minLength + validateManifest smoke */'
```

Result: SDK core typecheck/build passed; smoke confirmed schema minLength and runtime validation for empty renderer/permission strings.
- Linear `FAY-1178` checkpoint comment updated with this schema-only cleanup.

Latest `FAY-1178` AppManifest backend-ref cleanup passed at 2026-06-13 15:45 BRT:

- Closed another SDK/API/schema drift: `backend.projectRef`, `backend.url`, and optional non-custom `backend.adapterId` now must be non-empty strings when present.
- Canonical JSON Schema and OpenAPI docs now mark these backend refs with `minLength: 1`.
- SDK `validateManifest` reports invalid backend refs before generated apps hit the Fayz API.
- Fayz API AppManifest writes reject invalid backend ref types/empty strings before DB writes.
- Scaffold seed behavior remains compatible: invalid/empty backend refs are trimmed or dropped, and unsafe custom backends still fall back to `mock`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module -e 'import { validateManifest } from "./packages/core/dist/index.js"; /* backend optional string smoke */'
```

Result: controller + seed tests 22 passed; route/OpenAPI parity 2 passed; API build passed; integrated API AppManifest/scaffold/generation gate 32 passed; SDK core typecheck/build/smoke passed.
- Linear `FAY-1178` checkpoint comment updated with this backend-ref cleanup.

Self-improvement: when running `node --input-type=module -e` from `zsh`, wrap the script in single quotes. Double-quoted template literals can emit `bad substitution` even if the smoke logic succeeds.

Latest `FAY-1178` AppManifest OpenAPI/schema docs cleanup passed at 2026-06-13 15:36 BRT:

- OpenAPI now documents `ProjectAppManifest.manifestJson` and `CreateProjectAppManifest.manifestJson` as structured AppManifest v2 JSON instead of `record(unknown)`.
- The docs cover manifest id slug, backend provider/config shape, surface/page/plugin/block shape, and mention API-enforced page renderer uniqueness / per-surface unique refs.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result: route/OpenAPI parity 2 tests passed; API build passed.
- Linear `FAY-1178` checkpoint comment updated with this OpenAPI docs cleanup.

Self-improvement: `z.lazy` recursive schemas fail the current OpenAPI generator. For recursive manifest blocks, document a non-recursive node plus description and keep recursive enforcement in the API validator.

Latest scaffold regression guard passed at 2026-06-13 15:40 BRT:

- `scaffold.test.ts` now guards the generated template `app.manifest.json` against unsupported v2 top-level/surface keys and invalid manifest id slug.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: scaffold test 5 passed; API AppManifest/scaffold/generation gate 32 passed. No API build was needed because only tests changed.
- Linear `FAY-1178` checkpoint comment updated with this scaffold regression guard.

Latest `FAY-1178` AppManifest/Panel integrated gate passed at 2026-06-13 15:29 BRT:

- Revalidated the full focused AppManifest/Panel gate after the schema-alignment microfixes:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result: API AppManifest/scaffold/generation gate 32 tests passed; web Panel renderer gate 7 tests passed.
- Linear `FAY-1178` checkpoint comment updated with this integrated gate.

Latest `FAY-1178` AppManifest schema-alignment cleanup passed at 2026-06-13 15:25 BRT:

- Closed an internal strictness gap: the public AppManifest controller rejected unsupported v2 fields, but scaffold/generation seed could pass a valid JSON manifest directly into `ProjectAppManifest` without normalizing it first.
- Public AppManifest writes now also detect duplicate page paths/plugin ids after `trim()` normalization, so API writes and scaffold seed use the same collision semantics.
- SDK `validateManifest` now reports duplicate page paths/plugin ids using the same trimmed collision key, so agents/apps catch the issue before backend writes.
- SDK `validateManifest`, Fayz API writes, and scaffold seed now enforce the schema's `manifest.id` slug contract (`^[a-z0-9][a-z0-9-]*$`); seed falls back invalid ids to `generated-app`.
- Fayz API AppManifest writes now reject invalid structured/scalar values that SDK validation already rejects: non-object `locale/theme/permissions/billing/backend.options/surface.options`, non-array `entities`, invalid page `label/icon/section/entity/component`, invalid plugin `config/enabled`, and invalid block `id/props`.
- `project-app-manifest.seed.ts` now sanitizes generated scaffold manifests before seeding:
  - keeps only strict v2 top-level keys;
  - normalizes backend provider and falls back unsafe/custom-without-adapter to `mock`;
  - sanitizes surfaces, pages, plugins, permissions, and blocks;
  - dedupes page paths and plugin ids per surface after string normalization; first valid entry wins;
  - drops legacy `pluginId`, `title`, extra page/plugin fields, and pages with multiple renderers;
  - still guarantees a safe `surfaces.panel` with `options.title`, `description`, `metrics`, and `actions`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
```

Result: seed test 7 passed; AppManifest/scaffold/generation gate 25 passed; API build passed.
- Linear `FAY-1178` updated with this checkpoint.
- Micro-cleanup at 14:48 BRT: sanitizer now trims normalized strings and avoids repeated optional-string/permisson resolution calls. Verification after cleanup:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test 7 passed; API build passed.
- Micro-cleanup at 14:53 BRT: provider and page `section` also use trimmed normalized strings, with explicit test coverage for whitespace around app id/name, custom backend adapter, page fields, permission fields, and plugin id. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test 8 passed; API build passed.
- Micro-cleanup at 14:58 BRT: scaffold seed now defaults invalid manifest versions (for example `0`) back to `2`, matching controller/SDK expectation that `manifestVersion >= 1`. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test 9 passed; API build passed.
- Micro-cleanup at 15:05 BRT: scaffold seed now collapses duplicate page paths/plugin ids per surface after trimming, preventing internal seed writes from failing controller-level strictness on duplicate collisions. First valid page/plugin wins. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: seed test 10 passed; API build passed.
- Linear `FAY-1178` updated with this checkpoint.
- Micro-cleanup at 15:07 BRT: controller duplicate validation now compares trimmed page paths/plugin ids, closing the public API side of the same collision gap. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: controller + seed tests 19 passed; API build passed.
- SDK runtime cleanup at 15:10 BRT: `@fayz/core` manifest validation now reports normalized duplicate page/plugin refs. Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module # smoke imported packages/core/dist/index.js validateManifest and asserted normalized duplicate page/plugin messages
```

Result: core typecheck passed; core build passed; smoke passed. Non-blocking warning remains: pnpm prints missing `${NODE_AUTH_TOKEN}` from `.npmrc`, but local commands still complete.
- Linear `FAY-1178` checkpoint comment updated to include SDK/API/seed duplicate semantics.
- Manifest id schema cleanup at 15:16 BRT: SDK/API now reject invalid manifest ids and scaffold seed normalizes invalid ids to `generated-app`. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module # smoke imported packages/core/dist/index.js validateManifest and asserted invalid id message
```

Result: API controller + seed tests 21 passed; API build passed; core typecheck/build/smoke passed.
- Linear `FAY-1178` checkpoint comment updated to include manifest id slug schema enforcement.
- API structured-value schema cleanup at 15:21 BRT: public AppManifest writes now reject invalid structured/scalar values that SDK `validateManifest` already reports. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: API controller + seed tests 22 passed; API build passed.
- Linear `FAY-1178` checkpoint comment updated to include API structured-value validation.
- Surface options schema cleanup at 15:25 BRT: public AppManifest writes now reject non-object `surfaces.*.options`, matching SDK/schema/seed behavior. Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: API controller + seed tests 22 passed; API build passed.
- Linear `FAY-1178` checkpoint comment updated to include `surfaces.*.options` validation.

Self-improvement: the first `build:api` caught a TypeScript-only missing constant after Vitest passed; keep running `build:api` after API TypeScript edits, not just tests.

Operational check at 15:24 BRT:

- Minimal git status checked for SDK, Fayz, and Beauty; dirty branches are expected weekend work.
- No stuck/redundant build or test process found; only expected Beauty Vite server is alive on `127.0.0.1:5180`.
- App terminal log tool is unavailable in this desktop heartbeat (`No handler registered for tool: read_thread_terminal`), so process list plus direct command output remain the fallback.

Latest route-doc parity gate passed at 2026-06-13 14:38 BRT:

- No stuck/redundant build or test process found; only expected Beauty Vite server is alive on `127.0.0.1:5180`.
- No app terminal session is attached, so no additional terminal logs are available.
- Route/OpenAPI parity still passes after the Panel manifest and runtime database route additions:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
```

Result: 1 file passed, 2 tests passed.

Latest `FAY-1178` AppManifest/Panel stability gate passed at 2026-06-13 14:31 BRT:

- Re-ran the narrow API/web contract tests after the `FAY-1182` runtime/API work and Beauty revalidation.
- API tests:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/modules/generations/__tests__/generations.service.test.ts
```

Result: 5 files passed, 24 tests passed.

- Web renderer test:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
```

Result: 1 file passed, 7 tests passed.

- Linear `FAY-1178` has been updated with this stability checkpoint.

Latest Beauty agenda revalidation passed at 2026-06-13 14:28 BRT:

- No stuck/redundant test or build process found; only expected Beauty Vite server is alive on `127.0.0.1:5180`.
- Beauty build passed:

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm build
```

- Playwright/headless UI proof passed from `/Users/fayalabs/dev/fayz`:
  - dashboard route still shows `Agenda de Hoje` with active bookings;
  - agenda route `#/agenda` renders FullCalendar with 34 event/background elements;
  - paid demo booking `TESTE-CODEX Agenda` is visible;
  - paid popover shows `Total R$ 120,00 · Pago`;
  - edit-test booking `TESTE-CODEX Edit 11h02` is visible;
  - delete-test booking `TESTE-CODEX Delete 13:34` is absent;
  - cancel-test booking `TESTE-CODEX Cancel 13:38` is absent.
- Screenshots:
  - `/Users/fayalabs/dev/fayz/beauty-agenda-current-proof-2026-06-13-1427.png`;
  - `/Users/fayalabs/dev/fayz/beauty-agenda-paid-popover-proof-2026-06-13-1428.png`.
- Removed stale intermediate screenshot `/Users/fayalabs/dev/fayz/beauty-agenda-current-proof-2026-06-13-1424.png` because it captured the dashboard after auth redirect, not the Agenda route. Use only the two screenshots above for this proof.
- Known non-blocking warning: Supabase logs "Multiple GoTrueClient instances" in the Playwright context; no page errors and no proof failure. Keep it as optimization debt unless it starts causing flaky auth/storage behavior.

Latest `FAY-1182` API docs/security cleanup passed at 2026-06-13 14:20 BRT:

- Closed a runtime-route hardening gap found during OpenAPI cleanup:
  - runtime data route no longer accepts caller-provided `schema` query override;
  - editor/admin route still supports schema override for database tooling.
- Added OpenAPI docs for:
  - `POST /api/projects/:projectId/database/runtime-token`;
  - runtime list/create/update/delete rows under `/api/v1/runtime/projects/:projectId/database/tables/:tableName/rows`.
- Runtime OpenAPI docs explicitly state:
  - tenant/perms come from signed runtime-data Bearer token claims;
  - schema override is not supported;
  - tenant scope cannot be widened by caller filters/body.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/runtime-data-auth.test.ts src/modules/database/__tests__/runtime-data-token.test.ts
npm run test -w @wowsome/api -- src/docs/__tests__/route-doc-parity.test.ts
npm run build:api
```

Result:

- 20 runtime/controller tests passed.
- Route-doc parity passed.
- API build passed.

Latest agent guidance checkpoint passed at 2026-06-13 14:16 BRT:

- Updated SDK `docs/agent-guide.md` and generated project `AGENTS.md` to teach the `fayz-api` split:
  - editor/admin uses `/api/projects/:projectId/database/...`;
  - generated runtime uses `createFayzApiProvider({ runtimeToken })` and `/api/v1/runtime/projects/:projectId/database/...`;
  - `runtimeToken` must be a short-lived signed runtime-data JWT;
  - never embed partner `ApiToken`, raw Fayz secrets, or browser-provided tenant authority.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
```

Result: 5 scaffold tests passed.

Latest `FAY-1182` editor/preview token issuer checkpoint passed at 2026-06-13 14:15 BRT:

- Added authenticated editor/preview runtime token issuer:
  - `POST /api/projects/:projectId/database/runtime-token`;
  - requires Fayz JWT plus project role `EDITOR`;
  - accepts `tenantId`, optional `tenantIdColumn`, optional permissions, optional expiry;
  - returns a short-lived runtime data Bearer token.
- This gives Fayz editor/preview and automated tests a trusted mint path without exposing public tenant-token issuance.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.service.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/runtime-data-auth.test.ts
npm run build:api
```

Result:

- 44 targeted API database/runtime tests passed.
- API build passed.

Remaining `FAY-1182` gap:

- Production generated app end-user auth/session is not solved by this preview issuer. Need a session/token exchange for external/customer users before saying `backend.provider = "fayz-api"` is production-ready for public generated apps.

Previous `FAY-1182` trusted runtime auth checkpoint passed at 2026-06-13 14:12 BRT:

- Existing partner `ApiToken` model is not used for generated SPA runtime data because it is long-lived/org-scoped and cannot safely live in browser code.
- Added signed runtime-data JWT foundation in Fayz API:
  - `projectId`;
  - `tenantId`;
  - optional `tenantIdColumn`;
  - deny-by-default `read/create/update/delete` permissions by entity/table;
  - short default expiry (`15m`);
  - strict audience/token-use verification.
- Added runtime middleware that rejects project/path mismatch and attaches `req.runtimeData`.
- Added versioned runtime row route:
  - `/api/v1/runtime/projects/:projectId/database/tables/:tableName/rows`
  - backed by the same row handlers, but tenant/perms come from signed claims.
- Updated `@fayz/core` `createFayzApiProvider()`:
  - new opt-in `runtimeToken`;
  - runtime token switches to `/api/v1/runtime/...`;
  - runtime token adds Bearer Authorization;
  - runtime mode does not inject client-side tenant filters/body defaults or do tenant preflight reads.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.service.test.ts src/modules/database/__tests__/database.controller.test.ts src/modules/database/__tests__/runtime-data-token.test.ts src/modules/database/__tests__/runtime-data-auth.test.ts
npm run build:api

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module <<'NODE'
// smoke createFayzApiProvider({ runtimeToken }) route/header/no-client-tenant-filter
NODE
```

Result:

- 43 targeted API database/runtime tests passed.
- API build passed.
- `@fayz/core` typecheck/build passed.
- SDK runtime provider smoke passed.

Remaining `FAY-1182` gap:

- Implement token issuance/refresh for generated apps. The verifier/router contract exists, but production needs a trusted issuer path:
  - Fayz-hosted BFF/session can mint short-lived runtime data JWTs;
  - external/custom deployments need an equivalent server-side token exchange;
  - do not embed partner `ApiToken` or raw Fayz secrets in generated browser code.

Previous `FAY-1182` backend enforcement checkpoint passed at 2026-06-13 14:05 BRT:

- Fayz API database row service now accepts a server-resolved `TenantRowScope`.
- Tenant-scoped list appends the trusted tenant filter after caller filters, so a hostile `tenantId` filter cannot widen access.
- Tenant-scoped create overrides caller-provided `tenant_id` with the trusted tenant.
- Tenant-scoped update adds trusted tenant to `WHERE` and drops tenant-column mutation from `SET`.
- Tenant-scoped delete adds trusted tenant to `WHERE` and ignores caller-provided tenant id in the row payload.
- Per-operation permissions (`read`, `create`, `update`, `delete`) are checked before DB link lookup/query execution.
- Fayz editor/admin database tooling stays unscoped by default.
- HTTP callers requesting `x-fayz-data-scope: runtime` or `tenant` currently receive `403 Runtime data access requires trusted tenant context`; this is intentional until generated-runtime auth/gateway derives tenant server-side.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/database/__tests__/database.service.test.ts src/modules/database/__tests__/database.controller.test.ts
npm run build:api
```

Result:

- 37 targeted database tests passed.
- API build passed.

Superseded by the 14:12 runtime verifier/router checkpoint. The remaining `FAY-1182` gap is token issuance/refresh for generated apps, not row-scope enforcement.

Self-improvement note:

- Full `database.service.test.ts` includes an existing 5s health-timeout test. During hot loops, use a narrower test filter for tenant row work, then run the full file/build only as the slice gate.

Latest generation manifest pipeline for `FAY-1180` passed at 2026-06-13 12:35 BRT:

- Base scaffold `app.manifest.json` now includes a safe `surfaces.panel.options` contract:
  - `title`;
  - `description`;
  - `metrics: []`;
  - `actions: []`.
- `seedProjectPanelManifestFromScaffold()` now creates a safe minimal AppManifest when generation cannot infer a Panel:
  - missing `app.manifest.json` no longer means no Panel binding;
  - invalid JSON falls back safely instead of failing project creation;
  - missing `surfaces.panel` gets an `admin` scaffold Panel with empty pages/plugins and options.
- Programmatic `/api/v1/generations` kickoff now calls `seedProjectPanelManifestFromScaffold(project.id, baseFiles)` in the same setup phase that creates base files.
- This covers both project creation paths:
  - interactive `POST /api/projects`;
  - programmatic `POST /api/v1/generations`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/generations/__tests__/generations.service.test.ts
npm run build:api
node --input-type=module <<'NODE'
// validate scaffold app.manifest.json with @fayz/core validateManifest()
NODE
```

Result:

- 12 targeted API tests passed.
- API build passed.
- SDK validator returned `{ valid: true, problems: [] }` for scaffold `app.manifest.json`.

Package-source blocker confirmed at 2026-06-13 11:44 BRT:

- `npm view @fayz/runtime` on npm public with forced `@fayz:registry=https://registry.npmjs.org` returns 404.
- `npm view @fayz/core` on npm public returns 404.
- `npm view @fayz/saas` on npm public returns 404.
- `npm view @fayz/runtime` on GitHub Packages returns 404 under owner `fayz`.
- `npm whoami --registry=https://npm.pkg.github.com` returns 403.
- Current SDK `.npmrc` maps `@fayz` to GitHub Packages and package `publishConfig` is `restricted`, but the packages are not available to this environment.
- Decision remains required before generated apps can hard-add `@fayz/runtime`: publish public npm packages, fix GitHub Packages owner/auth, use a private registry with token injection, or use another install source.
- Until then, Fayz scaffold must stay JSON/registry-ready and avoid adding `@fayz/runtime` to generated `package.json`.

Agent/runbook alignment passed at 2026-06-13 11:45 BRT:

- `/Users/fayalabs/dev/fayz-sdk/docs/agent-guide.md` now starts with a current operating status block for manifest-first generated projects.
- Generated template `AGENTS.md` now tells agents:
  - use `plugins[].id`, not `pluginId`;
  - keep `surfaces.panel` for Fayz editor Panel seed unless explicitly removed;
  - `surfaces.admin` is the generated app admin surface;
  - do not add `@fayz/runtime` until package source is locked.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: 7 scaffold/seed tests passed, API build passed.

Latest DB manifest active-scope hardening passed at 2026-06-13 11:49 BRT:

- Added a Postgres partial unique index in the Fayz migration to enforce one active `ProjectAppManifest` per `projectId + tenantKey + environment + surface`.
- Added a Prisma schema comment documenting the raw migration constraint because Prisma schema cannot express the partial unique index directly.
- Why it matters:
  - service-level archive/create logic and retry handling are necessary, but DB must still reject impossible state;
  - concurrent agents/API writes cannot leave two active manifests in the same Panel scope.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
npm run build:api
```

Result: 14 manifest/seed tests passed, API build passed.

Latest Panel renderer surface-resolution hardening passed at 2026-06-13 11:50 BRT:

- Fixed `ManifestSurfaceSection` so array-shaped legacy `surfaces` no longer fall back to the first surface when the bound/requested surface is missing.
- This prevents the Fayz Panel from rendering `admin` content as `panel` content.
- Added a component test proving the missing `panel` case shows the explicit contract error and does not render the `admin` surface.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result: 6 component tests passed, Web build passed with known Tailwind/font/chunk warnings.

Latest write-time AppManifest v2 strictness passed at 2026-06-13 11:52 BRT:

- Fayz API manifest writes now reject fields outside the SDK AppManifest v2 schema.
- Examples rejected on write: top-level `title`, `surfaces.panel.title`, page `title`, plugin `title`, and legacy `pluginId`.
- Read/render code can still tolerate legacy display fields, but new DB writes must stay canonical.
- Added recursive validation for:
  - top-level manifest keys;
  - backend keys;
  - surface keys;
  - page keys and page permissions;
  - plugin ref keys;
  - block tree keys.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result: 19 manifest/scaffold tests passed, API build passed.

Latest SDK core validator alignment passed at 2026-06-13 11:56 BRT:

- `@fayz/core` `validateManifest()` now enforces the same AppManifest v2 strictness expected by the JSON schema:
  - unsupported top-level, backend, surface, page, permission, plugin-ref, and block fields are reported;
  - basic runtime types are checked for `manifestVersion`, object fields, `entities`, plugin config/enabled, page section, permissions, and recursive blocks;
  - valid manifests still pass without requiring a new schema-validation dependency.
- This makes Fayz API write validation and SDK runtime validation converge.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module -e "import { validateManifest } from './packages/core/dist/index.js'; /* smoke valid + invalid */"
```

Result: core typecheck passed, core build passed, smoke test returned `valid: []` and rejected extra fields. `.npmrc` still warns about missing `NODE_AUTH_TOKEN`; non-blocking.

Agent strict-schema guidance refreshed at 2026-06-13 11:57 BRT:

- Updated SDK `docs/agent-guide.md` and generated project `AGENTS.md` to state that new AppManifest writes must stay inside strict v2 schema.
- Explicitly forbids new `title`/`pluginId` ad hoc manifest fields.
- Directs agents to use:
  - `pages[].label` for page display text;
  - `plugins[].config` for plugin settings;
  - `surfaces.*.options` for surface-level display/config metadata.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts
```

Result: 7 scaffold/seed tests passed.

Generated project validation scripts passed at 2026-06-13 11:59 BRT:

- Fixed a scaffold inconsistency: generated projects included `src/test/example.test.ts` but dynamic `package.json` had no `test` script and no `vitest` dev dependency.
- New generated `package.json` now includes:
  - `test: vitest run`;
  - `typecheck: tsc -b`;
  - `devDependencies.vitest`.
- This gives coding agents a real local validation path without adding unpublished SDK runtime deps.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/scaffold.test.ts
npm run build:api
```

Result: scaffold tests 5 passed, API build passed.

SDK `fayz-api` provider aligned to real Fayz API at 2026-06-13 12:03 BRT:

- Fixed `@fayz/core` `createFayzApiProvider()` to call the existing Fayz endpoint:
  - from aspirational `/api/projects/:projectId/data/:entity`;
  - to real `/api/projects/:projectId/database/tables/:tableName/rows`.
- Mapped SDK CRUD contract to Fayz database rows contract:
  - list: `pageSize -> limit`, `sortBy -> sortColumn`, `sortDir -> sortDirection`, response `{ rows, total } -> { data, total }`;
  - create: posts row data directly;
  - update: sends `{ primaryKeys, data }`;
  - remove: sends `{ rows: [primaryKeys] }`.
- Resolver now passes `schema`, `idColumn`, `tenantIdColumn`, and `searchColumns` from `EntityDef.data`.
- Tenant id from config now wins over caller-provided row data.
- Root `@fayz/core` now exports `createFayzApiProvider`, `FayzApiProviderConfig`, and `BackendProvider`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module <<'NODE'
// smoke: createFayzApiProvider list/create/update/remove URL + payload mapping
NODE
```

Result: core typecheck passed, core build passed, smoke proved endpoint mapping and tenant override. `.npmrc` `NODE_AUTH_TOKEN` warning remains non-blocking.

Fayz database rows OpenAPI docs aligned at 2026-06-13 12:06 BRT:

- Updated row-operation docs to match the actual controller contract used by the SDK `fayz-api` provider:
  - GET uses `page`, `limit`, `sortColumn`, `sortDirection`, `filters`, and optional `schema`;
  - GET response includes `{ rows, total, page, limit }`;
  - PATCH request uses `{ primaryKeys, data }` and returns the updated row;
  - DELETE request uses `{ rows: [...] }` and returns `{ deletedCount }`.
- Added `400`/`403` responses where route/controller can produce them.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run build:api
```

Result: API build passed after removing one unused docs helper caught by `tsc`.

SDK `fayz-api` tenant mutation guard added at 2026-06-13 12:07 BRT:

- Fixed a false-security issue in `createFayzApiProvider()`:
  - tenant id is no longer sent inside `primaryKeys`, because Fayz database controller only uses actual table PK columns in the SQL `WHERE`;
  - when a tenant is active, SDK now preflights update/delete with a tenant-scoped GET for `{ idColumn, tenantIdColumn }`;
  - PATCH/DELETE still send only the real PK body shape expected by Fayz.
- Tenant id from config still wins over create payload data.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
node --input-type=module <<'NODE'
// smoke: update/delete preflight tenant-scoped GET before mutation
NODE
```

Result: core typecheck/build passed; smoke showed GET tenant preflight before PATCH/DELETE.

Architecture note: this is SDK-level guardrail only. If generated end-user runtimes call Fayz database rows directly, Fayz API still needs server-side tenant/permission enforcement instead of trusting client-supplied tenant filters.

Linear blocker/guardrail created at 2026-06-13 12:08 BRT:

- Created `FAY-1182` — `[SDK] Server-side tenant enforcement for Fayz API data provider`.
- Scope: make `backend.provider = "fayz-api"` safe for generated end-user runtimes by resolving tenant/permissions server-side.
- This blocks exposing Fayz database rows as production generated-app backend.
- This does **not** block:
  - DB-backed Panel manifest foundation;
  - generated scaffold manifest seed;
  - editor/admin proof work;
  - SDK provider contract alignment as long as docs keep the limitation explicit.

Consolidated gates passed at 2026-06-13 12:10 BRT:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:api
npm run build:web

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
```

Result:

- Fayz API targeted tests: 23 passed.
- Fayz Web manifest renderer tests: 6 passed.
- Fayz API build: passed.
- Fayz Web build: passed with known Tailwind/font/chunk warnings.
- SDK `@fayz/core` typecheck/build: passed with known `.npmrc` `NODE_AUTH_TOKEN` warning.

Latest useful Panel proof for `FAY-1179` passed and Linear was closed at 2026-06-13 12:27 BRT:

- Updated Fayz Web `ManifestSurfaceSection` to render useful manifest-owned Panel content from `surfaces.panel.options`:
  - `options.title`;
  - `options.description`;
  - `options.metrics[]`;
  - `options.actions[]`.
- Host-owned dashboard navigation/sections remain outside the manifest contract.
- Created active proof binding on project `ede4a8e6-3869-458d-a908-2a5062fbe7aa`:
  - binding id `432d2028-3c59-41c0-8332-72e2b394ad99`;
  - source `fay-1179-useful-panel-proof`;
  - `tenantKey=default`, `environment=preview`, `surface=panel`, `status=active`;
  - `versionNumber=2`;
  - manifest id `texas-rodizio-panel`.
- In-app Browser DOM proof passed at `http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard`:
  - manifest content visible: `Operação do Rodízio`, `Reservas hoje`, `42`, `Ocupação`, `76%`, `Ticket médio`, `R$ 148`, `Revisar reservas`, `Ajustar salão`, `Reservas`, `Mesas`, `Cardápio`;
  - host controls still visible: `Visão Geral`, `Dados`, `Armazenamento`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:web
```

Result: 7 Web component tests passed; Web build passed with known Tailwind/font/chunk warnings.

Operational cleanup:

- Browser tab parked on `about:blank`.
- API/Web dev servers stopped.
- Preview container `fayz.ai-preview-ede4a8e6` stopped after proof.
- Screenshot capture through in-app Browser CDP still times out on `Page.captureScreenshot`, but a Playwright/headless workaround succeeded.
- Screenshot evidence files:
  - `/Users/fayalabs/dev/fayz/fay-1179-panel-useful-proof-2026-06-13-1221.png`;
  - `/Users/fayalabs/dev/fayz/fay-1179-panel-useful-proof-2026-06-13-1221.jpg`;
  - `/Users/fayalabs/dev/fayz/fay-1179-panel-useful-proof-2026-06-13-1221-linear-small.jpg`.
- Linear attachment upload rejected the lightweight base64 with `Invalid base64 content provided`; docs/local screenshot paths are the evidence source of truth.
- `FAY-1179` status is now `Done`.
- Cleanup after the proof was verified:
  - no Fayz API/Web dev server left running;
  - no `fayz.ai-preview-ede4a8e6` container left running;
  - only unrelated Beauty Vite server on port `5180` remained active.
- Self-improvement note: editor dashboard proofs start/sync the project preview container and can produce health polling every ~1.3s until healthy, then ~5s. Future proof runs should navigate away from the editor, stop dev servers, and explicitly `docker stop` the preview container.

Latest Fayz generated-project manifest seed passed at 2026-06-13 11:41 BRT:

- New Fayz projects now seed a DB-backed `ProjectAppManifest` for the default Panel scope from scaffold `app.manifest.json`.
- Seed path:
  - controller creates the project;
  - controller reads `getBaseFiles()`;
  - files are created;
  - `seedProjectPanelManifestFromScaffold(project.id, baseFiles)` parses `app.manifest.json`;
  - if `surfaces.panel` exists, creates active binding with `tenantKey=default`, `environment=preview`, `surface=panel`, `source=project-scaffold`.
- Scaffold `app.manifest.json` now declares both:
  - `surfaces.panel` for Fayz editor Panel bootstrap;
  - `surfaces.admin` for generated app admin scaffold compatibility.
- This avoids depending on unpublished `@fayz/runtime`; the seed is pure JSON.
- Live local API proof passed:
  - created project `7d2c2d53-e4ff-43e3-bf0a-ba8d27950e0e` (`CODEx SDK Seed Proof 11h42`);
  - immediate active lookup returned binding `acf423be-d7b9-469b-b134-620720b71b1e`;
  - `tenantKey=default`, `environment=preview`, `surface=panel`, `status=active`, `source=project-scaffold`, `versionNumber=1`;
  - manifest surfaces: `admin`, `panel`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/project-app-manifest.seed.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result: 21 targeted API tests passed, API build passed, live local API seed proof passed.

Previous Fayz Panel/API bound-surface hardening passed at 2026-06-13 11:39 BRT:

- Fayz API manifest create now rejects a binding when the requested/default `surface` is missing from `manifestJson.surfaces`.
- Example blocked: `surface=panel` with a manifest that only declares `surfaces.admin`.
- Example allowed: `surface=admin` with a manifest that declares `surfaces.admin`; this keeps generated project `app.manifest.json` compatible with the admin scaffold.
- Defaults are now shared constants:
  - `DEFAULT_MANIFEST_TENANT_KEY=default`;
  - `DEFAULT_MANIFEST_ENVIRONMENT=preview`;
  - `DEFAULT_MANIFEST_SURFACE=panel`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result: 18 targeted API tests passed, API build passed.

Previous Fayz Panel/API manifest contract hardening passed at 2026-06-13 11:36 BRT:

- Fayz API manifest writes now require canonical plugin refs with `plugins[].id`.
- The controller no longer accepts `plugins[].pluginId` as a write-time fallback because SDK AppManifest v2 schema requires `id`.
- Web read/display code may still tolerate `pluginId` for legacy data, but new writes must be schema-aligned.
- OpenAPI query params for active manifest lookup now publish `environment` and `surface` enum values instead of loose strings.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result: 16 targeted API tests passed, API build passed; API build rerun also passed after OpenAPI query enum alignment.

Self-improvement correction:

- I accidentally ran a narrow API test command and the full targeted API test command in parallel after explicitly deciding not to duplicate same-package checks. No code harm, but it wasted a short cycle. Keep next same-package checks serialized.

Previous Fayz Panel/API versioning hardening passed at 2026-06-13 11:35 BRT:

- `ProjectAppManifest.activatedAt` is now nullable in Prisma schema and migration.
- Draft manifest creates now persist `activatedAt=null` instead of a misleading activation timestamp.
- Active manifest creates still set `activatedAt` at activation time.
- `createProjectAppManifest()` now retries concurrent scoped-version collisions:
  - retries Prisma `P2002` unique collisions on `(projectId, tenantKey, environment, surface, versionNumber)`;
  - retries Prisma `P2034` transaction conflicts;
  - uses serializable transaction isolation for the version/archive/create critical section.
- This keeps version numbers monotonic and makes concurrent active writes deterministic: last successful active create archives the previous active binding in the same scope.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run db:generate
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result: Prisma client regenerated, 15 targeted API tests passed, API build passed.

Previous Fayz Panel/API scope hardening passed at 2026-06-13 11:31 BRT:

- API manifest scope is now locked to supported values instead of accepting arbitrary strings:
  - environments: `preview`, `production`;
  - surfaces: `panel`, `admin`, `storefront`, `portal`;
  - statuses: `draft`, `active`, `archived`.
- Shared constants live in `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/app-manifests.constants.ts`.
- Controller validation, service types, service serialization, and OpenAPI schemas now share the same domain.
- Service now defensively rejects corrupt DB rows with invalid `environment`, `surface`, or `status` instead of returning a malformed API contract.
- Dashboard `ManifestSurfaceSection` now accepts `tenantKey`, `environment`, and `surface` props with safe defaults, so tenant-specific rendering is not hardcoded to `default/preview/panel`.
- Browser proof via in-app Browser DOM passed at `http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard`:
  - `Manifest surface` card visible;
  - scope `panel · preview · default` visible;
  - manifest `SDK PANEL PROOF`, `Painel Operacional`, `2 pages`, `2 plugins` visible;
  - host-owned `Visão Geral`, `Dados`, and `Armazenamento` remained visible.
- Screenshot capture failed again because Browser CDP `Page.captureScreenshot` timed out; use DOM/browser proof unless a fresh browser tab is needed specifically for screenshots.
- Dev logs note: opening the editor dashboard starts the preview container and polls health every ~1.3s until healthy, then every ~5s. Park/close the browser tab after proof to stop stream/polling noise.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx
npm run build:api
npm run build:web
```

Result: 14 targeted API tests passed, 5 targeted Web tests passed, API build passed, Web build passed. Web build warnings are the known Tailwind/font/chunk-size warnings.

Self-improvement for next cycles:

- For same-package work, run narrow tests first and only then the package build. Running build in parallel with failing tests wasted one cycle.
- For cross-package independent checks, parallel tests are useful.
- After browser proof, navigate away from editor pages or close the tab to stop SSE/health polling.

Latest gates passed at 2026-06-13 09:41 BRT:

```bash
cd /Users/fayalabs/dev/fayz
npm run build:api
npm run build:web
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.service.test.ts
npm run test -w @wowsome/web -- src/__tests__/components/dashboard/ManifestSurfaceSection.test.tsx

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/core typecheck
pnpm --filter @fayz/core build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
```

Known non-blocking warnings:

- Fayz web build emits existing Tailwind ambiguity/font/chunk-size warnings.
- SDK pnpm commands warn about missing `${NODE_AUTH_TOKEN}` in `.npmrc`; local gates still pass.

Latest browser verification passed at 2026-06-13 09:47 BRT:

- URL: `http://localhost:5173/editor/ede4a8e6-3869-458d-a908-2a5062fbe7aa?view=dashboard`
- Project: `Churrascaria Rodízio Texas`
- Auth used: local shared proof user `hermes-dashboard-proof@wowsome.local` via non-production `POST /api/auth/test-login`
- Result:
  - `Manifest surface` card visible;
  - manifest page `Agenda` visible;
  - host-owned `Visão Geral`, `Dados`, and `Armazenamento` controls still visible;
  - no 403 or project-load error after using the shared proof user.

Latest scaffold prep passed at 2026-06-13 09:57 BRT:

- New generated projects are SDK-ready, but do **not** hard-depend on `@fayz/runtime` yet.
- Reason: `@fayz/runtime` is not currently available from npm public or GitHub Packages under the `@fayz` scope, so adding it now would break `npm install` for generated projects.
- Template now includes:
  - `app.manifest.json`;
  - `AGENTS.md`;
  - `src/registry.tsx`;
  - `src/plugins.generated.ts`;
  - side-effect imports for local plugins/registry in `src/main.tsx`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz
npm run test -w @wowsome/api -- src/modules/projects/__tests__/app-manifests.controller.test.ts src/modules/projects/__tests__/app-manifests.service.test.ts src/modules/projects/__tests__/scaffold.test.ts src/middleware/__tests__/organization.test.ts
npm run build:api
```

Result: 12 targeted API tests passed; API build passed.

Decision needed before full `FAY-1180` completion:

- Lock how generated projects resolve the SDK package: publish `@fayz/runtime`, change package scope, use a private registry mapping, or use another install source.

Latest Beauty agenda SDK cleanup passed at 2026-06-13 10:02 BRT:

- `@fayz/plugin-agenda` Supabase provider now writes canonical agenda records to `saas_core.bookings` and `saas_core.booking_items`.
- It still creates/maintains the linked `saas_core.orders` + `saas_core.order_items` row for financial bridge compatibility.
- Runtime reads still use the public `v_bookings` view, so create/update/delete/check-conflict now align with the Beauty SQL view contract.
- Financial bridge no longer selects/updates nonexistent `orders.stage` or `orders.direction`; it maps payment status from `orders.status` plus `financial_movements`, and stores financial direction only in metadata/movement rows.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-agenda typecheck
pnpm --filter @fayz/plugin-agenda build
```

Result: typecheck and build passed. `.npmrc` still warns about missing `${NODE_AUTH_TOKEN}`; non-blocking.

Latest Beauty client Orders SDK cleanup passed at 2026-06-13 10:05 BRT:

- `@fayz/saas` client-orders provider no longer selects/filters nonexistent `orders.stage`.
- It no longer selects nonexistent `orders.starts_at`.
- It filters the UI's historical stage groups against `orders.status`.
- It fetches linked booking start times from `saas_core.bookings` by `order_id` so appointment dates can still render when available.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/saas build
```

Result: typecheck and build passed. Build emits existing bundle unused-import warnings from `@fayz/core`; non-blocking.

Latest Beauty app proof passed at 2026-06-13 10:12 BRT:

- Beauty aliases fixed from `../fayz-sdk` to `../../fayz-sdk` in:
  - `/Users/fayalabs/dev/fayz-app/beauty-saas/vite.config.ts`;
  - `/Users/fayalabs/dev/fayz-app/beauty-saas/tsconfig.json`;
  - `/Users/fayalabs/dev/fayz-app/beauty-saas/tailwind.config.ts`.
- Reason: Beauty lives under `/Users/fayalabs/dev/fayz-app/beauty-saas`; the SDK lives at `/Users/fayalabs/dev/fayz-sdk`.
- `@fayz/saas` tenant plugin RPC hydration is now opt-in via `pluginRuntime.hydrateTenantPlugins === true`, removing the recurring `get_tenant_active_plugins` 404 from static plugin apps.
- Browser proof:
  - URL: `http://127.0.0.1:5180/#/agenda`;
  - login: `teste@teste.com` / `teste123` from Beauty `docs/testing.md`;
  - Agenda rendered week view, professionals `Mano Capurro` and `My Staff`, and schedule blocks;
  - clean reload after RPC guard: `0 errors`, `1 warning` (dev/Supabase multi-client warning).
- Screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-proof-post-rpc-guard-2026-06-13-1012.png`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build

cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/saas typecheck
pnpm --filter @fayz/saas build
```

Result: all passed. Beauty Vite build has existing chunk/dynamic-import warnings; non-blocking.

Latest Beauty booking mutation proof passed at 2026-06-13 10:26 BRT:

- Created quick client `TESTE-CODEX Agenda` through the Agenda modal.
- Created an appointment through the UI:
  - professional: `Mano Capurro`;
  - location: `Barra da Tijuca`;
  - service: `Corte de cabelo`;
  - duration: 25 minutes;
  - total: R$120;
  - starts at `2026-06-13T12:00:00Z` / 09:00 BRT.
- DB proof:
  - `saas_core.persons` inserted the client;
  - `saas_core.bookings` inserted booking `4144bdc9-7e9a-4483-b301-610e97b6dc25`;
  - `saas_core.orders` inserted linked order `ce97b3b7-93dd-448c-aa19-3ad872f2f88e`, `kind=appointment`, `status=scheduled`, `total=120`.
- Runtime proof:
  - Beauty Agenda renders the created booking after reload;
  - screenshot: `/Users/fayalabs/dev/fayz/beauty-booking-mutation-proof-2026-06-13-1026.png`.
- SDK fix:
  - `@fayz/plugin-agenda` now merges `public.v_bookings` rows with canonical `saas_core.bookings` reads;
  - `getBookingById()` falls back from `v_bookings.id` to `bookings.id` / `bookings.order_id`;
  - `createBooking()` now throws if the created record cannot resolve from the read model instead of returning `null` after a success toast.
- Why this matters:
  - the local Beauty migration defines `public.v_bookings` from `saas_core.bookings`;
  - the current remote Supabase view still behaves like an older `orders`-based view and does not expose the newly created canonical booking;
  - the SDK now supports both shapes for demo safety, but the remote DB view still needs migration drift cleanup.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-agenda typecheck
pnpm --filter @fayz/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Result: all passed. Beauty Vite build still emits existing dynamic-import/chunk-size warnings; non-blocking.

Latest Beauty financial bridge proof passed at 2026-06-13 10:33 BRT:

- Updated the proof booking status through the Agenda UI from `scheduled` to `confirmed`.
- DB confirmed:
  - `saas_core.bookings.status=confirmed`;
  - linked `saas_core.orders.status=confirmed` before checkout.
- Ran payment checkout through the Agenda UI:
  - opened the `R$ 120,00 · Pendente` / Recebimento flow;
  - selected `PIX`;
  - confirmed checkout;
  - UI showed `Pagamento confirmado`, then after reload showed `R$ 120,00 · Pago`.
- DB confirmed:
  - `financial_movements` movement `d37b4ccb-53b6-43e9-bbb0-c16a93bc67c1`;
  - `invoice_id=ce97b3b7-93dd-448c-aa19-3ad872f2f88e`;
  - `amount=120`, `paid_amount=120`, `status=paid`, `payment_date=2026-06-13`;
  - `orders.reference_number=REC-00020`;
  - `orders.metadata.paidAmount=120`.
- Screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-financial-paid-proof-2026-06-13-1034.png`.
- SDK fixes:
  - `@fayz/plugin-agenda` financial bridge `resolvePaymentStatuses()` now resolves status from `financial_movements` in batch, not only from `orders.status`;
  - `mapInvoiceStatus()` now treats agenda statuses such as `confirmed` / `in_progress` / `no_show` as payment `none`;
  - `@fayz/plugin-financial` now updates `orders.status` on payment instead of the legacy/non-portable `orders.stage`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-financial typecheck
pnpm --filter @fayz/plugin-financial build
pnpm --filter @fayz/plugin-agenda typecheck
pnpm --filter @fayz/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Result: all passed. One earlier Agenda run failed falsely because `plugin-financial build` cleaned `dist` while Agenda typecheck/build was running; rerun after Financial finished passed. Do not parallelize dependency package builds with dependent package gates when `tsup` cleans `dist`.

Latest Beauty delete proof passed at 2026-06-13 10:37 BRT:

- Created a separate unpaid delete-test booking through a controlled authenticated seed:
  - client: `TESTE-CODEX Delete 13:34`;
  - booking: `71c134bc-18f5-408e-b191-4ac570ad99ce`;
  - order: `44a1c6fc-2a86-485b-bf9f-19b6c207394e`;
  - professional: `My Staff`;
  - service: `Corte de cabelo`;
  - local time: 12:00-12:25 BRT.
- Browser proof:
  - event rendered in Agenda;
  - first `Excluir` click opened explicit confirmation `Excluir este agendamento?`;
  - second `Excluir` confirmed deletion;
  - delete-test event disappeared;
  - paid proof booking `TESTE-CODEX Agenda` stayed visible.
- DB proof after confirmation:
  - `saas_core.bookings` row `71c134bc-18f5-408e-b191-4ac570ad99ce` removed;
  - `saas_core.orders` row `44a1c6fc-2a86-485b-bf9f-19b6c207394e` removed;
  - seeded client person remains, as expected, because deleting an appointment must not delete the client record.
- Screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-delete-proof-2026-06-13-1038.png`.

Latest Beauty paid-cancel proof passed at 2026-06-13 10:41 BRT:

- Created a separate paid cancel-test booking through a controlled authenticated seed:
  - client: `TESTE-CODEX Cancel 13:38`;
  - booking: `ec168913-0e42-47fc-8ee2-345b890eaa0b`;
  - order: `ed26c311-98a8-49c4-b598-ac84f825d002`;
  - movement: `339ec22a-6b45-4504-8621-d56cca86f903`;
  - payment status before delete: `paid`.
- Browser proof:
  - event rendered as paid;
  - `Excluir` + confirmation executed through UI;
  - after reload, cancel-test event disappeared;
  - paid proof booking `TESTE-CODEX Agenda` stayed visible.
- DB proof:
  - `saas_core.bookings.status=cancelled`;
  - `saas_core.orders.status=cancelled`;
  - `financial_movements.status=cancelled`;
  - records were preserved instead of hard-deleted, which is the correct behavior when financial movements exist.
- SDK fix found during this proof:
  - Agenda store refresh after create/update/delete/status/reschedule now reapplies the current filters (`dateRange`, professionals, location, statuses);
  - before this fix, the DB was correctly cancelled but the cancelled event could reappear because mutation refresh called `provider.getBookings({ dateRange })` without status filters.
- Follow-up architectural fix after this proof:
  - `updateBooking()` no longer propagates agenda lifecycle status into `saas_core.orders.status`;
  - `completeBooking()` no longer marks the linked order as `completed`;
  - rule to preserve: agenda lifecycle is `saas_core.bookings.status`; financial/order lifecycle is `saas_core.orders.status`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-agenda typecheck && pnpm --filter @fayz/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
```

Result: all passed. Browser reload proof: paid proof present, delete-test absent, cancel-test absent.
- Screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-paid-cancel-proof-2026-06-13-1042.png`.

Latest Beauty remote DB view drift cleanup passed at 2026-06-13 10:50 BRT:

- Confirmed remote `public.v_bookings` was still the old orders-based view using `saas_core.orders.starts_at`, `orders.stage`, and `orders.direction`.
- Added Beauty migration:
  - `/Users/fayalabs/dev/fayz-app/beauty-saas/supabase/migrations/20260613104300_fix_v_bookings_canonical.sql`.
- Also updated the older local Agenda migration to keep compatibility columns when reset locally:
  - `/Users/fayalabs/dev/fayz-app/beauty-saas/supabase/migrations/20260301000001_plugin_agenda.sql`.
- Applied the new migration to linked Supabase project `gphxclpkbtbucoqclbco` via `supabase db query --linked --file ...`.
- New remote `public.v_bookings` now reads from `saas_core.bookings` and keeps legacy-compatible columns:
  - `reference_number`;
  - `stage` as alias of `orders.status`;
  - `direction` from `orders.metadata->>'direction'`.
- REST proof:
  - `v_bookings?id=eq.4144bdc9-7e9a-4483-b301-610e97b6dc25` returns the canonical booking id, linked order id, services, `reference_number=REC-00020`, `stage=invoiced`, `direction=credit`.
- Browser proof after reload:
  - paid proof present;
  - unpaid delete-test absent;
  - paid cancel-test absent.
- Migration history repaired:
  - marked `20260301000001`, `20260331000001`, and `20260613104300` applied remotely because the new migration applies/supersets the Agenda view/function content.
- Migration-history follow-up:
  - fetched remote-only `20260401000001`, `20260402000001`, `20260404000001` into Beauty local migrations;
  - verified `20260101000009` / `20260101000010` objects and grants already existed remotely;
  - repaired remote migration history for `20260101000009` and `20260101000010`;
  - `supabase migration list --linked` now shows local and remote aligned through `20260613104300`.

Latest Beauty edit proof passed at 2026-06-13 11:06 BRT:

- Seeded a separate edit-test booking and preserved the paid demo proof booking:
  - client: `TESTE-CODEX Edit 11h02`;
  - booking: `2147ec56-5478-416d-9607-cab4d96ba8bd`;
  - order: `d706be72-30dc-46ca-9656-8b10080271cc`;
  - professional: `My Staff`;
  - service: `Corte de cabelo`.
- Edited through the Agenda UI, not direct DB mutation:
  - changed duration/price to 35min / R$155;
  - updated notes;
  - grid rendered `10:00 – 10:35`.
- DB/read-model proof:
  - `saas_core.bookings.ends_at=2026-06-13T13:35:00+00:00`;
  - `saas_core.orders.total=155`;
  - `saas_core.booking_items.duration_minutes=35`, `price=155`;
  - `saas_core.order_items.duration_minutes=35`, `unit_price=155`, `total=155`;
  - `public.v_bookings.services[].assigneeId` is preserved as `76954279-9679-4ef4-a58a-1703503957f3`.
- SDK fix found during proof:
  - `@fayz/plugin-agenda` `updateBooking()` now preserves the existing booking assignee as fallback when recreating `booking_items` and `order_items`;
  - before this, changing only duration/price could make item-level `assignee_id` null.
- Screenshot: `/Users/fayalabs/dev/fayz/beauty-agenda-edit-proof-2026-06-13-1109.png`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-agenda typecheck && pnpm --filter @fayz/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build
```

Result: all passed. Known warnings only: SDK `.npmrc` missing `${NODE_AUTH_TOKEN}` and existing Beauty dynamic-import/chunk-size warnings.

Latest Beauty dashboard proof passed at 2026-06-13 11:09 BRT:

- Fixed `Agenda de Hoje` dashboard section to exclude `cancelled` and `no_show` bookings from the operational list.
- Replaced the static Beauty dashboard KPI `Agendamentos Hoje = 12` with a real count from `public.v_bookings`, using the same active-status filter.
- Browser proof at `http://127.0.0.1:5180/#/`:
  - KPI `Agendamentos Hoje` renders `2`;
  - list shows active bookings `TESTE-CODEX Agenda` and `TESTE-CODEX Edit 11h02`;
  - cancelled proof booking `TESTE-CODEX Cancel 13:38` does not render.
- Screenshot: `/Users/fayalabs/dev/fayz/beauty-dashboard-proof-2026-06-13-1117.png`.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build
```

Result: passed. Known warnings only: existing dynamic-import/chunk-size warnings.

Latest Beauty working-hours proof passed at 2026-06-13 11:18 BRT:

- Exposed Agenda working-hours management as a real settings tab:
  - route: `/settings/agenda-working-hours`;
  - PT-BR label: `Horário de Funcionamento`;
  - component is wrapped in `AgendaContextProvider` and receives tenant id from plugin runtime.
- Fixed two issues found before saving:
  - `WorkingHoursView` now uses localized title/day labels instead of English hardcoded labels;
  - weekly save now deletes/recreates only weekly schedules and preserves date-specific exceptions plus existing location/capacity metadata.
- Browser proof:
  - opened `http://127.0.0.1:5180/#/settings/agenda-working-hours`;
  - selected `My Staff`;
  - clicked `Salvar`;
  - UI showed `Horários de trabalho salvos`.
- DB/RPC proof after save:
  - weekly schedules for `My Staff` preserved location metadata;
  - specific-date exception `2026-03-31` remained present and inactive with metadata `{ exceptionType: "unavailable", notes: "xxx" }`;
  - `get_available_slots` for `2026-06-17`, `My Staff`, 30min returned 18 slots.
- Verification:

```bash
cd /Users/fayalabs/dev/fayz-sdk
pnpm --filter @fayz/plugin-agenda typecheck && pnpm --filter @fayz/plugin-agenda build

cd /Users/fayalabs/dev/fayz-app/beauty-saas
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build
```

Result: all passed. Screenshot capture for this proof failed twice due browser CDP `Page.captureScreenshot` timeout; DOM/toast/DB/RPC evidence passed.

Current operational risks:

- `/Users/fayalabs/dev/fayz-sdk` is dirty with SDK foundation, runtime, SaaS/UI, docs, and quarantined courses/portal/plugin-courses work.
- `/Users/fayalabs/dev/fayz` is dirty with the Panel/API manifest slice.
- `/Users/fayalabs/dev/fayz-app/beauty-saas` is dirty and behind `origin/main` by 2 commits.
- Beauty app worktree is still dirty/behind, but local SDK alias, build, Agenda route proof, and paid popover proof are green.
- Next Beauty proof can move to final cleanup/importing the paid proof into Fayz editing workflows, or switch back to Fayz Panel/API cleanup. Do not delete/cancel the current paid proof booking unless Vini explicitly asks; it is useful demo evidence.
- Remote Beauty DB `public.v_bookings` drift is normalized, and `supabase migration list --linked` is aligned. Avoid broad DB changes anyway unless the target diff is reviewed first.
- Several `packages/saas/src/shell/*` files are untracked in SDK, so use `git status` as well as `git diff`.

No current blocker needs Vini approval. Do not wait passively.

## Durable supervisor

- Cron job: `75570b15f81d`
- Name: Fayz SDK weekend hourly supervisor
- Schedule: every 60 minutes
- Repeat: 72 times
- Delivery: origin Telegram thread
- Workdir: `/Users/fayalabs/dev/fayz-sdk`

## Codex thread heartbeat

- Automation id: `fayz-sdk-weekend-autonomous-loop`
- Name: Fayz SDK weekend autonomous loop
- Schedule: every 5 minutes
- Purpose: fallback/resume loop for this thread; keep work active if the foreground execution stops.
- Required behavior each run:
  - read this file and `docs/discovery/17-progress-log.md`;
  - inspect compact git status for `fayz-sdk`, `fayz`, and `beauty-saas`;
  - inspect recent test/server/terminal logs when available;
  - identify redundant, stuck, or slow execution patterns and update docs with a self-improvement note;
  - continue the narrowest unblocked task;
  - report Done/Now/Blocked/Next concisely.

## Active Codex research processes

Started as background PTY processes with completion notification:

| Lane | PID | Output |
|---|---:|---|
| SDK manifest/provider | 89906 | `docs/discovery/research/sdk-manifest-provider.md` |
| Fayz Panel/API | 90013 | `docs/discovery/research/fayz-panel-api.md` |
| Generated project scaffold | 90142 | `docs/discovery/research/generated-project-scaffold.md` |
| Beauty proof | 90286 | `docs/discovery/research/beauty-proof.md` |
| Package/design-system | 90437 | `docs/discovery/research/package-design-system.md` |

## Next automatic step

Research outputs already exist and were consolidated into:

- `docs/discovery/20-architecture-lock.md`
- `docs/discovery/21-implementation-plan.md`

Next automatic step is no longer research consolidation. It is browser verification and cleanup of the first implementation slice, then Beauty proof verification if the app can run without disturbing the dirty worktree.

## No-go right now

- no broad plugin implementation;
- no new Linear issue flood before current slice status is verified and summarized;
- no additional DB migration beyond the existing `ProjectAppManifest` slice unless a failing gate proves it is required;
- no Medusa/Cal.diy implementation;
- no simultaneous edits on generated app runtime before Panel/API + SDK gates are clean;
- no Beauty app migration from the current dirty/behind worktree unless a failing proof shows the exact minimal edit needed.
