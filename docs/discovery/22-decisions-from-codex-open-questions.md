# 22 — Decisions From Codex Open Questions

Status: **working defaults** — use these unless implementation proves them wrong.

These answer Codex research questions without blocking Vini for low-value approvals.

## SDK / provider decisions

### Provider id

Use `fayz-api` for now.

Reason: explicit enough to distinguish hosted Fayz API transport from the broader Fayz platform/brand. We can alias to `fayz` later if public DX wants it, but internal lock should stay precise.

### SDK CRUD route contract

Use manifest/entity-key semantics publicly; table name is private/provider hint.

Working route shape:

```txt
/api/projects/:projectId/data/:entityKey
```

The Fayz API may map `entityKey` to table/model through manifest metadata or internal allowlists. The SDK should not require generated apps to know raw Fayz DB table names.

### `AppManifest.backend` fields for `fayz-api`

For host-rendered Fayz Panel, Fayz injects runtime connection context.

For generated apps, manifest may include:

```json
{
  "provider": "fayz-api",
  "projectRef": "project-id-or-public-ref",
  "url": "https://api.fayz.ai"
}
```

No secrets in manifest.

### Tenant key

Use `tenantKey` at the Fayz API storage/resolver boundary.

Reason: the product model is not stable enough to choose `customerId` or org id. `tenantKey` is an identity bridge that can later map to customer/org/site/franchise.

### Entity type

Keep `AppManifest.entities?: EntityDef[]` for this weekend slice.

Do not introduce `EntityManifest` yet. Add stricter JSON validation later only if `EntityDef` proves too code-shaped for manifest persistence.

### Server validation

Fayz API should validate manifests with SDK-owned helpers/schema. Do not fork validation in Fayz.

Near-term: import/use `validateManifest()` and schema when package wiring allows.

### Plugin migrations

Raw SQL is acceptable for internal plugins now. Marketplace/provider-neutral migration declarations are later governance work.

Do not block the Panel manifest slice on migration abstraction.

### Actions/RPC

CRUD-only is enough for first Panel slice.

Actions/RPC should be introduced only when agenda booking or app-specific workflows require it.

### `custom` provider selection

If a manifest uses `backend.provider = "custom"`, it must include `adapterId`.

App/host code registers the adapter. Manifest selects by ID only; no code or secrets in JSON.

### Missing plugin/page/component behavior

For generated apps: hard fail in development/build.

For Fayz Panel: show a visible degraded card with missing registry id, and emit an engineering warning. The Panel should not blank the whole dashboard because one plugin/component is missing.

## Package / runtime / design-system decisions

### Generated project imports

Generated projects should import:

```ts
import '@fayz/runtime/styles.css'
import { ... } from '@fayz/runtime'
```

Surface packages can remain direct imports only for advanced apps. The default generated app path should have one SDK entrypoint.

### `createSaasApp`

Treat `createSaasApp` as compatibility sugar, not the final platform primitive.

Long-term primitive should be manifest-first rendering. But do not remove or break `createSaasApp` during the weekend slice.

### Theme shape in `AppManifest.theme`

Use friendly surface theme shape for authoring, normalized by the surface/runtime.

For admin surfaces, agents can write a friendly `SaasTheme`-like shape. Core keeps it as `Record<string, unknown>` to avoid package coupling.

### `SaasTheme` ownership

`SaasTheme` should live in `@fayz/saas`, not core.

`@fayz/runtime` may re-export it explicitly as a convenience.

### Permission rename

Do not do breaking permission renames during this slice.

If `features` → `grants` is desirable, quarantine it behind a later migration/compat plan.

### UI/auth dependency

`@fayz/ui` should not depend on `@fayz/auth`.

Auth-aware shell/user menu behavior belongs in surface packages like `@fayz/saas`.

### Courses/portal/plugin-courses scope

Quarantine `packages/courses`, `packages/portal`, and `plugins/plugin-courses` until root/runtime/theme foundation is green.

They are not part of the weekend architecture lock.

### Fayz Panel imports

Fayz Panel should render through the same runtime path as generated projects where practical.

Default: use `@fayz/runtime` for parity. If bundling/ambiguity becomes painful, import `@fayz/core` plus specific surfaces directly inside Fayz as an implementation detail, not a product-level fork.

### CSS entrypoint

Use one default CSS entry:

```ts
import '@fayz/runtime/styles.css'
```

Per-surface CSS entries can come later only if bundle cost or theming requires it.

### Workspace scope

Keep external `fayz-app` projects out of mandatory root SDK lock-in builds.

Fixture validation should be an explicit command/workflow, not part of every root build while the SDK is stabilizing.
