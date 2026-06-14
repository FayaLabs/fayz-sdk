# 27 - npm SDK Package Lock

Last updated: 2026-06-14 08:47 BRT

## Executive Summary

Decision: Fayz SDK packages publish to **public npm** under `@fayz/*`.

This unblocks generated projects from using SDK packages directly and removes the old GitHub Packages / `NODE_AUTH_TOKEN` blocker.

## Package Contract

- `@fayz/sdk`: lean default package for every generated project.
  - Owns app params, normalized Fayz API access, shared types, and Runtime OAuth broker helpers.
  - Must stay browser-safe and lightweight: no React peer dependency, no UI bundle, no provider secrets.
- `@fayz/runtime`: app-rendering package.
  - Owns `renderApp(manifest)`, styles, scaffolds, registry helpers, and plugin runtime wiring.
  - Used by manifest UI apps, not required for every simple API-only project.
- `@fayz/core`, `@fayz/auth`, `@fayz/ui`, `@fayz/saas`, plugins:
  - Remain modular packages for SDK internals and power users.
  - New generated apps should not default to `createSaasApp`.

## Generated Project Rule

Every generated project may install public npm `@fayz/sdk`.

Manifest-rendered projects also install `@fayz/runtime` and render:

```ts
import { renderApp } from '@fayz/runtime'
import manifest from '../app.manifest.json'

renderApp(manifest)
```

OAuth/provider calls go through:

```ts
import { createFayzRuntimeClient } from '@fayz/sdk'
```

Generated projects must not ship local forks of runtime OAuth helpers.

## Publication Checklist

Before publishing:

1. Confirm no package `publishConfig.registry` points to GitHub Packages.
2. Confirm Changesets access is `public`.
3. Confirm root SDK `.npmrc` does not require `${NODE_AUTH_TOKEN}`.
4. Run:

```bash
pnpm --filter @fayz/sdk typecheck
pnpm --filter @fayz/sdk test
pnpm --filter @fayz/sdk build
pnpm --filter @fayz/runtime typecheck
pnpm --filter @fayz/runtime build
pnpm check:manifest
```

## Current Risk

The package-source blocker is resolved by product decision. Remaining risk is execution hygiene:

- keep `@fayz/sdk` lean;
- avoid leaking React/UI/Supabase into `@fayz/sdk`;
- keep provider tokens and refresh material server-side in Fayz;
- migrate Beauty as a proof, not by deleting `createSaasApp` prematurely.
