# Research — Fayz API / Editor Panel Integration

Source: Codex lane `proc_e127b476a8aa`, run from `/Users/fayalabs/dev/fayz`.

Status: completed research. Codex could not write this file directly because its sandbox was rooted at `/Users/fayalabs/dev/fayz`; Hermes captured the findings here.

## Current architecture facts

- No existing Fayz Prisma model stores SDK `AppManifest` bindings.
- The current Panel surface is represented by `DashboardPanel` under the editor `dashboard` tab.
- Cloud/Analytics currently live as dashboard sections, not separate top-level tabs.
- There is no first-party tenant/customer model today that directly maps to the per-customer rendering requirement.
- Current Fayz API patterns are project-scoped, so manifest resolution should follow that shape.

## Files/path areas inspected

Codex reported inspection of:

- Fayz API project modules under `/Users/fayalabs/dev/fayz/apps/api/src/modules/projects/**`
- Prisma schema/migrations
- Fayz web editor/Panel paths under `/Users/fayalabs/dev/fayz/apps/web/src/**`
- existing project/settings/cloud features route patterns
- current project-scoped API patterns

## Recommended DB model

Recommended model name remains:

```txt
ProjectAppManifest
```

Reason: the binding is not Panel-specific. It can later serve panel/admin/storefront/portal/mobile/headless surfaces.

Suggested fields:

- `id`
- `projectId`
- `manifestJson`
- `tenantKey`
- `environment`
- `surface`
- `status`
- `versionNumber`
- timestamps

Suggested relation:

- `ProjectAppManifest` belongs to `Project`.

## Recommended API shape

Smallest active-manifest resolver:

```http
GET /api/projects/:projectId/app-manifests/active?surface=panel&environment=preview&tenantKey=default
```

Recommended behavior:

- resolve by `projectId + surface + environment + tenantKey`;
- return the active SDK `AppManifest` or the selected `SurfaceManifest` envelope;
- do not render or mutate from this endpoint;
- keep host-owned Panel sections outside the app manifest.

## Panel rendering integration

Recommended placement:

- Add manifest rendering as a new `DashboardPanel` section.
- Do not replace Cloud Features or other host-owned Fayz dashboard sections.

Important invariant:

> Host-owned features remain always visible. Tenant/project manifest content is additive/composable, not allowed to erase Fayz operational controls.

## Tenant/customer identity

There is no first-party tenant/customer model today.

Smallest safe v1 bridge:

```txt
tenantKey
```

Default:

```txt
default
```

Future migration path:

- map `tenantKey` to customer/org/franchise/account model when the domain is clearer.

## Smallest implementation slice

1. Add `ProjectAppManifest` to Prisma.
2. Add active-manifest resolver endpoint.
3. Seed or create one manifest binding for a test project.
4. Add a DashboardPanel manifest section that fetches the active manifest.
5. Render a minimal surface from it.
6. Verify Cloud/host-owned sections remain present.

## Risks / contradictions

- If we create `ProjectPanelManifest`, we bake the current UI tab into the data model and hurt future surfaces.
- If manifest rendering replaces the dashboard instead of adding a section, Fayz loses host-owned controls like Cloud Features.
- `tenantKey` is intentionally a bridge, not a final customer data model.
- Endpoint must not silently run migrations or mutate DB.

## Tests / build commands needed

Likely needed in `/Users/fayalabs/dev/fayz` after implementation:

```bash
npm run build
npm test
npx prisma generate
```

If UI changed, browser-test the editor dashboard/panel at the existing dev server.

## Open questions for Hermes/Vini

No immediate blocker for research.

Architecture-lock questions:

1. Can we lock `ProjectAppManifest` as the model name?
2. Is `tenantKey = default` acceptable as v1 until a real tenant/customer model exists?
3. Should the first Panel proof render inside current `DashboardPanel` instead of creating a new top-level tab? Recommended answer: yes.
