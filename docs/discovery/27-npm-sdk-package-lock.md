# 27 - npm SDK Package Lock

Last updated: 2026-06-14 10:45 BRT

## Executive Summary

Decision: **publish only `@fayz-ai/sdk` as the stable public npm contract for now**.

This keeps generated projects unblocked while avoiding premature public architecture. Runtime, shell, UI, app-domain packages, and plugins stay internal/local/bundled until Beauty and 1-2 more real apps prove which seams deserve public package boundaries.

## Package Contract

- `@fayz-ai/sdk`: default package for every generated project.
  - Owns app params, normalized Fayz API access, shared types, and Runtime OAuth broker helpers.
  - Must stay browser-safe and focused: no React peer dependency, no UI bundle, no provider secrets.
- `@fayz-ai/app-runtime`: app-rendering package.
  - Owns `renderApp(manifest)`, styles, scaffolds, registry helpers, and plugin runtime wiring.
  - Not a public npm contract yet. Use it as internal/local/bundled implementation until dogfood proves the boundary.
- `@fayz-ai/core`, `@fayz-ai/auth`, `@fayz-ai/ui`, `@fayz-ai/saas`, plugins:
  - Remain modular code boundaries inside the SDK repo.
  - Do not present these as independent public concepts yet.
  - New generated apps should not default to `createSaasApp`.

## Generated Project Rule

Every generated project may install public npm `@fayz-ai/sdk`.

Manifest-rendered projects should use the platform-provided/bundled app runtime and render:

```ts
import { renderApp } from './fayz-runtime'
import manifest from '../app.manifest.json'

renderApp(manifest)
```

OAuth/provider calls go through:

```ts
import { createFayzRuntimeClient } from '@fayz-ai/sdk'
```

Generated projects must not ship local forks of runtime OAuth helpers.

Generated-project `package.json` should stay thin. Default runtime app dependencies are:

- `@fayz-ai/sdk`
- `react`
- `react-dom`

UI, form, chart, date, animation, app shell, and plugin dependencies should be owned by the generated template/platform bundle, or added explicitly only when app-owned custom code imports them directly.

## Dogfood Rule

Beauty validates two modes:

- normal app development: imports `@fayz-ai/*` names but resolves shell/plugins to `/Users/fayalabs/dev/fayz-sdk` locally;
- public package proof: installs only `@fayz-ai/sdk` from npm, with runtime/plugin implementation supplied by the platform template/bundle.

Do not publish a separate package just because local code is modular. Publish only when there is a stable external consumer, documented problem, and clean install gate.

## Publication Checklist

Before publishing:

1. Confirm no package `publishConfig.registry` points to GitHub Packages.
2. Confirm Changesets access is `public`.
3. Confirm root SDK `.npmrc` does not require `${NODE_AUTH_TOKEN}`.
4. Run:

```bash
pnpm --filter @fayz-ai/sdk typecheck
pnpm --filter @fayz-ai/sdk test
pnpm --filter @fayz-ai/sdk build
pnpm check:manifest
```

## Current Risk

The package-source blocker is resolved for `@fayz-ai/sdk`. Remaining risk is execution hygiene:

- keep `@fayz-ai/sdk` focused on API access, app params, runtime broker helpers, and shared types;
- avoid leaking React/UI/Supabase into `@fayz-ai/sdk`;
- keep provider tokens and refresh material server-side in Fayz;
- migrate Beauty as a proof, not by deleting `createSaasApp` prematurely;
- avoid publishing internal package topology as public architecture before dogfood validates it.
