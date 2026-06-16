# 11 — Fayz Core Structure Notes

## What “Fayz Core” should mean

There is no separate `fayz-core` repo in the current workspace. The core platform currently lives inside:

- repo: `/Users/fayalabs/dev/fayz-sdk`
- package: `packages/core`
- npm name: `@fayz/core`

I recommend we use **Fayz Core** to mean the small, stable, open contract layer — not the whole SDK monorepo.

## Current package map

### Foundation packages

- `@fayz/core`
  - contracts and primitives;
  - manifest model;
  - registry;
  - data providers;
  - plugin types/runtime helpers;
  - event bus;
  - entity/CRUD type definitions.

- `@fayz/ui`
  - design primitives and shared UI;
  - should depend on core/auth, not on vertical plugins.

- `@fayz/auth`
  - auth adapters/context.

### Runtime/surface packages

- `@fayz/runtime`
  - manifest-to-running-app glue;
  - depends on core, auth, saas, shop, storefront, ui.

- `@fayz/saas`
  - admin/SaaS shell;
  - CRUD pages;
  - org/settings/permissions shell.

- `@fayz/storefront`
  - commerce storefront shell.

- `@fayz/shop`
  - commerce domain primitives.

- `@fayz/portal`
  - portal surface.

- `@fayz/courses`
  - domain package for course/product-like use cases.

### Plugin packages

Examples:

- `@fayz/plugin-agenda`
- `@fayz/plugin-financial`
- `@fayz/plugin-inventory`
- `@fayz/plugin-crm`
- `@fayz/plugin-dashboard`
- `@fayz/plugin-shop`
- `@fayz/plugin-tables`
- `@fayz/plugin-menu`

Plugins should depend on core + UI + whichever surface/domain package they need. They should not own platform contracts.

## Recommended boundaries

```txt
@fayz/core
  Owns: types, manifests, registries, provider interfaces, validation, event primitives.
  Must not own: React-heavy app shells, customer-specific config, Fayz API internals.

@fayz/ui
  Owns: tokens/components/visual primitives.
  Must not own: business domain logic.

@fayz/saas, @fayz/storefront, @fayz/portal
  Own: surface shells and rendering conventions.
  Must not own: canonical manifest shape.

@fayz/runtime
  Owns: choosing a surface/scaffold and connecting manifest + registries + providers.
  Must not own: plugin business logic or Fayz backend persistence.

@fayz/plugin-*
  Own: business capability modules.
  Must not own: tenant manifest storage or provider internals.

Fayz repo / API
  Owns: project import, tenant binding, manifest storage, migration execution, editor APIs.
  Must not redefine SDK contracts.
```

## The key architectural risk

The risk is **contract drift**:

- Fayz editor invents one manifest shape.
- Generated projects use another config shape.
- Plugins declare another manifest shape.
- AI prompts learn another vocabulary.

That would kill the category thesis.

So the central invariant should be:

> `@fayz/core` owns the canonical contract. Fayz editor, generated projects, plugins, and agents consume or produce that same contract.

## The minimum structure I recommend locking now

Inside `@fayz/core`:

```txt
src/
  manifest/
    index.ts              # AppManifest, SurfaceManifest, PageManifest, validation, version migration
    app-manifest.schema.json

  data/
    types.ts              # DataProvider, query/result types
    resolve.ts            # provider resolver
    supabase.ts
    mock.ts
    fayz-api.ts           # proposed

  providers/              # optional later if data/ grows too much
    actions.ts            # proposed ActionProvider
    migrations.ts         # proposed MigrationProvider
    realtime.ts           # later

  types/
    crud.ts
    plugins.ts
    permissions.ts
    entities.ts

  registry/
    index.ts              # component/block/page/plugin/metric registries

  plugin/
    runtime.ts            # definePlugin, resolvePluginRuntime

  events/
    index.tsx             # event bus
```

Do **not** split `@fayz/core` into many packages yet. The current repo already has enough packages. Split only when a boundary hurts.

## What should change for this mission

### 1. Extend `BackendRef`

Current:

```ts
provider: 'supabase' | 'mock'
```

Needed:

```ts
provider: 'supabase' | 'fayz-api' | 'mock' | 'custom'
```

But keep provider-specific options contained. Do not leak Fayz backend internals into open manifest fields.

### 2. Add Fayz API provider

A provider that calls Fayz API rather than Supabase directly.

This is needed because generated/customer apps and Fayz Panel can use the same SDK contract while Fayz controls data access, auth, audit, and migrations.

### 3. Strengthen manifest validation

Current validation is basic. Add reference checks:

- duplicate pages/plugins;
- pages must choose exactly one renderer;
- plugin IDs must be unique per surface;
- backend provider must be supported;
- permissions referenced by pages/actions should exist where possible.

### 4. Keep Panel-specific host features outside manifest

Cloud Features, DB, logs, deploy, billing, environment controls should remain Fayz host features.

The manifest should describe the customer app surface, not Fayz’s operational shell.

### 5. Add manifest storage in Fayz repo, not SDK repo

The table/model belongs in Fayz API because it is platform state:

Recommended name: `ProjectAppManifest`.

Likely fields:

```txt
id
projectId
tenantId/customerId nullable? but probably required for tenant-specific rendering
environment
surface
manifestVersion
manifestJson
status draft/active/archived
createdBy
createdAt
updatedAt
activatedAt
```

Later:

```txt
parentVersionId
changeReason
audit metadata
approval status
rollback pointer
```

## Architecture principle

Start with one boring but strong vertical slice:

```txt
AppManifest in SDK
  -> stored/versioned in Fayz API
  -> resolved by project + tenant + environment
  -> rendered in Fayz Panel
  -> data resolved through Fayz API provider or Supabase provider
  -> proven with Beauty SaaS agenda
```

If this works, the category thesis is real.
