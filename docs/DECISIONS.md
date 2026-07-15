# Decision log (ADR-lite)

One entry per locked decision, newest first. A decision stays here until explicitly superseded.
Format: **date — decision** · rationale · consequences.

## 2026-07-08 — `fayz create` scaffolds real apps; the builder-agent simulation is a Claude Code skill
The CLI's stub templates (placeholder runtime, zero plugins) were replaced with the proven dogfood
shapes (pulse-store / beauty-saas / course-members) — generated apps compile against published npm
and boot on mock providers with no env. The agent brain deliberately lives OUTSIDE the CLI:
`.claude/skills/fayz-create` plays the platform builder (brief → ≤4 product questions incl. look &
feel and real-vs-invented catalog → `fayz create --dir ~/dev/fayz-app/_create --install` →
personalization to dogfood depth incl. Unsplash imagery → build/doctor/browser gate). Rationale: the
CLI stays a deterministic tool any agent (platform builder, Claude Code, CI) can invoke; intelligence
is never baked into the binary. Proven e2e 2026-07-08 (Vitalis storefront). Consequences:
`release-channels.json` is now load-bearing for scaffold quality (was 5 minors stale, unnoticed) —
`scripts/sync-release-channels.mjs` is release step 4b; `@fayz-ai/portal` promoted to the supported
surface. Spec: AI-BUILDER §1/§4.

## 2026-07-06 — Distribution split: protocol public, products private
Verified exposure: every @fayz-ai package is on public npm under MIT — the commercial plugins are
legally reusable by anyone (published versions stay MIT forever). Locked: substrate packages
(sdk/core/db/auth/ui — what community code compiles against) stay public; domain plugins +
commercial templates (plugin-*, saas, shop, storefront, courses, portal) move to a restricted
registry + proprietary license at their next release, old versions `npm deprecate`d. Registry
mechanism still open (ROADMAP Appendix B #1). No mass unpublish (breaks installs, rarely works).
Spec: docs/DISTRIBUTION.md. Consequence: editor containers + app CI need registry auth before the flip.

## 2026-07-06 — manifest.migrations[] is THE schema delivery mechanism
Loose `.sql` files in a plugin not wired into its manifest are a contract violation — the plugin
lies about what installing it provisions. Census at lock: tasks wired; crm/financial/inventory/forms
loose (⚠); agenda ships none. Remediation = Phase 1 (FAY-1252/1211), runner = FAY-1205.
Spec: docs/DATA-MODEL.md §5. Migrations are append-only once applied to any real DB.

## 2026-07-06 — Supabase topology standard: shared product projects vs dedicated per SaaS
De-facto dogfood reality, now locked as the rule the builder follows: product instances (shops,
course sites) land in the shared product project (FayzShop by store_id, FayzCourse); a business's
SaaS gets a dedicated project. No per-domain project federation. Spec: docs/DATA-MODEL.md §7;
builder decision tree: docs/AI-BUILDER.md §8. Open: project ownership + provisioning automation
(ROADMAP Appendix B #12).

## 2026-07-06 — One plugin-maturity taxonomy: the capability gate's classification
`check-plugin-capability.mjs` output (capability/partial/visual + [experimental] label + ENFORCED
allowlist) is the only maturity language; the old Solid/Partial/Early-scaffold census taxonomy is
retired. Census lives in ROADMAP.md Appendix A, regenerated from the script — never hand-edited.

## 2026-07-06 — Cross-plugin data: links via the spine, never cross-prefix FKs
A plugin's tables never FK another plugin's prefix; relations go through saas_core spine ids (or a
link table owned by the declaring plugin), resolved at query time. Rationale: independent
install/uninstall (Medusa defineLink discipline). Mechanism (formal primitive vs convention +
doctor scan) still open (Appendix B #5). Spec: docs/DATA-MODEL.md §4.

## 2026-07-06 — Docs refactor: UPPERCASE canon set + status-label grammar
docs/ rewritten as 16 canonical UPPERCASE documents (map: docs/README.md); superseded docs
tombstoned into docs/archive/ with ledger rows. Claims carry [implemented]/[partial]/
[planned FAY-x]/[decision-needed] labels; CI claims must cite the enforcing script; AI-BUILDER.md
is versioned (v0.1) and changes to it require an entry here. A doc that over-promises vs code is a bug.

## 2026-07-03 — One primary add action per module; config picks its face, never both
With `quickAdd: true` plugin-financial rendered three add affordances at once (quick-add pair +
the ERP "+ New" menu). Rule: a module header exposes ONE add entry point — `quickAdd: true` (B2C)
→ only "Nova transação" (receipt attach lives inside the sheet; unpaid expense = payable);
default (ERP) → only the "+ New" quick-actions menu. Generalizes to every plugin and gives the
AI builder a single answer to "what does this module's add button do".

## 2026-07-03 — Navigation is surface-scoped (`CustomPage.nav: false`)
Mobile-only pages (bottom-nav overflow hubs, avatar targets) set `nav: false`: routed but never
shown in the desktop sidebar. Same lesson as `finance-home`: surfaces compose what makes sense
for them — bottomNav declares the mobile world, the sidebar shows only desktop-meaningful items.

## 2026-07-02 — The clinic validates the FULL beauty-saas, no lite version
Founder call. Tenant isolation (RLS, now on every `tenant_id` table) makes a shared full deployment
safe. The `VITE_BEAUTY_PRESET=clinic` preset exists in code but will NOT be deployed — it is kept
only as evidence input for the future persona engine (FAY-1253).

## 2026-07-02 — Deploy = the fayz publish flow; no parallel hosts
Each dogfood app is a **fayz project** connected to its git repo: push → fayz pulls → installs
`@fayz-ai/*` from **remote npm** → container runs `npx vite build` (no tsc) → founder clicks
**Publicar**. Consequences: (a) SDK changes reach production ONLY via npm publish + version bump +
app spec bump; (b) any `../../fayz-sdk` local-source reference in an app's build path breaks the
container; (c) never introduce Vercel/Netlify side-channels — the fayz pipeline IS the product
being validated. Known platform issues: FAY-1260 (container never refreshes node_modules),
FAY-1261 (auto-fix loops on environment errors), FAY-1262 (fayzTailwind monorepo globs).

## 2026-07-02 — Validation portfolio + platform freeze (executive signature)
Three staggered validation waves (clinic / Pix commerce / courses) with hard windows and kill
criteria; ALL speculative platform surface frozen until first revenue; abstractions are built
pull-only (second real consumer rule). See DIRECTION.md. Silvio's parallel BeautySoft: evidence
first, converge later (FAY-1220 machinery ready when he opts in).

## 2026-07-02 — Plugin shared-surface UI is opt-in or surface-scoped, never broadcast
Root cause of FAY-1247 (norman's finance widgets polluting beauty). Mechanisms: dedicated
`DashboardSurface` values (`'finance-home'` for B2C money screens) and opt-in options
(`createFinancialPlugin({ quickAdd: true })`, default false). Cross-consumer verification
(beauty AND norman) required for any shared-plugin UI change.

## 2026-07-01 — Builder⇄SDK serialization boundary is CODEGEN, not JSON
The fayz builder's SE agent writes `config/app.tsx` (`defineSaas` / `createStorefront`) — the
config file IS the serialization format, an LLM is the serializer. `ProjectAppManifest` stays a
derived index, never the source of truth. Kills the "configs contain functions/components so we
can't serialize" blocker.

## 2026-07-01 — One saas config shape: `FayzAppConfig` via `defineSaas`
`createSaasApp` / `SaasAppConfig` / `PageConfig` / `createFayzApp` deleted (−1k LOC). Theme shapes
are discriminated by an explicit `__kind: 'saas-theme'` marker (`isSaasTheme()` in
`packages/saas/src/shell/config/theme/utils.ts`) — never duck-type config shapes.

## 2026-07-01 — Portfolio honesty: skeleton plugins are labeled `[experimental]`
8 plugins (reports, conversations, shop, dashboard, courses, automations, reputation, sites) carry
the label in package.json + README until they meet the capability bar (PLUGIN-PATTERNS.md).
The advertised surface must equal the real surface — an AI builder reads package metadata.

## 2026-06-17 — Migration architecture locked
`docs/design/MIGRATION-ARCHITECTURE.md` is the canonical spec (Ring 0 spine / Ring 1 plugin /
Ring 2 app tables; Drizzle per-app; plugin-owned migrations RFC in `docs/design/PLUGIN-MIGRATIONS.md`).
plugin-agenda still ships no migrations — Phase-1 item, worst standing contract violation.

## 2026-06-14 — Capability-contract-first (FAY-926/938 canceled deliberately)
The old Plugin-SDK framework and editor-bridge were canceled in favor of proving the Plugin
Capability Contract through real plugins first (FAY-1203/1204/1206). Marketplace scope returns
only on top of a provable contract (Phase 4).

## Standing operational rules
- **Parallel lanes are real** (founder, Codex, Claude agents share trees): stage files surgically,
  never `git add -A`; foreign WIP is never committed, reverted, or swept.
- **"Green" = typecheck + build + dev-smoke** (serve one SDK module via the dev server + console
  clean) — type-level green alone has shipped broken dev servers before.
- **Live DB protocol**: inventory + destructive-scan first; report-before-destructive; apply only
  additive/idempotent files; `plugin-forms/002` is a known destructive re-run (drops
  `frm_documents`) — never run the full pipeline against the beauty DB without a skip-ledger.
- **Founder communication**: coordination asks in plain pt-BR; code/commits/Linear in English.
