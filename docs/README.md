# Fayz SDK — docs index

**Status: canonical · Updated 2026-07-14.** Map of the `docs/` tree. Start with
[DIRECTION.md](./DIRECTION.md) for where the SDK is going and
[architecture-boundaries.md](./architecture-boundaries.md) for the ownership contract.

| Doc | Status | Updated | What it covers |
|---|---|---|---|
| [DIRECTION.md](./DIRECTION.md) | canonical | 2026-07-02 | Thesis, phase map, current audit verdict — read before proposing work |
| [architecture-boundaries.md](./architecture-boundaries.md) | canonical | 2026-06-19 | The four-layer ownership contract (who owns what, why upgrades stay safe) |
| [architecture-v2.md](./architecture-v2.md) | approved (v1 draft) | 2026-06-11 | Manifest-first design |
| [customization-ladder.md](./customization-ladder.md) | canonical | — | The 7 levels of customization without forking SDK code |
| [LOCAL-DEV.md](./LOCAL-DEV.md) | canonical | 2026-07-14 | Local SDK-source vs published resolution (`fayzVite`, `FAYZ_SDK_SOURCE`, `*:published-sdk`) |
| [data-model.md](./data-model.md) | reference | — | The three-ring archetype data model |
| [data-model-refactor.md](./data-model-refactor.md) | working | — | Order-to-cash spine refactor (execution plan, not current state) |
| [plugin-model.md](./plugin-model.md) | reference | — | Curated capability without becoming *engessado* |
| [private-plugins.md](./private-plugins.md) | reference | — | Partner / app-local extension path |
| [ai-builder-request-taxonomy.md](./ai-builder-request-taxonomy.md) | reference | — | How builder requests map onto the customization ladder |
| [ROADMAP.md](./ROADMAP.md) | reference | — | Per-package maturity map + good first contributions |
| [DECISIONS.md](./DECISIONS.md) | log | — | ADR-lite decision log with rationale |
| [contributing.md](./contributing.md) | reference | — | Contributor guide |
| [bling-integration-brief.md](./bling-integration-brief.md) | draft | 2026-06-15 | Bling integration briefing (pt-BR) |

Subfolders: `design/` (migration architecture deep-dives), `checkpoints/` (execution
trackers), `dogfood-sprint/`, `archive/` (superseded docs).
