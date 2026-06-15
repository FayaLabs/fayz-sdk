# 29 — Generated App Dogfood Status

Snapshot: 2026-06-15 05:45 UTC / 02:45 BRT

## Executive Status

Resultado:

- Four dogfood apps pass the generated-app contract and typecheck gate:
  Beauty/BeautyPlace, shopfront, Resto/The Chef, and marketplace/admin.
- The full gate currently reports zero warnings across the four apps.
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

Impacto:

- This is enough to start one constrained MCP/chat Fayz Agent proof on the
  runtime project UUID above.
- This is not approval for broad agent operation or SDK/internal edits by app
  agents.

Risco:

- App quality work can still drift into vertical feature building. Only add
  product depth when it proves an SDK boundary, reusable primitive, override
  seam, or agent-safe edit surface.
- Broad Fayz Agent operation remains gated even with four scoped green dogfood
  runs. Keep enforcement project-scoped and runtime-project-scoped until a real
  Fayz Agent edit path proves the same behavior without manual intervention.

Proximo:

- Start the next Fayz Agent proof through MCP/chat on runtime project
  `4d467cfc-367f-408f-b92a-31098e8c2fab`, with:
  `PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app`
  and
  `FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab`.
- Prefer the MCP chat path for the first real agent run so the same
  `processAgentMessage` and post-generation gate path is exercised end to end.
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
cd /Users/fayalabs/dev/fayz && npm run build -w @wowsome/api
cd /Users/fayalabs/dev/fayz && npm run test:fayz-sdk-agent-gates
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run doctor:fayz-sdk-agent-gates:json:strict
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run check:fayz-sdk-agent-gates -- /tmp/fayalabs-projects/4d467cfc-367f-408f-b92a-31098e8c2fab --paths src/App.tsx --scope-only --scope-json
cd /Users/fayalabs/dev/fayz && PROJECTS_DIR=/tmp/fayalabs-projects,/Users/fayalabs/dev/fayz-app FAYZ_SDK_AGENT_SCOPE_GATE_BLOCK_PROJECTS=4d467cfc-367f-408f-b92a-31098e8c2fab npm run check:fayz-sdk-agent-gates -- /tmp/fayalabs-projects/4d467cfc-367f-408f-b92a-31098e8c2fab --paths src/plugins/orders/index.ts --scope-only --scope-json
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/beauty-saas
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/shopfront
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/resto-saas
pnpm check:generated-app /Users/fayalabs/dev/fayz-app/marketplace-saas
cd /Users/fayalabs/dev/fayz-app/beauty-saas && npm run typecheck
cd /Users/fayalabs/dev/fayz-app/marketplace-saas && npm run typecheck
```
