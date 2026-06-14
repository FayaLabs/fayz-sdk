# 13 — Codex Research Lanes

Use Codex first as research agents. Do not let them all code at once on the same branch until architecture is locked.

## Global instruction for every Codex lane

```md
You are researching Fayz SDK architecture before implementation.

Do not make broad code changes. Prefer reading code and writing a concise research note.

Context:
- Repo: /Users/fayalabs/dev/fayz-sdk unless lane says otherwise.
- Related repos:
  - /Users/fayalabs/dev/fayz
  - /Users/fayalabs/dev/fayz-app
  - /Users/fayalabs/dev/open-source/javascript-sdk
  - /Users/fayalabs/dev/open-source/odoo
  - /Users/fayalabs/dev/open-source/medusa-commerce
  - /Users/fayalabs/dev/open-source/cal.diy

Read these docs first:
- docs/discovery/07-vini-mission-brief.md
- docs/discovery/08-current-codebase-findings.md
- docs/discovery/10-architecture-visuals.md
- docs/discovery/11-fayz-core-structure.md
- docs/discovery/12-weekend-operating-plan.md

Return a research note with:
1. Current architecture facts.
2. Files inspected.
3. Recommended minimum implementation path.
4. Risks/contradictions.
5. Test/build commands needed.
6. Open questions for Vini/Hermes.

Do not start implementing unless explicitly instructed in a follow-up.
```

## Lane 1 — SDK manifest/provider contract

**Repo:** `/Users/fayalabs/dev/fayz-sdk`

**Question:** What exactly must change in `@fayz/core` to support tenant-specific Fayz Panel rendering and Fayz API provider without breaking existing Supabase apps?

**Inspect:**

- `packages/core/src/manifest/index.ts`
- `packages/core/src/manifest/app-manifest.schema.json`
- `packages/core/src/data/*`
- `packages/core/src/types/plugins.ts`
- `packages/core/src/index.ts`
- tests around manifest/data providers, if any

**Output file:** `docs/discovery/research/sdk-manifest-provider.md`

**Prompt:**

```md
Research the SDK manifest/provider contract for the Fayz SDK architecture.

Focus on @fayz/core. Determine the smallest safe change to support:
- canonical AppManifest as the shared app contract;
- Fayz API as a provider option alongside Supabase/mock/custom;
- stronger manifest validation;
- future separation of DataProvider vs ActionProvider vs MigrationProvider without overbuilding now.

Do not implement. Write your findings to docs/discovery/research/sdk-manifest-provider.md.
```

## Lane 2 — Fayz API/editor Panel integration

**Repo:** `/Users/fayalabs/dev/fayz`

**Question:** Where should Fayz store/resolve active manifests and how should the editor Panel consume/render them?

**Inspect:**

- `apps/api/src/modules/projects/**`
- project Prisma schema/migrations
- `apps/web/src/**` editor/Panel components
- existing project/settings/cloud features routes
- current API patterns for project-scoped data

**Output file:** `/Users/fayalabs/dev/fayz-sdk/docs/discovery/research/fayz-panel-api.md`

**Prompt:**

```md
Research Fayz API and web editor integration for tenant-specific AppManifest rendering.

Goal: identify where to add manifest storage/resolver and where Panel should render a manifest surface.

Do not implement. Write findings to /Users/fayalabs/dev/fayz-sdk/docs/discovery/research/fayz-panel-api.md.

Cover:
- candidate DB table/model name and relations;
- API endpoint shape;
- tenant/customer/environment identity options;
- current Panel component/files;
- invariant host-owned sections like Cloud Features;
- smallest implementation slice;
- tests/build commands.
```

## Lane 3 — Generated project scaffold + agent guide

**Repo:** `/Users/fayalabs/dev/fayz`

**Question:** How should new Fayz projects include SDK manifest/runtime/dependencies and agent-readable instructions?

**Inspect:**

- `apps/api/src/modules/projects/scaffold/index.ts`
- `apps/api/src/modules/projects/scaffold-libraries.ts`
- scaffold template directory
- AI/codegen prompt files only for discovery; Boris owns structural prompt edits
- generated app package.json shape

**Output file:** `/Users/fayalabs/dev/fayz-sdk/docs/discovery/research/generated-project-scaffold.md`

**Prompt:**

```md
Research how generated Fayz projects are scaffolded and where Fayz SDK should be included.

Do not implement. Write findings to /Users/fayalabs/dev/fayz-sdk/docs/discovery/research/generated-project-scaffold.md.

Cover:
- dependency insertion point;
- starter manifest file location;
- runtime imports needed;
- agent guide location inside generated projects;
- migration command expectations;
- risks with existing generated apps.
```

## Lane 4 — Beauty SaaS proof path

**Repo:** `/Users/fayalabs/dev/fayz-app/beauty-saas`

**Question:** What is the smallest Beauty SaaS slice that can become manifest-driven and demoable?

**Inspect:**

- `src/App.tsx`
- agenda plugin usage
- entity/type definitions
- Supabase/provider config
- build/test scripts

**Output file:** `/Users/fayalabs/dev/fayz-sdk/docs/discovery/research/beauty-proof.md`

**Prompt:**

```md
Research Beauty SaaS as the first proof app for Fayz SDK manifest architecture.

Do not implement. Write findings to /Users/fayalabs/dev/fayz-sdk/docs/discovery/research/beauty-proof.md.

Cover:
- which app config can become pure manifest JSON;
- which components/functions require registry IDs;
- minimum agenda/booking demo path;
- data provider requirements;
- risks in converting too much too early;
- exact success criteria for Monday demo.
```

## Lane 5 — Existing package/design-system hardening

**Repo:** `/Users/fayalabs/dev/fayz-sdk`

**Question:** What package/design-system issues must be resolved before locking the SDK into Fayz and generated apps?

**Inspect:**

- `packages/ui/**`
- `packages/saas/**`
- current uncommitted changes
- package dependency graph
- theme/token APIs
- build/typecheck scripts

**Output file:** `docs/discovery/research/package-design-system.md`

**Prompt:**

```md
Research existing package/design-system stability before we lock Fayz SDK into Fayz and generated projects.

Do not implement. Write findings to docs/discovery/research/package-design-system.md.

Cover:
- package boundaries;
- design token/theme variation strategy;
- current uncommitted work risk;
- build/typecheck status;
- what must be fixed before SDK standardization;
- what can wait.
```

## When to switch from research to implementation

Only after Hermes consolidates research into:

- `20-architecture-lock.md`
- `21-implementation-plan.md`

Implementation should use separate worktrees or explicit lanes. Do not let five Codex agents edit `main` simultaneously.
