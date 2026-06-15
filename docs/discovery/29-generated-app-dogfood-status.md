# 29 — Generated App Dogfood Status

Snapshot: 2026-06-15 08:13 UTC / 05:13 BRT

## Executive Status

Resultado:

- Four dogfood apps pass the generated-app contract and typecheck gate:
  Beauty/BeautyPlace, shopfront, Resto/The Chef, and marketplace/admin.
- The full gate currently reports zero warnings across the four apps.
- Fayz MCP now exposes `get_fayz_sdk_agent_rollout_status` so agents can read
  `ready/warn/blocked/misconfigured` rollout status before calling
  `send_message`.
- When called with `projectId`, the status tool now exposes
  `requestedProjectReady` and `requestedProjectStatus`; scoped MCP/chat must
  require `requestedProjectReady === true`.
- Fayz MCP `send_message` now runs strict doctor preflight for scoped block
  projects and blocks before credits/codegen unless the target project is
  `ready`.
- Full operational MCP proof passed on runtime project
  `2a558057-7135-4229-8c9f-6cea559b8188`:
  - `get_fayz_sdk_agent_rollout_status` returned `ready` for the target.
  - `send_message` then edited only `src/pages/Index.tsx`.
  - Post-generation scope gate passed with the file classified as `app-owned`.
  - `finalStatus: "ready"`, `scopeGateBlocked: false`, deferred build passed.
  - Version 3 `Add rollout proof text` was created as `RELEASED`.
- The contract gate now warns when generated apps carry local platform-engine
  copies under `src/plugins`, `src/runtime`, or `src/app-runtime`.
- `pnpm check:generated-dogfood:strict` passes across the four apps and treats
  warnings as blockers for pre-agent operation.
- `pnpm check:generated-agent-scope <app> --strict` now classifies an edited
  generated app's changed files before the dogfood gate.
- Fayz generated-app scaffold now emits the app-owned edit boundary and SDK gate
  instructions in each generated app's `AGENTS.md`.
- Fayz repo now exposes `npm run check:fayz-sdk-agent-gates` as a wrapper for
  the scope gate plus strict dogfood gate.
- The Fayz wrapper now has `--dry-run` and a focused Node test.
- The SDK scope gate now has `pnpm test:generated-agent-scope`, covering
  app-owned/review/blocked/clean paths and the no-`--base` current diff path.
- `pnpm check:generated-dogfood --json` now emits machine-readable dogfood
  status for agents/status reports without parsing the Markdown table.
- `pnpm check:generated-dogfood --summary` emits the same status in executive
  `Resultado / Impacto / Risco / Proximo` format.
- `pnpm test:generated-dogfood` covers the JSON status output.
- `pnpm check:generated-agent-scope <app> --json --strict` now emits
  machine-readable app-owned/review/blocked status for runtime/agent consumers.
- The current proof is no longer "can we build individual apps?". The proof is:
  generated apps keep business/product code in the repo while reusable SDK or
  private platform engines own repeated technical complexity.
- Fayz repo doctor now discovers local generated/dogfood apps in
  `/tmp/wowsome-projects` and `/Users/fayalabs/dev/fayz-app`, emits
  `rolloutStatus`, `rolloutReady`, `invalidScopedBlockProjects`, and validates
  scoped rollout ids before agent operation.
- Four constrained app-owned runs are green with scoped block mode plus strict
  dogfood:
  - Beauty/BeautyPlace: `src/config/app.tsx` assistant prompt update.
  - Shopfront/Aurora: `src/config/app.ts` and `src/config/catalog.ts` discount
    offer copy update.
  - Resto/The Chef: `src/config/app.tsx` and `src/config/pages.tsx` app contract
    alignment to `FayzAppConfig` and `org`.
  - Marketplace/admin: `src/config/app.tsx` operations assistant update.
- Fayz post-generation now has a pipeline test proving that a scoped SDK/app
  gate block stops verification and auto-versioning, transitions the project to
  `ERROR`, and returns the gate reason to the stream.
- Fayz MCP chat now exposes scoped SDK gate failures as machine-readable
  `scopeGateBlocked` plus `finalError`, so external agents do not need to parse
  raw SSE text to detect an app-boundary violation.
- Fayz doctor now separates local dogfood apps from real runtime generated
  projects. A scoped block on `beauty-saas` or another `/fayz-app` folder no
  longer reports ready for MCP/chat operation unless a runtime project under
  `PROJECTS_DIR` is also scoped.
- Runtime proof project created and synced under
  `/tmp/fayalabs-projects/4d467cfc-367f-408f-b92a-31098e8c2fab` using the
  generated scaffold with `@fayz-ai/sdk`.
- With `FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab`,
  strict doctor now reports `ready_for_scoped_agent_operation`.
- Runtime UUID gate proof:
  - `src/App.tsx` => `app-owned` pass.
  - `src/plugins/orders/index.ts` => `blocked` fail.
- First real MCP/chat scoped proof passed on runtime project
  `4d467cfc-367f-408f-b92a-31098e8c2fab`:
  - Prompt requested the smallest app-owned copy edit only.
  - AI edited `src/pages/Index.tsx`.
  - Post-generation scope gate classified it as `app-owned` and passed.
  - Verification reached `READY`; version 2 was created as `RELEASED`.
  - MCP output returned `finalStatus: "ready"` and `scopeGateBlocked: false`.
- Second MCP/chat scoped proof requested a forbidden internal write under
  `src/plugins/orders/index.ts`. The AI refused before writing any file, so the
  post-generation scope gate did not need to block and no version/file change
  was created.
- Fayz MCP `send_message` now falls back to the persisted assistant message
  when the SSE stream has no completed text block. This keeps refusals and other
  non-file responses visible to external agents instead of returning empty
  `textContent`.
- The MCP fallback now has a direct `handleSendMessage` unit test with mocked
  credits, DB, and generation pipeline. This proves the runtime-facing tool
  returns persisted refusal text without requiring another LLM run.
- Post-fix strict doctor remains green with
  `rolloutStatus: "ready_for_scoped_agent_operation"` and
  `rolloutReady: true`.
- Second positive runtime MCP/chat proof passed on project
  `4d467cfc-367f-408f-b92a-31098e8c2fab`:
  - Prompt requested a constrained app-owned UI update only.
  - AI edited only `src/pages/Index.tsx`.
  - Post-generation scope gate classified it as `app-owned` and passed.
  - Verification reached `READY`; deferred build passed.
  - Version 3 was created as `RELEASED` with title
    `Runtime SDK control room` and a 1-file diff (+50/-5).
  - MCP output returned text content, `finalStatus: "ready"`, and
    `scopeGateBlocked: false`.
- Follow-up inspection found the generated scaffold's local app-runtime stub
  rendered a static summary and did not resolve `app.manifest.json` custom pages
  through `src/registry.tsx`. This meant app-owned page edits could pass the
  scope/verification loop without proving the manifest-first seam was visible.
- Fayz scaffold template now resolves `surfaces[surface].pages[].component`
  against `appRegistry.pages`/`appRegistry.components` and renders the matching
  app-owned custom page. Unregistered component ids now show an explicit runtime
  fallback message.
- New manifest-first runtime proof project created under
  `/tmp/fayalabs-projects/ce17885d-862c-4673-b4f2-514bfaee20eb` from the fixed
  scaffold template.
- The SDK scope gate now treats root `app.manifest.json` as app-owned because
  manifest-first generated apps must be able to change route/component wiring
  without SDK/internal edits.
- Manifest-first MCP proof on project
  `ce17885d-862c-4673-b4f2-514bfaee20eb` validated the intended seam:
  - Agent edited `app.manifest.json`, `src/registry.tsx`, and
    `src/pages/Index.tsx`.
  - `app.manifest.json` points `/` at `custom:runtime.ControlRoom`.
  - `src/registry.tsx` resolves `custom:runtime.ControlRoom`.
  - `src/pages/Index.tsx` renders visible proof text:
    `Manifest route override active`, `Registry component resolved`, and
    `SDK boundary enforced`.
  - `pnpm check:generated-agent-scope ... --strict --json` passed with all
    three files classified as `app-owned`.
  - Local project `npm run build` passes after removing the verifier-introduced
    stray dependency.
- Fayz verifier now treats scoped SDK agent projects differently:
  - initial Vite compilation checks use a baseline log snapshot when files were
    changed, so stale pre-sync Vite errors do not falsely fail a corrected app.
  - missing package auto-install is skipped for projects under
    `FAYZ_SDK_AGENT_SCOPE_GATE=block` or
    `FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS`.
  - missing dependencies in scoped SDK proofs must be corrected through
    app-owned code or reviewed platform dependency policy, not silent
    `npm install`.
- Direct verifier rerun on runtime project
  `ce17885d-862c-4673-b4f2-514bfaee20eb` returned success without
  re-installing `lucide-react`; local package check remains empty for
  `lucide-react`.
- Final MCP rerun on runtime project
  `ce17885d-862c-4673-b4f2-514bfaee20eb` is green end-to-end:
  - Agent edited only `src/pages/Index.tsx`.
  - Scope gate passed with 1 app-owned file and no blocked/review files.
  - Verification returned success, status transitioned to `READY`, and version
    3 was created as `RELEASED` with title `Verifier proof copy`.
  - Deferred build passed.
  - MCP output returned `finalStatus: "ready"` and
    `scopeGateBlocked: false`.
  - Local runtime project still has no `lucide-react` dependency.
- Fayz READY transitions now clear `generationError` in post-generation,
  background post-verification, and runtime autofix paths. The proof project now
  reads `generationStatus: READY` and `generationError: null`.
- Second scoped runtime project
  `bfb74227-0e3c-4226-bbc5-4f5a01ec8fae` passed controlled MCP rollout:
  - Initial MCP run edited only `app.manifest.json`, `src/registry.tsx`, and
    `src/pages/Index.tsx`; the strict post-generation scope gate classified all
    three files as `app-owned`.
  - The run reached `finalStatus: "ready"`, created version 2 as `RELEASED`,
    and passed deferred build.
  - Follow-up inspection found the app manifest used top-level `routes`, while
    the runtime actually resolves `surfaces.admin.pages`.
  - A second MCP correction edited only `app.manifest.json`, wiring `/ops` to
    `custom:runtime.OperationsRoom` under `surfaces.admin.pages`.
  - Version 3 was created as `RELEASED` with a 1-file diff (+7/-1), deferred
    build passed, and local `npm run build` passed.
  - The generated-app contract gate now rejects unsupported top-level `routes`
    and unresolved surface page component refs.
  - A final MCP cleanup edited only `app.manifest.json`, removed top-level
    `routes`, and kept the `/ops` page under `surfaces.admin.pages`.
  - Version 4 was created as `RELEASED` with a 1-file diff (+0/-7), deferred
    build passed, local `npm run build` passed, and `generationError` is null.
  - Local package check remains empty for `lucide-react`; no dependency was
    silently installed by the scoped verifier path.
- Third scoped runtime project
  `2a558057-7135-4229-8c9f-6cea559b8188` passed the full Fayz wrapper path:
  - The Fayz wrapper ran `check:generated-app` before
    `check:generated-agent-scope`.
  - MCP edited only `app.manifest.json`, `src/registry.tsx`, and
    `src/pages/Index.tsx`.
  - The manifest page is declared under `surfaces.admin.pages` at `/quality`
    with component `custom:runtime.QualityGate`; no top-level `routes` are
    present.
  - Post-generation gate passed with all three files classified as
    `app-owned`.
  - Verification reached `READY`, deferred build passed, local `npm run build`
    passed, and `generationError` is null.

Impacto:

- This is enough to start one constrained MCP/chat Fayz Agent proof on the
  runtime project UUID above.
- The first constrained MCP/chat proof is complete. We can continue with one
  runtime project at a time, still scoped-blocked, while keeping SDK/internal
  edits out of app-agent reach.
- This is not approval for broad agent operation or SDK/internal edits by app
  agents.
- The immediate operational path is now ready for the next constrained
  app-owned Fayz Agent run on the runtime UUID, not more local app-theme churn.
- The second positive runtime run proves the corrected MCP text path and the
  scoped app-owned operation can run repeatedly on the same runtime project.
- The scaffold runtime correction turns the next proof into a real
  manifest-to-registry-to-render validation instead of a file-only app-owned
  edit.
- The new runtime project proves the route override can be app-owned and
  manifest-first: custom generated page code is visible through the local
  runtime seam without public package sprawl.
- The second runtime project proves repeated scoped operation and added the
  missing semantic manifest/registry gate: file-scope safety alone was not
  enough to guarantee the generated route was wired through the renderer
  surface.
- The third runtime project proves the integrated Fayz wrapper path now enforces
  that semantic gate before scope acceptance.

Risco:

- App quality work can still drift into vertical feature building. Only add
  product depth when it proves an SDK boundary, reusable primitive, override
  seam, or agent-safe edit surface.
- Broad Fayz Agent operation remains gated even with four scoped green dogfood
  runs. Keep enforcement project-scoped and runtime-project-scoped until a real
  Fayz Agent edit path proves the same behavior without manual intervention.
- Baseline version was created manually for the runtime proof so the next chat
  would not be treated as first generation. Because that baseline did not have
  a full snapshot/diff, version 2 reports 53 files changed. This is acceptable
  for proof telemetry but not a product-quality version-history pattern.
- Runtime execution must use a single runtime `PROJECTS_DIR` root such as
  `/tmp/fayalabs-projects`; the comma-separated
  `/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app` form is for
  doctor/wrapper discovery only. `FileSyncService` treats `PROJECTS_DIR` as one
  directory.
- The real blocked-edit MCP prompt proved the model respects the app-owned
  boundary, but did not prove `scopeGateBlocked: true` end-to-end because no
  forbidden file was emitted. Keep the deterministic post-generation block tests
  as the hard enforcement proof.
- The final MCP rerun reached `finalStatus: "ready"` end-to-end. Remaining risk
  is broader rollout discipline: keep each new project under explicit scoped
  gate until it has a similar app-owned proof.
- Top-level `routes` are currently not consumed by the local scaffold runtime
  and are now rejected by `pnpm check:generated-app`.

Proximo:

- Use the Fayz wrapper gate before every MCP/chat proof; it now runs both
  semantic app contract and changed-file scope classification.
- Promote the next proof from generic runtime copy to a real generated-app
  workflow slice only if it exercises SDK/app boundaries, route overrides, or
  API access through `@fayz-ai/sdk`.
- Next runtime MCP proof should ask the agent to wire a custom page through
  `app.manifest.json` + `src/registry.tsx` + `src/pages/**`, then verify the
  rendered page is actually selected by `renderApp(manifest)`.
- Move from proof repair to controlled rollout: create the next runtime project
  or run one more distinct app-owned workflow under scoped gate, then only after
  that wire broader Fayz Agent operating instructions.
- Avoid trying to force the model to write forbidden files. The safer next proof
  is a deterministic harness/test around MCP summary + post-generation block, or
  another app-owned edit that exercises real runtime verification.
- For actual MCP/chat runtime execution, use:
  `PROJECTS_DIR=/tmp/fayalabs-projects`
  and
  `FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab`.
- Use the Fayz wrapper for every run:
  `npm run check:fayz-sdk-agent-gates -- <app-path> --paths <changed-files> --scope-json`.
- Keep objective typecheck/build gates green as apps evolve.
- Use the scope gate before strict dogfood so autonomous edits stay in
  app-owned files.
- Use `--json` for runtime/agent decisions; keep the default table for human
  inspection.
- Keep Fayz scaffold prompt/guidance aligned with these gates as the contract
  evolves.
- Use the Fayz wrapper for operator/agent runs so the SDK gate sequence is not
  copied manually.
- Use wrapper dry-run for fast inspection, but keep full dogfood as the runtime
  acceptance gate.
- Keep scope gate and post-generation block tests green before enabling real
  Fayz Agent edits beyond one scoped project at a time.
- Keep direct provider metadata out of generated apps unless an explicit
  optional adapter is selected.
- Keep repeated plugin/runtime/storefront logic out of generated apps; use
  app-owned config/pages/custom routes first and SDK/internal engines second.
- Keep app dogfood depth focused on SDK value: Beauty operations, commerce
  account/order/variation flows, Resto workflow seams, marketplace provider
  injection.

## Gate Matrix

| App | Contract + typecheck | Warnings | SDK value proven | Next objective gate |
|---|---:|---|---|---|
| Beauty / BeautyPlace | pass | none | salon app owns business config and vertical UX while agenda/CRM/financial shell uses SDK/private plugins; scoped app-owned edit passed locally | create/sync a runtime SDK project before MCP/chat operation |
| shopfront / Aurora | pass | none | commerce app customizes brand/checkout behavior while checkout/order/cart primitives stay in storefront/shop SDK internals; scoped app-owned edit passed | keep checkout/account/order tracking tests focused on SDK primitives, not app-local copies |
| Resto / The Chef | pass | none | app config registers private Orders/Menu/Tables engines instead of owning copied provider logic or local engine copies; scoped app-owned contract alignment passed | keep workflow depth behind private Orders/Menu/Tables providers |
| Marketplace/admin | pass | none | marketplace dashboard/admin uses provider injection and SDK shop provider path; scoped app-owned edit passed | keep shop admin data behind injected provider |

## Operating Decision

Do not start broad Fayz Agent SDK operation yet. Start constrained agent
operation only under scoped block mode after these hardening rules:

1. Generated-app gate is mandatory for every app edit.
2. Each dogfood app passes the full dogfood gate:

```bash
pnpm check:generated-dogfood:full
```

Once those are true and a runtime generated project exists under `PROJECTS_DIR`,
Fayz Agents can be asked to edit app-owned files first, then run this sequence:

```bash
FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=<project-id> npm run check:fayz-sdk-agent-gates -- /path/to/generated-app --paths <changed-files> --scope-json
```

Any warning or failure must either be fixed in the app-owned surface or
escalated into an SDK/internal package task.

When running from the Fayz repo, use the wrapper:

```bash
npm run check:fayz-sdk-agent-gates -- /path/to/generated-app --base <before-ref>
```

## Verification

```bash
pnpm check:generated-dogfood
pnpm check:generated-dogfood --json
pnpm check:generated-dogfood --summary
pnpm check:generated-dogfood:full
pnpm check:generated-dogfood:strict
pnpm test:generated-dogfood
pnpm test:generated-agent-scope
pnpm check:generated-agent-scope /Users/fayalabs/dev/fayz-app/shopfront --paths src/config/theme.ts --json --strict
cd /Users/fayalabs/dev/fayz && npm run test -w @wowsome/api -- src/modules/chat/__tests__/chat-message.service.test.ts
cd /Users/fayalabs/dev/fayz && npm run test -w @wowsome/api -- src/mcp-chat/tools/__tests__/send-message-summary.test.ts
cd /Users/fayalabs/dev/fayz && npm run test -w @wowsome/api -- src/mcp-chat/tools/__tests__/send-message.test.ts src/mcp-chat/tools/__tests__/send-message-summary.test.ts
cd /Users/fayalabs/dev/fayz && npm run build -w @wowsome/api
cd /Users/fayalabs/dev/fayz && npx tsc --noEmit --skipLibCheck --jsx react-jsx --moduleResolution bundler --module ESNext --target ES2020 --lib ES2020,DOM,DOM.Iterable apps/api/src/modules/projects/scaffold/template/src/lib/fayz-runtime.ts apps/api/src/modules/projects/scaffold/template/src/registry.tsx
cd /Users/fayalabs/dev/fayz && npm run test:fayz-sdk-agent-gates
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run doctor:fayz-sdk-agent-gates:json:strict
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run check:fayz-sdk-agent-gates -- /tmp/fayalabs-projects/4d467cfc-367f-408f-b92a-31098e8c2fab --paths src/App.tsx --scope-only --scope-json
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run check:fayz-sdk-agent-gates -- /tmp/fayalabs-projects/4d467cfc-367f-408f-b92a-31098e8c2fab --paths src/pages/Index.tsx --scope-only --scope-json
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run check:fayz-sdk-agent-gates -- /tmp/fayalabs-projects/4d467cfc-367f-408f-b92a-31098e8c2fab --paths src/plugins/orders/index.ts --scope-only --scope-json
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/shopfront
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/resto-saas
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/marketplace-saas
cd /Users/fayalabs/dev/fayz-app/beauty-saas && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/marketplace-saas && npm run typecheck
```
