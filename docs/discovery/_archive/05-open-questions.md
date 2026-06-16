# 05 — Open Questions

Questions we should answer during discovery. Do not fake answers just to start coding.

## P0 — Must answer before implementation

1. **DB table name and ownership:** what table stores the per-project/per-tenant Panel/SaaS manifest reference in Fayz? Candidate names to evaluate: `ProjectAppManifest`, `ProjectPanelManifest`, `TenantAppManifest`, `ProjectSurfaceConfig`. Need one locked name before migrations.
2. **Tenant identity:** what is the exact key for tenant-specific rendering in Fayz: project, customer, workspace, organization, deployment, or environment?
3. **Manifest scope:** is the Panel manifest the same `AppManifest` from SDK architecture v2, a `SurfaceManifest`, or a separate `SaasManifest` embedded/referenced by `AppManifest`?
4. **Invariant surfaces:** what exactly always appears in Panel regardless of manifest? Vini mentioned Cloud Features. Need list and override rules.
5. **Provider contract:** what minimal interface must support both Supabase and Fayz API? CRUD, RPC/actions, realtime, file storage, auth context, migrations?
6. **Migration responsibility:** when SDK generates migrations, who executes them: Fayz API, generated app repo CI, CLI, or operator approval flow?
7. **Retro-compat target order:** is `beauty-saas` definitely first, then `tannat-store`, then restaurant/POS? Or does restaurant-saas need to be first because of Panel/plugin variance?
8. **Linear mutation permission:** should Hermes create the fresh Linear epics/issues in cycle 21 now, or first produce the proposed structure for Vini approval?

## Product/category

1. Do we call the core primitive `module`, `plugin`, `app`, or separate them clearly?
2. Is Fayz SDK primarily for internal generated apps first, public open-source ecosystem later, or both from day one?
3. What is the first user-facing proof: Beautysoft, The Chef, or a generic demo module?
4. What should a non-technical operator be able to customize without deploy?
5. What should only a builder/developer be allowed to customize?
6. What does “Notion-like pages” mean in Fayz: nested pages, arbitrary blocks, databases per page, permissions per page, or all of the above?

## Architecture

1. Should module definitions live in `packages/core` or a new package?
2. How does the new module contract relate to existing `AppManifest` in `architecture-v2.md`?
3. Are modules embedded inside app manifests, referenced by plugin IDs, or both?
4. What is the boundary between `@fayz/core`, `@fayz/runtime`, and `@fayz/saas`?
5. Should validation use hand-written TypeScript checks first or JSON Schema/Zod from day one?
6. How much of the existing plugin system can be reused without de-bridging too much now?
7. How should Fayz API provider differ from Supabase provider without leaking Fayz internals into the open SDK?
8. Should manifest storage be versioned immediately, or only store current JSON plus history/audit later?

## Governance

1. What are the minimum risk levels for actions and agent capabilities?
2. Which actions require human approval in v1 examples?
3. What must be auditable before real customer usage?
4. How do plugin permissions map to user roles?
5. How should AI-generated changes be reviewed and rolled back?
6. Do manifest-only changes require approval before affecting a live customer/demo tenant?

## Ecosystem

1. What is open-source versus proprietary?
2. What does a certified plugin mean?
3. How will community builders publish modules?
4. What does a module/plugin dependency look like?
5. What monetization model is plausible later?
6. Are Medusa and Cal.diy references only inspiration, or are we wrapping/integrating real code/packages?

## Validation

1. What proves the SDK is useful before full runtime exists?
2. Which two vertical examples stress the model enough?
3. What would make us stop and simplify?
4. What would make us invest in runtime/marketplace next?
5. What is the demo script for `beauty-saas`? Minimum: open agenda, create booking, see persisted data, change manifest JSON and observe UI change.
