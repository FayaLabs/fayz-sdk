# Fayz SDK — Discovery & Architecture

This folder is the durable architecture record for the Fayz platform. It was cleaned on **2026-06-16**: ~16 ephemeral weekend-process and superseded docs were moved to [`_archive/`](_archive/), and three authoritative synthesis docs were written from a full cross-repo audit.

## Start here (the current truth)

1. **[STATE.md](STATE.md)** — Where the platform actually is. The three-repo topology, layer-by-layer maturity, the one structural gap, and the reference contract. *Read this first.*
2. **[PLUGIN-MODEL.md](PLUGIN-MODEL.md)** — The answer to "curated plugins without becoming rigid." The three-layer model, the four escape valves, the Plugin Capability Contract, plugin depth inventory, and community strategy.
3. **[ROADMAP.md](ROADMAP.md)** — Ranked gaps, the next two weeks (one vertical slice fully wired), the Linear grooming plan, and how to keep this audit alive.
4. **[RELEASE-PLAN.md](RELEASE-PLAN.md)** — How we ship into the live Fayz in four ordered steps (every project ships the SDK → agent handles packages → deploy our apps → plugin center for customers), plus the two parallel agent lanes (Codex / Claude Code). Mirrored to the Linear project doc "Release plan + agent lanes".

## Durable decision records (the locks)

These are the standing decisions the synthesis docs build on. Keep; don't duplicate.

- [01-product-brief.md](01-product-brief.md) — category thesis, target users, vertical proof points.
- [02-architecture-principles.md](02-architecture-principles.md) — non-negotiables.
- [03-concept-map.md](03-concept-map.md) — glossary of platform primitives.
- [20-architecture-lock.md](20-architecture-lock.md) — locked minimal architecture (canonical `AppManifest`, provider boundary, surfaces). *Note: its many "supervisor refresh" sections are historical; STATE.md supersedes the operational parts.*
- [26-app-contract-and-integrations-decision.md](26-app-contract-and-integrations-decision.md) — manifest-first app contracts, plugin factories, integration lessons.
- [27-npm-sdk-package-lock.md](27-npm-sdk-package-lock.md) — one public package; lean `@fayz-ai/sdk`.
- [28-proof-first-route-lock.md](28-proof-first-route-lock.md) — proof-first scope lock; capabilities before packages.
- [30-sdk-app-operating-contract.md](30-sdk-app-operating-contract.md) — edit boundaries between generated apps and SDK engines. *The operational contract for the AI builder.*
- [18-fay-1182-runtime-session-decision.md](18-fay-1182-runtime-session-decision.md) · [24-runtime-oauth-helper-contract.md](24-runtime-oauth-helper-contract.md) · [25-provider-onboarding-decision-brief.md](25-provider-onboarding-decision-brief.md) — the OAuth/runtime-broker trust boundary.

## Reference

- [06-base44-reference.md](06-base44-reference.md) — competitive SDK reference (Base44).
- [10-architecture-visuals.md](10-architecture-visuals.md) — Mermaid diagrams.
- [29-generated-app-dogfood-status.md](29-generated-app-dogfood-status.md) — dogfood gate status log (Fayz-repo agent-scope gates).
- [research/](research/) — the five research-lane outputs (sdk-manifest-provider, fayz-panel-api, generated-project-scaffold, package-design-system, beauty-proof).

## Also in `docs/` (outside discovery)

- `../architecture-v2.md`, `../architecture-blueprint.md`, `../customization-ladder.md` — earlier architecture writing; consistent with the manifest-first direction.
- `../bling-integration-brief.md`, `../de-bridge-playbook.md`, `../agent-guide.md` — operational briefs.

---

*Archived process docs (intake log, weekend operating plan, supervision protocols, run-state, progress log, superseded plans, old Linear structure) live in [`_archive/`](_archive/) — preserved for history, out of the active set.*
