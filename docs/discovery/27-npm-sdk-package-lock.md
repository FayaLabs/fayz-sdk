# 27 - npm SDK Package Lock

Last updated: 2026-06-14 08:47 BRT

## Executive Summary

Decision: Fayz SDK packages publish to **public npm** under `@fayz-ai/*`.

This unblocks generated projects from using SDK packages directly and removes the old GitHub Packages / `NODE_AUTH_TOKEN` blocker.

## Package Contract

- `@fayz-ai/sdk`: default package for every generated project.
  - Owns app params, normalized Fayz API access, shared types, and Runtime OAuth broker helpers.
  - Must stay browser-safe and focused: no React peer dependency, no UI bundle, no provider secrets.
- `@fayz-ai/app-runtime`: app-rendering package.
  - Owns `renderApp(manifest)`, styles, scaffolds, registry helpers, and plugin runtime wiring.
  - Used by manifest UI apps, not required for every simple API-only project.
- `@fayz-ai/core`, `@fayz-ai/auth`, `@fayz-ai/ui`, `@fayz-ai/saas`, plugins:
  - Remain modular packages for SDK internals and power users.
  - New generated apps should not default to `createSaasApp`.

## Generated Project Rule

Every generated project may install public npm `@fayz-ai/sdk`.

Manifest-rendered projects also install `@fayz-ai/app-runtime` and render:

```ts
import { renderApp } from '@fayz-ai/app-runtime'
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
- `@fayz-ai/app-runtime`
- `react`
- `react-dom`

UI, form, chart, date, animation, and Radix dependencies should be owned by runtime/UI packages, or added explicitly only when app-owned custom code imports them directly.

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
pnpm --filter @fayz-ai/app-runtime typecheck
pnpm --filter @fayz-ai/app-runtime build
pnpm check:manifest
```

## Current Risk

The package-source blocker is resolved by product decision. Remaining risk is execution hygiene:

- keep `@fayz-ai/sdk` focused on API access, app params, runtime broker helpers, and shared types;
- avoid leaking React/UI/Supabase into `@fayz-ai/sdk`;
- keep provider tokens and refresh material server-side in Fayz;
- migrate Beauty as a proof, not by deleting `createSaasApp` prematurely.
