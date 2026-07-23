# Fayz SDK — docs index

**Status: canonical · Updated 2026-07-23.** Map of the `docs/` tree. The operating manual is
[/AGENTS.md](../AGENTS.md) — read it first. Reading order for the canon: **DIRECTION → DECISIONS →
ARCHITECTURE → PLUGINS → DATA-MODEL**.

## Canonical set (rewritten 2026-07-06; mirrors the AGENTS.md doc map)

| Doc | What it holds |
|---|---|
| [DIRECTION.md](DIRECTION.md) | Thesis, validation waves, platform freeze — read before proposing work |
| [DECISIONS.md](DECISIONS.md) | Locked decisions with dates + standing operational rules |
| [ARCHITECTURE.md](ARCHITECTURE.md) | North star: topology, layers A/B/C/D, serialization boundary, invariants |
| [PLUGINS.md](PLUGINS.md) | The plugin contract: manifest reference, lifecycle, capability-as-law, versioning |
| [PLUGIN-PATTERNS.md](PLUGIN-PATTERNS.md) | The CI-enforced plugin anatomy rules (what the gates check) |
| [PLUGIN-CONTRACT.md](PLUGIN-CONTRACT.md) | The publishable-package standard: tables.ts, migrations+embed+ledger, exports, RLS/grants |
| [CUSTOMIZATION.md](CUSTOMIZATION.md) | The 7-level ladder, component contracts, incubator plugins + graduation |
| [DATA-MODEL.md](DATA-MODEL.md) | Rings, migrations (manifest-delivered), RLS canon, Supabase topology |
| [ENTITLEMENTS.md](ENTITLEMENTS.md) | Access resolution: role (RBAC) × plan × limits, one decision point |
| [CONNECTORS.md](CONNECTORS.md) | Integration spine + the connector standard |
| [DISTRIBUTION.md](DISTRIBUTION.md) | Registries, public/private split, release trains, plugin artifact |
| [SECURITY.md](SECURITY.md) | Threat model, RLS correctness, LGPD, secrets, money-path guardrails |
| [THEMES.md](THEMES.md) | Theme contract, tokens, design-system-as-contract, surfaces/personas |
| [TESTING.md](TESTING.md) | The test pyramid, capability tests, composition testing |
| [OPERATIONS.md](OPERATIONS.md) | Fleet observability, upgrade waves, support, backup/export |
| [BEST-PRACTICES.md](BEST-PRACTICES.md) | The twelve rules + enforcement map |
| [BENCHMARKS.md](BENCHMARKS.md) | Evidence: WordPress post-mortem, Shopify playbook, OSS references |
| [MARKETPLACE.md](MARKETPLACE.md) | Governance + community submission pipeline (design, frozen) |
| [AI-BUILDER.md](AI-BUILDER.md) | The builder ⇄ SDK contract, v0.1 — install, configure, customize, migrate, escalate |
| [ROADMAP.md](ROADMAP.md) | Milestones, feasibility, gap register, decision queue, plugin census |
| [LOCAL-DEV.md](LOCAL-DEV.md) | Local SDK-source vs published resolution (`fayzVite`, `FAYZ_SDK_SOURCE`, `*:published-sdk`) |

## Operational (living, not canon)

| Doc | What it holds |
|---|---|
| [CHECKLIST.md](CHECKLIST.md) | QA matrix — live stabilization-op log across the backoffices |
| [design/](design/) | RFCs + integration briefs (FAYZ-CLOUD, MIGRATION-ARCHITECTURE, PLUGIN-MIGRATIONS, bling) — rationale; canon lives in the docs above |
| [checkpoints/](checkpoints/) | Execution trackers for in-flight programs (industry-pools, devcenter, fayz-cloud) |
| [archive/](archive/) | Superseded docs kept for history — **do not follow them** |

> Note: the pre-2026-07 lowercase docs (`architecture-boundaries`, `architecture-v2`,
> `customization-ladder`, `data-model`, `plugin-model`, `private-plugins`,
> `ai-builder-request-taxonomy`, `contributing`, `data-model-refactor`) were consolidated into the
> UPPERCASE canon above and moved to `archive/`. Old links to them are dead by design.
