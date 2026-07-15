# docs/archive — superseded documents

Kept for history and rationale-mining. **Do not follow these operationally** — the living docs are
[/AGENTS.md](../../AGENTS.md), [../DIRECTION.md](../DIRECTION.md), [../DECISIONS.md](../DECISIONS.md)
and the doc map in AGENTS.md.

| File | What it was | Superseded by |
|---|---|---|
| `agent-guide-2026-06.md` | 1,600-line agent guide; ~60% documents the deleted `createSaasApp` API and historical proof-run logs | `/AGENTS.md` (operations) + `architecture-boundaries.md` + `ai-builder-request-taxonomy.md` (generated-app rules). The Phase-3 "docs-as-agent-specs" work will produce the real generated-app guide. |
| `architecture-blueprint.md` | The founding vision (2026-06-11): layer model, missing primitives, de-bridge plan | `architecture-v2.md` (approved direction) + `DIRECTION.md` (current strategy). Historical thesis — good rationale reading. |
| `reuse-evaluation.md` | Proof that 3 storefronts share 3.2k LOC with 75–110 LOC per store (2026-06-11) | Point proven; the storefront contracts evolved (component-contracts/define.*). |
| `storefront-templates-research.md` | Nuvemshop theme research that produced the 4 storefront templates | Templates shipped (pulse=volt, tannat=sertao); design rationale only. |
| `architecture-v2-2026-06.md` | Manifest-first design (AppManifest as authored JSON contract) + platform machinery plan | [`../ARCHITECTURE.md`](../ARCHITECTURE.md). Central framing reversed by DECISIONS 2026-07-01 (codegen `config/app.tsx` is the source of truth); `fayz migrate`/`fayz upgrade` verbs were never built. |
| `architecture-boundaries-2026-06.md` | The FAY-1217 ownership contract: 4 layers, public surface, provider rule, soft enforcement | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (content absorbed, still authoritative in its new home). |
| `customization-ladder-2026-06.md` | The 7-level customization ladder, framed around editing `app.manifest.json` | [`../CUSTOMIZATION.md`](../CUSTOMIZATION.md) (ladder kept, reframed to `defineSaas` codegen). |
| `plugin-model-2026-06.md` | "Why plugins are designed this way" essay + per-plugin depth inventory | [`../PLUGINS.md`](../PLUGINS.md). Had broken pointers (STATE.md) and a stale "none have tests" inventory. |
| `private-plugins-2026-06.md` | Layer-C partner extension path (scaffold, references, graduation checklist) | [`../CUSTOMIZATION.md`](../CUSTOMIZATION.md) §incubator plugins. |
| `data-model-2026-06.md` | Ring 0/1/2 archetype architecture, RLS canon, M-LOCK enforcement | [`../DATA-MODEL.md`](../DATA-MODEL.md). |
| `data-model-refactor-2026-06.md` | Order-to-cash spine execution plan (S1–S6), event-sourced money; held the repo's first mermaid | [`../DATA-MODEL.md`](../DATA-MODEL.md) (diagram ported). |
| `contributing-2026-06.md` | OSS contributor guide | [`../PLUGINS.md`](../PLUGINS.md) §authoring + [`../DISTRIBUTION.md`](../DISTRIBUTION.md). Was the worst-drifted doc: deleted `createSaasApp` API, phantom `examples/`, live-marketplace framing. |
| `ai-builder-request-taxonomy-2026-06.md` | The 5 AI-builder request classes | [`../AI-BUILDER.md`](../AI-BUILDER.md) §customization matrix. |
| `roadmap-census-2026-07.md` | Per-package/plugin census (Solid/Partial/Early-scaffold taxonomy) | [`../ROADMAP.md`](../ROADMAP.md) Appendix A (single capability-contract taxonomy). |
