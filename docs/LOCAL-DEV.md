# Local development — SDK source vs published packages

**Status: canonical · Updated 2026-07-14.** How a Fayz app resolves `@fayz-ai/*` at
dev/build time, and when to force one mode over the other. The mechanism lives in
[`fayzVite`](../packages/sdk/src/vite.ts); this doc is the operator's guide to it.

## The two modes

Every Fayz app builds with `fayzVite()` from `@fayz-ai/sdk/vite`. It resolves
`@fayz-ai/*` (and `@fayz-ai/plugin-*`) in one of two ways, decided **once, at config
load**:

| Mode | `@fayz-ai/*` resolves to | When it's chosen |
|---|---|---|
| **local-source** | the monorepo checkout at `../../fayz-sdk/packages/<pkg>/src` (and `plugins/plugin-<x>/src`) | a sibling `fayz-sdk` checkout is present **and** `FAYZ_SDK_SOURCE` is not `published` |
| **published** | the app's `node_modules` (the npm tarballs / the Fayz editor sandbox) | no sibling checkout, **or** `FAYZ_SDK_SOURCE=published` |

The exact rule (`packages/sdk/src/vite.ts`):

```
wantLocal    = process.env.FAYZ_SDK_SOURCE !== 'published'
localPresent = exists(../../fayz-sdk/packages/core/src/index.ts)
useLocal     = wantLocal && localPresent
```

- `sdkDir` defaults to `../../fayz-sdk` relative to the app root and can be overridden
  in `fayzVite({ sdkDir })`.
- **Local-source** additionally sets Vite `resolve.conditions` to prefer each package's
  `source` export and `optimizeDeps.exclude`s the aliased packages, so edits to SDK
  `src/` are picked up live with no rebuild of the SDK.
- **Published** does none of that — imports flow through the packages' built `dist/`
  exactly as an external consumer sees them.

## Why external developers never configure anything

The default is safe by construction. An external developer clones only their app —
there is **no sibling `fayz-sdk` checkout**, so `localPresent` is false and the app
resolves from `node_modules` (published mode) automatically. There is nothing to set,
no env var to remember; `FAYZ_SDK_SOURCE` only matters inside the monorepo.

## The `dev:published-sdk` / `build:published-sdk` scripts

Dogfood apps that *do* sit next to a `fayz-sdk` checkout default to local-source (so a
change to a plugin is visible immediately). Those apps also ship `dev:published-sdk`
and `build:published-sdk` scripts, which are just the normal `dev` / `build` with
`FAYZ_SDK_SOURCE=published` prepended. They force the published path **even though the
monorepo is present**.

Use them to reproduce what an external developer or the Fayz editor sandbox actually
runs:

| You want to… | Use |
|---|---|
| iterate on app + SDK together, live | `dev` / `build` (default local-source) |
| verify the app against the **published surface** (only what's exported from `dist/`) before a release | `dev:published-sdk` / `build:published-sdk` |
| catch "works locally, breaks on npm" — missing exports, files not shipped in the tarball, dist/source drift | `build:published-sdk` |

Rule of thumb: **develop in local-source, sign off in published.** A green
`build:published-sdk` is the honest signal that a fresh `npm install` of the app will
work.

## Troubleshooting

- **"My SDK edit isn't showing up."** You're in published mode. Either a sibling
  `fayz-sdk` checkout is missing/at the wrong path (`sdkDir`), or `FAYZ_SDK_SOURCE` is
  pinned to `published` in your shell/env. Unset it and confirm
  `../../fayz-sdk/packages/core/src/index.ts` exists.
- **"It works in `dev` but `build:published-sdk` / a real install breaks."** That is
  the point of the published mode: local-source resolves raw `src/`, so it can import
  things that were never added to a package's `exports` or its published `files`. Fix
  the package (add the export / ship the file / rebuild `dist/`), don't work around it
  in the app.
- **Stale `dist` in published mode.** Published mode reads each package's built output.
  After changing SDK source, run the package build (`pnpm build` or a filtered build)
  before trusting a `*:published-sdk` run — otherwise you're testing against old
  `dist/`.
- **Only some imports go local.** Only the packages fayzVite knows about are aliased
  (see `SDK_PACKAGES` / `SDK_PLUGINS` in `vite.ts`). A brand-new package must be added
  to those lists to resolve from source.

## See also

- [`packages/sdk/src/vite.ts`](../packages/sdk/src/vite.ts) — the resolver.
- [`customization-ladder.md`](./customization-ladder.md) — how an app customizes
  without forking SDK code.
- [`architecture-boundaries.md`](./architecture-boundaries.md) — the ownership contract
  that makes upgrade-safe local development possible.
