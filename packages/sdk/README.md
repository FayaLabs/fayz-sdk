# @fayz-ai/sdk

> The typed client and contract layer every Fayz app talks to.

[![npm](https://img.shields.io/npm/v/@fayz-ai/sdk.svg)](https://www.npmjs.com/package/@fayz-ai/sdk)
[![license](https://img.shields.io/npm/l/@fayz-ai/sdk.svg)](https://github.com/FayaLabs/fayz-sdk/blob/main/LICENSE)

Fayz builds real, multi-tenant SaaS apps by composing plugins. `@fayz-ai/sdk` is the seam between a generated Fayz project and the platform behind it: a typed API client, the shared manifest/user/params types, a runtime broker for OAuth-backed integrations, and the release-channel resolver that keeps every package on a coherent version set.

This is the lowest-trust, zero-React layer — no UI, no framework, just the contract. Generated apps call Fayz through the SDK instead of importing provider clients directly, so OAuth secrets and tenant authority stay server-side where they belong. If you're reading Fayz tables, exchanging plugin OAuth grants, or pinning a package channel, you start here.

## What's inside
- `createFayzClient` / `fayz` — typed client with `auth.me()` and `data` row access (`listRows`, `countRows`, `createRow`, `updateRow`, `deleteRows`) plus `FayzApiError`
- `createFayzRuntimeClient` / `FayzRuntimeError` — runtime OAuth broker for plugin grant exchange and Google Calendar access
- `createFayzShopProvider` / `FayzShopError` — commerce read provider (products, orders, customers, discounts) with status types
- `appParams` / `resolveAppParams` — read the app params Fayz injects into a generated project
- `fayzPackageVersionSets` + `resolveFayzPackage*` — release-channel resolution across the SDK
- Shared types: `AppManifest`, `PageManifest`, `SurfaceManifest`, `PluginRef`, `FayzUser`, `FayzAuthMeResponse`

## Install
```bash
npm install @fayz-ai/sdk
```
No peer dependencies — framework-agnostic.

## Usage
```ts
import { fayz } from '@fayz-ai/sdk'

const me = await fayz.auth.me()

const { rows, total } = await fayz.data.listRows({
  table: 'v_bookings',
  filters: [{ column: 'status', operator: 'neq', value: 'cancelled' }],
})
```

## Part of the Fayz SDK
The foundation client beneath `@fayz-ai/core`, `@fayz-ai/saas`, and every Fayz plugin.

## Roadmap & contributing
Built and evolving in the open. See the [Fayz SDK roadmap](../../docs/ROADMAP.md#sdk) for current gaps, missing features, and good first issues.
