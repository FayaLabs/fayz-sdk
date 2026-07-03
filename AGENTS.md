# AGENTS.md — operating manual for agents working in fayz-sdk

**Read first, every session.** Direction & strategy: [docs/DIRECTION.md](docs/DIRECTION.md).
Locked decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Plugin contract: [PLUGIN_PATTERNS.md](PLUGIN_PATTERNS.md).

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

## Plugin capability bar (details: PLUGIN_PATTERNS.md)

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

## Doc map

| Doc | What it holds |
|---|---|
| [docs/DIRECTION.md](docs/DIRECTION.md) | Thesis, audit scorecard, 5-phase roadmap, validation waves, platform freeze |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Locked decisions with dates + standing operational rules |
| [PLUGIN_PATTERNS.md](PLUGIN_PATTERNS.md) | The plugin contract: anatomy, rules, capability checks (CI-enforced) |
| [docs/architecture-boundaries.md](docs/architecture-boundaries.md) | Ownership model SDK vs app — layers A/B/C/D, public surface (locked, FAY-1217) |
| [docs/architecture-v2.md](docs/architecture-v2.md) | Manifest-first design: AppManifest, registries, scaffolds, block system |
| [docs/customization-ladder.md](docs/customization-ladder.md) | Levels 1–7 of app customization (config → custom plugin) — single source |
| [docs/plugin-model.md](docs/plugin-model.md) | WHY plugins are designed this way (flexibility without rigidity) |
| [docs/private-plugins.md](docs/private-plugins.md) | Level-7 how-to: app-local/partner plugins + graduation checklist |
| [docs/ai-builder-request-taxonomy.md](docs/ai-builder-request-taxonomy.md) | The 5 request classes the fayz classifier enforces (safety boundary) |
| [docs/data-model.md](docs/data-model.md) | Ring 0/1/2 data architecture (applied, locked) |
| [docs/design/MIGRATION-ARCHITECTURE.md](docs/design/MIGRATION-ARCHITECTURE.md) | Locked migration/provisioning spec + [PLUGIN-MIGRATIONS.md](docs/design/PLUGIN-MIGRATIONS.md) rationale |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Per-plugin state census (living; verify against code) |
| [docs/archive/](docs/archive/) | Superseded docs kept for history — do not follow them |

## State snapshot (2026-07-02 — verify against Linear before trusting)

Branch `feat/mobile-app-shell-bottomnav` carries 27+ unpublished commits (foundation Phase 0 +
mobile/B2C wave + auth extraction + storefront contracts); main is strictly behind (fast-forward
merge). Changesets for the release are committed (`.changeset/`); publish waits on the founder's
in-flight permission work (4 dirty saas/core files are THEIRS). Wave 1 (clinic) is mid-flight:
RLS live, seeds applied except `seed-saas-core.sql` (held for the permission work), clinic
owner account exists. `@fayz-ai/plugin-auth` is new and NOT yet on npm — it must ship in the same
release as saas 0.7.0 or installs break.
