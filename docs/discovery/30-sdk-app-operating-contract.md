# 30 - SDK/App Operating Contract

Snapshot: 2026-06-15 09:54 UTC / 06:54 BRT

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

## Lean Generated App Rule

- Generated apps should be almost transparent product repos. They should not
  depend on app-local agent instruction files such as `AGENTS.md` for normal
  operation.
- Agent knowledge belongs in Fayz/SDK internal documentation, package metadata,
  capability registries, gates, and method-level contracts that an agent can
  query on demand.
- New generated apps should carry only executable product/app contract files by
  default: manifest, registry, generated plugin wiring, runtime entrypoints,
  config, pages, custom components, data, and package metadata.
- App-local prose files are legacy/reference artifacts only. Do not use them as
  the source of truth for imports, params, provider rules, or gate policy.
- The agent should discover how to import and call SDK capabilities from
  `@fayz-ai/sdk` docs/capability metadata when it needs a specific method,
  rather than carrying a copied instruction manual inside every generated app.

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

- `app.manifest.json` must stay on `manifestVersion: 2` unless an approved
  SDK/API manifest migration exists; generated-app gates fail missing or
  unsupported manifest versions.
- New custom routes live under `surfaces.<surface>.pages` in
  `app.manifest.json`.
- New route entries use `pages[].route`. `pages[].path` is compatibility only;
  strict generated-app gates warn/fail path-only custom component routes.
- Route components use `custom:*` ids and are registered in `src/registry.tsx`.
- The generated app owns the custom screen. The scaffold/runtime owns hash/path
  matching and component resolution.
- `src/pages/Index.tsx` must render real app content or delegate to the
  manifest runtime; stale scaffold placeholder text is a contract failure.
- Standard workflows such as checkout should use SDK/storefront/shop primitives.
  Override the screen or step composition; do not copy order/cart/payment
  business logic into the app.

## API And Data Access

- Default app data access should go through `@fayz-ai/sdk` and Fayz broker/API
  primitives.
- Direct provider clients are allowed only through an explicit optional adapter
  decision, and that adapter must not contain secrets.
- OAuth/provider token exchange stays server-side in Fayz.
- Optional backend URLs must not serialize empty environment strings into the
  manifest. Use `url: value || undefined`, so mock/no-provider generated apps
  still render and SDK `validateManifest()` never receives `backend.url: ""`.

## Commerce Config Pattern

- Product-specific commerce attributes belong in app-owned catalog/config data,
  usually under `Product.metadata`, when they describe the generated app's
  business domain: sneaker sizes/colorways, wine vintage/region/pairing, variant
  labels, delivery copy, merchandising tags, or similar.
- The SDK/private shop engine owns product/order/cart/checkout primitives and
  preserves metadata; app-owned custom cards, pages, or route overrides decide
  how to present those attributes.
- If a store uses a provider backend while app-owned catalog metadata still
  carries product variants/custom attributes, pass a typed `productMetadata`
  overlay into `createFayzShopProvider`. The overlay lets generated apps keep
  product personality in app-owned files while the provider remains the source
  for product identity, price, stock, order, and customer data.
- Backend product metadata wins over overlay metadata when both define the same
  key. Treat the overlay as a dogfood/generation bridge until Fayz admin/broker
  persists those attributes server-side.
- If no provider is configured, the app-owned mock catalog must stay valid and
  render through SDK mock primitives.
- Local SDK dogfood tooling may require Vite/package aliases for private
  subpaths, but those files are review-scope. Generated app agents should treat
  tooling/dependency changes as explicit-review work, not routine app-owned UI
  edits.

## Gate Sequence

Before a generated-app edit:

```bash
pnpm check:generated-app /path/to/generated-app
```

After a generated-app edit:

```bash
pnpm check:generated-agent-readiness /path/to/generated-app --paths <changed-files>
```

Equivalent low-level gates:

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

Runtime proof:

```bash
cd /Users/fayalabs/dev/fayz
npm run check:fayz-sdk-agent-gates -- /tmp/fayalabs-projects/2eedffdc-fc14-4685-8617-a0b45118d910 --paths app.manifest.json,src/registry.tsx --scope-only --scope-json
```

Result: `check:generated-agent-readiness` passed contract and strict scope
gates; both changed files were app-owned, with zero review or blocked files.

## Graduation Rule

Promote code from app-owned surface into SDK/private internals only when at
least two dogfood apps need the same non-business primitive or one app exposes a
clear platform trust/security boundary.

Do not create a new public package, public API, or generator-wide abstraction
until a real generated app proves the seam.
