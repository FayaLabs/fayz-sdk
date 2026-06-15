# 30 - SDK/App Operating Contract

Snapshot: 2026-06-15 09:11 UTC / 06:11 BRT

## Executive Contract

Resultado:

- Generated apps are product repositories. They may own business configuration,
  copy, brand, data labels, app-specific pages, custom route screens, and small
  workflow glue.
- SDK/platform owns repeated technical mechanics: routing runtime, auth/session
  authority, tenant context, broker/API clients, CRUD providers, checkout/order
  primitives, plugin runtimes, OAuth/provider token exchange, toasts, and shared
  contracts.
- The only public default npm package is `@fayz-ai/sdk`. Runtime, shell, UI,
  storefront, shop, saas, portal, and plugin packages remain private/internal
  until real dogfood proves a public boundary.

Impacto:

- App agents can customize real products without copying platform engines.
- SDK work is justified by repeated need across dogfood apps, not by speculative
  package surface.
- Product dogfood stays useful while the generator remains thin.

Risco:

- If app agents edit internal runtime/plugin/provider files, the PoC drifts into
  vertical app implementation and loses the reusable-engine proof.
- If SDK absorbs one-off brand/product decisions too early, the SDK becomes a
  template library instead of a capability engine.

Proximo:

- Use the rules below before every generated-app edit or Fayz Agent operation.

## Edit Boundary

App-owned by default:

- `app.manifest.json`
- `src/registry.tsx`
- `src/config/**`
- `src/custom/**`
- `src/pages/**`
- `src/components/**`
- `src/data/**`
- `src/i18n/**`
- `src/types/**`

Review-required:

- `src/App.tsx`
- `src/main.tsx`
- `src/lib/**`
- dependency changes
- provider adapter files
- generated runtime/template files

Blocked by default:

- `src/plugins/**`
- `src/runtime/**`
- `src/app-runtime/**`
- copied SDK/plugin/storefront/shop engines
- runtime direct provider clients such as Supabase clients in default generated
  app code
- provider secrets, refresh tokens, service roles, OAuth client secrets, or raw
  Fayz tenant authority in browser code

## Route And Screen Overrides

- New custom routes live under `surfaces.<surface>.pages` in
  `app.manifest.json`.
- New route entries use `pages[].route`. `pages[].path` is compatibility only.
- Route components use `custom:*` ids and are registered in `src/registry.tsx`.
- The generated app owns the custom screen. The scaffold/runtime owns hash/path
  matching and component resolution.
- Standard workflows such as checkout should use SDK/storefront/shop primitives.
  Override the screen or step composition; do not copy order/cart/payment
  business logic into the app.

## API And Data Access

- Default app data access should go through `@fayz-ai/sdk` and Fayz broker/API
  primitives.
- Direct provider clients are allowed only through an explicit optional adapter
  decision, and that adapter must not contain secrets.
- OAuth/provider token exchange stays server-side in Fayz.

## Gate Sequence

Before a generated-app edit:

```bash
pnpm check:generated-app /path/to/generated-app
```

After a generated-app edit:

```bash
pnpm check:generated-agent-scope /path/to/generated-app --paths <changed-files> --strict --json
pnpm check:generated-app /path/to/generated-app --strict
```

For the four current dogfood apps:

```bash
pnpm check:generated-dogfood --summary --strict
pnpm check:public-surface
```

For Fayz MCP/runtime projects:

1. Scope the runtime project id explicitly.
2. Call `get_fayz_sdk_agent_rollout_status`.
3. Require `requestedProjectReady === true`.
4. Call `send_message` only with constrained app-owned intent.
5. Treat `scopeGateBlocked`, `finalError`, non-ready status, review files, or
   blocked files as a stop condition.

## Graduation Rule

Promote code from app-owned surface into SDK/private internals only when at
least two dogfood apps need the same non-business primitive or one app exposes a
clear platform trust/security boundary.

Do not create a new public package, public API, or generator-wide abstraction
until a real generated app proves the seam.
