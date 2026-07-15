# AGENTS.md — operating manual for agents working in fayz-sdk

**Read first, every session.** Direction & strategy: [docs/DIRECTION.md](docs/DIRECTION.md).
Locked decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Plugin contract: [docs/PLUGIN-PATTERNS.md](docs/PLUGIN-PATTERNS.md).

## What this repo is

The **engine room** of the fayz thesis: apps assembled from upgradable, domain-deep plugins,
generated/edited by the fayz AI builder, sold as subscription ("product on rails", not disposable
codegen). Three-repo topology:

| Repo | Role |
|---|---|
| `~/dev/fayz-sdk` (this) | SDK packages + plugins, published to npm as `@fayz-ai/*` |
| `~/dev/fayz-app/*` | Dogfood/product apps (beauty-saas, norman-ai, resto, stores, courses…) — each its own git repo (some have NO remote; check before assuming) |
| `~/dev/fayz` | The platform: AI builder, editor, containers, publish pipeline (Linear project **fayz.ai**) |

## THE deploy model — do not get this wrong

Apps run **inside fayz** (Lovable-style). Production flow:
`git push (app repo) → fayz project pulls → npm install @fayz-ai/* (REMOTE npm) → container runs npx vite build (no tsc!) → founder clicks "Publicar" → served at <app>.live.fayz.ai`.

Two build modes exist and both must stay green:
- **Source mode (local dev):** apps resolve `@fayz-ai/*` → `../../fayz-sdk/packages/*/src` via
  tsconfig paths + `fayzVite` sibling detection. No republish needed while developing.
- **Published mode (the container):** npm packages only. **Never** let an app's build path
  (tailwind/postcss/vite config, imports) reference `../../fayz-sdk` — it doesn't exist there.

Consequences: SDK changes reach production **only** via npm publish (changesets: `pnpm release`)
+ app package.json spec bumps + push + Publicar. Known platform bug: containers don't refresh
node_modules on their own (FAY-1260) — a publish may need a container clean-reinstall.

## The one architectural rule

> **Plugins emit nothing app-specific by default; the app composes what it wants.** Shared-surface
> contributions (home widgets, header buttons) are opt-in or surface-scoped (`DashboardSurface`,
> e.g. `'finance-home'`), never broadcast. Gate by default; add an override slot only when a
> SECOND real consumer needs it. Any shared-plugin UI change is verified on **both** beauty-saas
> (B2B) and norman-ai (B2C), desktop **and** mobile.

## Plugin capability bar (details: docs/PLUGIN-PATTERNS.md)

Tier-1 ("capability-complete", the only tier generated apps may use): `createXPlugin(options)`
factory with `modules` gating · data-provider **pair** (supabase + mock via
`createSafeDataProvider`) · entity registries · settings via shared `PluginSettingsPanel` ·
**migrations** wired in the manifest · aiTools. Currently Tier-1: financial, agenda*, crm,
inventory, forms, tasks (*agenda still lacks migrations — worst standing violation, Phase-1 item).
Everything labeled `[experimental]` in package.json is a skeleton: do not invest, do not install
in generated apps.

## Working conventions (hard rules)

1. **Parallel lanes are real.** The founder, Codex agents, and other Claude sessions edit these
   trees concurrently. Stage surgically (`git add <file>`), **never `git add -A`** without reading
   `git status` first; never commit/revert/sweep foreign WIP; if your edit is interleaved with
   foreign WIP in one file, leave it uncommitted and say so.
2. **"Green" means typecheck + build + dev-smoke** (dev server serves an SDK module 200 + console
   clean). Type-green alone has hidden broken dev servers (double react-plugin incident) and stale
   containers. For releases add: fleet typecheck (11 apps read SDK from source) + published-mode
   `npx vite build` simulation.
3. **Live-DB protocol** (the beauty Supabase project holds real data): inventory + destructive-scan
   before any apply; report-before-destructive; only additive/idempotent files run. Known trap:
   `plugin-forms/002` DROPs `frm_documents` on re-run — the full `pnpm db:apply` pipeline must not
   run against beauty without a skip-ledger.
4. **Linear is the memory of record.** SDK work → project *fayz-sdk* (epic FAY-1250 = roadmap,
   FAY-1258/59 + FAY-1257 = validation waves). Platform bugs → project *fayz.ai*. Tickets in
   user-story format with plain-language titles. Update tickets as work lands, honestly (reopen if
   you closed too early).
5. **Founder communication:** coordination asks in plain **pt-BR**, no jargon; code, commits and
   Linear stay in English. Never store credentials the founder pastes in chat (rotate-worthy);
   `.env` values are never printed — names only.
6. **Verify before deleting/overwriting**; report failures with output; commits end with the
   `Co-Authored-By: Claude` trailer; commit messages explain the why.
7. **Never stack a modal on a modal** (founder rule, 2026-07-06). A dialog/ConfirmDialog must not
   open on top of an already-open Modal/Sheet. Destructive confirms inside a modal are a two-step
   INLINE confirm (footer swaps to a destructive band with cancel/confirm — see the account modal
   in plugin-marketing ContentView). Dialogs over plain pages are fine.

## Doc map

Full map + reading order: [docs/README.md](docs/README.md). The canonical set (rewritten 2026-07-06):

| Doc | What it holds |
|---|---|
| [docs/DIRECTION.md](docs/DIRECTION.md) | Thesis, validation waves, platform freeze |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Locked decisions with dates + standing operational rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | North star: topology, layers A/B/C/D, serialization boundary, invariants (absorbs architecture-boundaries + architecture-v2) |
| [docs/PLUGINS.md](docs/PLUGINS.md) | The plugin contract: manifest reference, lifecycle, capability-as-law, versioning |
| [docs/PLUGIN-PATTERNS.md](docs/PLUGIN-PATTERNS.md) | The CI-enforced plugin anatomy rules (what the gates check) |
| [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) | The 7-level ladder, component contracts, incubator plugins + graduation |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Rings, migrations (manifest-delivered), RLS canon, Supabase topology |
| [docs/CONNECTORS.md](docs/CONNECTORS.md) | Integration spine + the connector standard |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Registries, public/private split (🔴 P0 alert), release trains, plugin artifact |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, RLS correctness, LGPD, secrets, money-path guardrails |
| [docs/THEMES.md](docs/THEMES.md) | Theme contract, tokens, design-system-as-contract, surfaces/personas |
| [docs/TESTING.md](docs/TESTING.md) | The test pyramid, capability tests, composition testing |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Fleet observability, upgrade waves, support, backup/export (design) |
| [docs/BEST-PRACTICES.md](docs/BEST-PRACTICES.md) | The twelve rules + enforcement map |
| [docs/BENCHMARKS.md](docs/BENCHMARKS.md) | Evidence: WordPress post-mortem, Shopify playbook, OSS references |
| [docs/MARKETPLACE.md](docs/MARKETPLACE.md) | Governance + community submission pipeline (design, frozen) |
| [docs/AI-BUILDER.md](docs/AI-BUILDER.md) | **The builder ⇄ SDK contract, v0.1** — install, configure, customize, migrate, escalate |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones, feasibility, gap register, decision queue, plugin census |
| [docs/design/](docs/design/) | RFCs + integration briefs (rationale; canon lives in the docs above) |
| [docs/archive/](docs/archive/) | Superseded docs kept for history — do not follow them |

## State snapshot (2026-07-02 — verify against Linear before trusting)

Branch `feat/mobile-app-shell-bottomnav` carries 27+ unpublished commits (foundation Phase 0 +
mobile/B2C wave + auth extraction + storefront contracts); main is strictly behind (fast-forward
merge). Changesets for the release are committed (`.changeset/`); publish waits on the founder's
in-flight permission work (4 dirty saas/core files are THEIRS). Wave 1 (clinic) is mid-flight:
RLS live, seeds applied except `seed-saas-core.sql` (held for the permission work), clinic
owner account exists. `@fayz-ai/plugin-auth` is new and NOT yet on npm — it must ship in the same
release as saas 0.7.0 or installs break.
