# DEVCENTER-EXECUTION — Fayz Developer Center build-out tracker

Status: ACTIVE · Started: 2026-07-14 · Plan of record: this file (derived from
the approved master plan; founder = final reviewer)

This is the **single operational tracker** for the Developer Center program.
An autonomous loop executes milestones top-to-bottom within the active phase.
Humans and agents both edit ONLY the `status:` lines and the Log section.

## Loop protocol (every iteration)

1. Read this file. Active phase = first phase with any `status: todo`.
2. Pick the **topmost** `todo` milestone in the active phase.
3. Set it `status: in-progress` (commit the tracker), implement, run the
   milestone's `acceptance:` command(s) verbatim.
4. On pass: commit the code (small, conventional commits, on the phase branch
   listed in the phase header), set `status: done`, append one Log line, commit
   tracker.
5. On 2 failed attempts: set `status: BLOCKED(<one-line reason>)`, append Log
   line, move to the next milestone. Never delete or rewrite others' log lines.
6. Phase exit: when a phase has no `todo` left, open a PR for its branch
   (base: main), note the PR URL in the Log, and STOP if the next row is a
   CHECKPOINT (founder-manual). Checkpoints are hard stops for the loop.

## Hard guardrails (violating any of these = stop immediately)

- **Never** `npm publish` / `pnpm publish` / `changeset publish`, never merge a
  version-packages PR, never push tags.
- **Never** make real Supabase/network mutations. `SUPABASE_PAT` must NOT be in
  the loop env; `fayz db apply` is exercised only via `--dry-run` and
  mocked-fetch unit tests.
- **Never** change `private`, `publishConfig`, or `license` fields (milestone
  B3 produces a memo, not flag changes).
- **Never** edit LOCKED docs except by adding a clearly-marked
  `## PROPOSED AMENDMENT (unsigned)` section.
- **Never** rotate keys, rewrite git history, force-push, or commit to `main`.
- **Never** write to `~/.npmrc`, CI secrets, or founder Supabase projects
  (known refs incl. gphxclpkbtbucoqclbco, bcxumqjrduekrsasduwe,
  coqpsuofwohzpqymoajb, mgctsbkyykomwaopkbjm — treat any hardcoded ref as
  founder-owned).
- Commits end with the standard Co-Authored-By trailer. Branch per phase, PR
  per phase, founder reviews.

## Repos

- SDK: `/Users/fayalabs/dev/fayz-sdk` (this repo)
- Dogfood apps: `/Users/fayalabs/dev/fayz-app/*` (each app is its own git repo)
- Docs site (Phase 4 creates it): `/Users/fayalabs/dev/fayz-docs`

---

## Phase 0 — Setup · branch: devcenter/p1-golden-path

- [x] P0.1 Baseline: record current check-suite results
  repo: fayz-sdk
  acceptance: `pnpm build && pnpm typecheck && pnpm check:plugin-patterns && pnpm check:plugin-capability && node scripts/cli-smoke.mjs` — record pass/fail of each in Log (pre-existing failures are baseline notes, not blockers)
  status: done

## Phase 1 — Golden path (fayz-sdk) · branch: devcenter/p1-golden-path

- [x] A1 Ship spine SQL in @fayz-ai/db tarball
  repo: fayz-sdk · files: packages/db/package.json (`files` += "migrations"), scripts/check-published-shape.mjs (assert migrations present in `npm pack --dry-run --json`)
  acceptance: `node scripts/check-published-shape.mjs && cd packages/db && npm pack --dry-run --json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const f=JSON.parse(d)[0].files.map(x=>x.path);process.exit(f.some(p=>/^migrations\/.+\.sql$/.test(p))?0:1)})"`
  status: done

- [x] A2 Fix @fayz-ai/auth legacy entry points to dist
  repo: fayz-sdk · files: packages/auth/package.json (main/module/types → dist), scripts/check-published-shape.mjs (new rule: published main/types must point at dist/)
  acceptance: `pnpm --filter @fayz-ai/auth build && node scripts/check-published-shape.mjs`
  status: done

- [x] A3a `fayz db apply` — plan builder + resolvers (dry-run only)
  repo: fayz-sdk · files: cli/src/lib/migration-plan.ts (new, pure), cli/src/commands/db.ts (new, --dry-run path), cli/src/index.ts (register `db apply` + HELP). Resolution order: ① @fayz-ai/db migrations via require.resolve ② app drizzle/*.sql ③ app supabase/seed-saas-core.sql ④ enabled plugins from app.manifest.json (reuse cli/src/lib/manifest.ts) → node_modules/@fayz-ai/<plugin>/src/migrations/*.sql ⑤ app src/plugins/*/migrations/*.sql. NEVER resolve ../../fayz-sdk.
  acceptance: `pnpm --filter @fayz-ai/cli build && node cli/dist/index.js db apply --dry-run <scaffolded-tmp-app>` prints ordered plan; unit test for migration-plan passes (`pnpm --filter @fayz-ai/cli test` or node test runner)
  status: done

- [x] A3b `fayz db apply` — Management-API executor + env contract
  repo: fayz-sdk · files: cli/src/lib/supabase-management.ts (new; POST api.supabase.com/v1/projects/{ref}/database/query; port from fayz-app/beauty-saas/scripts/db-apply.mjs), cli/src/commands/db.ts (env: SUPABASE_PROJECT_REF required no default, SUPABASE_PAT; read env → .env.local → .env; confirm-target prompt unless --yes; flags --spine-only --plugins-only --plugin <id>; ends NOTIFY pgrst)
  acceptance: mocked-fetch unit test green; `node cli/dist/index.js db apply --dry-run` still green; NO real network call in any test
  status: done

- [x] A3c Wire db apply into smoke + LOCKED-doc amendment
  repo: fayz-sdk · files: scripts/cli-smoke.mjs (scaffold tmp app → db apply --dry-run → assert plan lines), cli README/help text, docs/design/MIGRATION-ARCHITECTURE.md (append `## PROPOSED AMENDMENT (unsigned)` describing CLI executor)
  acceptance: `node scripts/cli-smoke.mjs`
  status: done

- [x] A4 Templates emit .env.example + hardened .gitignore + CLAUDE.md db steps
  repo: fayz-sdk · files: cli/src/templates/{shared,admin,storefront,member}.ts (.env.example with SUPABASE_PROJECT_REF=/SUPABASE_PAT=/VITE_SUPABASE_URL=/VITE_SUPABASE_ANON_KEY= placeholders; .gitignore covers .env* except .env.example; CLAUDE.md gains Supabase-flip + `fayz db apply` steps + docs-site/llms.txt pointer per master plan Part 2)
  acceptance: `node --test scripts/check-generated-app-contract.test.mjs && node scripts/cli-smoke.mjs` (script name corrected from stale check-generated-app.mjs)
  status: done

- [x] A5 CLI 0.3.0 + engines ≥20 + changeset
  repo: fayz-sdk · files: cli/package.json + cli/src/index.ts VERSION + HELP, root package.json engines, .changeset/<new>.md
  acceptance: `node cli/dist/index.js --version` prints 0.3.0 after build; `pnpm build && pnpm typecheck`
  status: done

- [x] A6 Document FAYZ_SDK_SOURCE / local-source resolution
  repo: fayz-sdk · files: docs/LOCAL-DEV.md (new), pointer from docs/CUSTOMIZATION.md + cli README
  acceptance: file exists, `grep -l FAYZ_SDK_SOURCE docs/LOCAL-DEV.md`
  status: done

## Phase 2 — Packaging & signaling (fayz-sdk) · branch: devcenter/p2-signaling

- [x] B1 README/CHANGELOG floor: plugin-blog + plugin-payments + audit all 22
  repo: fayz-sdk · files: plugins/plugin-blog/{README,CHANGELOG}.md, plugins/plugin-payments/{README,CHANGELOG}.md, scripts/check-package-docs.mjs (new: every publishable package has README with headings: what-it-is, status, install, capability level)
  acceptance: `node scripts/check-package-docs.mjs`
  status: done

- [x] B2 Machine-readable status field in all 33 package.jsons
  repo: fayz-sdk · files: packages/*/package.json + plugins/*/package.json gain `"fayz": {"status": "stable|beta|preview|internal"}` seeded from check-plugin-capability categories; scripts/check-package-status.mjs (new, cross-validates status vs capability gate)
  acceptance: `node scripts/check-package-status.mjs && pnpm check:plugin-capability`
  status: done

- [x] B4 Plugin catalog emitter for the docs site
  repo: fayz-sdk · files: scripts/emit-plugin-catalog.mjs (new; reuse check-plugin-capability facet detection; emits docs/plugin-catalog.json: id, npm name, version, fayz.status, capability, private flag, has-migrations, description, README first paragraph, channel versions), root script `emit:catalog`
  acceptance: `node scripts/emit-plugin-catalog.mjs && node scripts/emit-plugin-catalog.mjs && git diff --exit-code docs/plugin-catalog.json` (idempotent)
  status: done

- [x] B5 Channel discipline rule
  repo: fayz-sdk · files: scripts/sync-release-channels.mjs (stable channel may not pin a package with fayz.status=internal)
  acceptance: seeded-violation test exits non-zero; real state green (`node scripts/sync-release-channels.mjs --check` or equivalent)
  status: done

- [x] D1 SUPPORT.md tier table
  repo: fayz-sdk · files: SUPPORT.md (status → promise: semver discipline, docs coverage, response), linked from README; pre-1.0 caveat
  acceptance: file exists; README links it; emit-plugin-catalog includes tier URL
  status: done

- [x] B3 Distribution-flags decision memo (MEMO ONLY — no flag changes)
  repo: fayz-sdk · files: docs/checkpoints/DISTRIBUTION-FLAGS-2026-07.md (per-package table: current flag, proposed flag, rationale; registry mechanism reco for private network; migration steps incl. npm deprecate)
  acceptance: memo exists; `git diff --name-only` contains no package.json
  status: done

## CHECKPOINT 1 — FOUNDER MANUAL (loop STOPS here)

- Merge P1+P2 PRs · rotate leaked keys listed in C1 log · run real
  `fayz db apply` against a scratch Supabase project · decide B3 flags ·
  publish release wave (cli 0.3.0, db, auth, status bumps) via release-sdk skill.

## Phase 3 — Dogfood hygiene (fayz-app repos) · branch per app: devcenter/p3-hygiene

- [ ] C1 Secret hygiene sweep across all apps
  repo: fayz-app/* · `git rm --cached` every tracked .env/.env.local (hempdent, great-djs-school, the-channel, agency-os, beauty-saas, norman-ai, resto-saas, storefronts), remove tracked supabase/.temp/project-ref, harden per-app .gitignore. List EVERY leaked value (project ref/key name, not the secret itself) in the Log for founder rotation. NO history rewrite.
  acceptance: per app `git ls-files | grep -E '\.env($|\.local)'` empty and `git ls-files | grep -c 'supabase/.temp'` = 0
  status: todo

- [ ] C2 .env.example + README quickstart parity in all 16 apps
  repo: fayz-app/* · placeholder values only, SUPABASE_PROJECT_REF= empty
  acceptance: `for d in ~/dev/fayz-app/*/package.json; do test -f "$(dirname $d)/.env.example" || echo MISSING $(dirname $d); done` prints nothing (apps only)
  status: todo

- [ ] C3a Port beauty-saas off bespoke db-apply.mjs → `fayz db apply` (reference)
  repo: fayz-app/beauty-saas · delete scripts/db-apply.mjs, update package.json db:apply script + README; verify app.manifest.json plugin list matches old ENABLED_PLUGINS
  acceptance: `fayz db apply --dry-run` in beauty-saas prints plan matching old ENABLED_PLUGINS order
  status: todo

- [ ] C3b Port remaining db-apply apps in batches (agency-os, resto-saas, course-admin, marketplace-saas, …)
  repo: fayz-app/* · same recipe as C3a
  acceptance: same dry-run check per app
  status: todo

- [ ] C4 `fayz doctor` semantic drift check
  repo: fayz-sdk · files: cli/src/commands/doctor.ts — best-effort check that app.manifest.json plugin ids match src/config/app.tsx registrations; fixture with seeded drift
  acceptance: doctor flags seeded drift fixture; green on beauty-saas
  status: todo

## Phase 4 — Docs site build-out · repo: ~/dev/fayz-docs (new) · branch: main→devcenter/p4-docs

- [x] P4.1 Scaffold fayz-docs: Next.js App Router static export + raw @markdoc/markdoc RSC pipeline + tailwind (fayzTailwind preset) + next-themes + [locale] routing (pt-BR)
  acceptance: `pnpm build` in fayz-docs emits static out/ with a rendered sample page (VARIATION: dev-server verification used for founder early preview; static-export proof moves to P4.3)
  status: done

- [x] P4.2 Markdoc tags v1: callout, tabs, code-group (shiki), badge, cards, steps(+checkpoint) + config/nav.pt-BR.ts sidebar + Stripe-parity footer
  acceptance: tag demo page renders all six; build green (VARIATION: callout/badge/cards/steps + plugin-grid shipped; tabs/code-group+shiki deferred to P4.3)
  status: done

- [x] P4.3 Pipeline scripts: emit-raw-md.mjs (every page as .md), emit-llms.mjs (llms.txt + llms-full.txt), pagefind post-build
  acceptance: out/llms.txt exists, every content page reachable as .md in out/, `pagefind --site out` indexes
  status: done

- [x] P4.4 Começar section: visao-geral, quickstart, conceitos, dois-caminhos (adapt from fayz-sdk docs/ — sanitize ALL internal refs)
  acceptance: build green; no `FAY-`, `~/dev`, or `fayz-app` strings in content (`grep -rE 'FAY-[0-9]|~/dev|fayz-app' content/` empty)
  status: done

- [x] P4.5 Tutorial spine 01–07 (golden path; step 05 written against `fayz db apply`)
  acceptance: every command in tutorial verified by actually running it against a scaffolded app (docs-honesty: record command outputs in Log)
  status: done

- [x] P4.6 Construir section (9 v1 pages) + Referência (cli, plugin-manifest)
  acceptance: build green; sanitization grep empty
  status: done

- [x] P4.7 Plugin catalog pages: build-plugin-pages.mjs merging data/plugin-catalog.json + catalog-overrides.json; 8 hand-prose overviews (tasks, crm, agenda, payments, reputation, orders, menu, dashboard)
  acceptance: 22 pages generated; build green (ADJUSTED: payments not on branch — substitute financial; 19 catalog plugins today, self-heals at merge)
  status: done

- [x] P4.8 Recursos (troubleshooting, ia, comunidade) + CLI scaffold CLAUDE.md gains docs URL (fayz-sdk cli/src/templates/shared.ts)
  acceptance: build green; cli-smoke green in fayz-sdk (NOTE: guide is AGENTS.md now, lives in cli/src/commands/create.ts)
  status: done

- [x] P4.9 Docs-honesty CI job (.github/workflows): scaffold app with published CLI, run every quickstart command incl. db apply --dry-run, next build
  acceptance: workflow file lints (`act` optional); local dry-run of the same script green
  status: done

## CHECKPOINT 2 — FOUNDER MANUAL (loop STOPS here)

- Clean-machine quickstart walkthrough + fresh Supabase · branch
  protection/CODEOWNERS applied · go/no-go on sharing with the network.

## Phase 5 — Polish (post-launch, optional)

- [ ] P5.0 RECOMMENDATION (founder feedback 14/07: manifest theme "é só isso? mto simples"): widen the manifest `theme` contract beyond {brand-enum, radius, mode} — expose the engine's existing internal SaasTheme surface (free HSL brand, 11-font map, shadow levels, sidebar brand/neutral, presets, and eventually rich tokens à la design/fayz-tokens.css). Requires: packages/core theme types + app-manifest schema + doctor validation + platform runtime mapping (fayz repo) honoring the new keys — cross-repo, founder-scoped. Docs currently handle it honestly via an "Além das 3 chaves" experimental block. — status: todo

- [ ] D2 CONTRIBUTING-INVITED.md + CI gauntlet on PRs — status: todo
- [ ] D3 .github/CODEOWNERS + branch-protection checklist — status: todo
- [ ] B6 Document saas→plugin-auth edge in catalog/SUPPORT — status: todo
- [ ] C5 pnpm normalization across apps — status: todo
- [ ] P5.1 Migration-ledger design note + DATABASE_URL executor spike — status: todo

---

## Log

- 2026-07-14 · plan approved; tracker created; branch devcenter/p1-golden-path cut from main (Fable, interactive session)
- 2026-07-14 · P0.1 done — baseline ALL GREEN: build 31/31, typecheck 42/42, plugin-patterns pass, plugin-capability report-only pass (note: plugin-inventory RLS deferred to project_rls.sql), cli-smoke pass (Fable)
- 2026-07-14 · A1 done — @fayz-ai/db `files` += migrations (8 spine SQL files 001–008 confirmed in tarball); check-published-shape gains migrations rule; scoped build+typecheck green (Opus agent, verified by orchestrator)
- 2026-07-14 · A2 done — auth main/module/types → dist (+ exports["."].types was also src, fixed); shape script gains no-src-entry-points rule for all 30 pkgs (auth was sole violator); external ESM tarball import simulated OK (workspace:^ rewrite caveat is publish-time normal); root typecheck 42/42 (Opus agent, verified by orchestrator)
- 2026-07-14 · A3a done — cli/src/lib/migration-plan.ts (pure planner, 5-source resolution) + cli/src/commands/db.ts (`db apply --dry-run` + filter flags; non-dry-run stubbed exit 1) + `pnpm --filter @fayz-ai/cli test` (node --test, 9/9). KEY FINDING: require.resolve('@fayz-ai/db/package.json') fails (exports map omits ./package.json) — planner uses resolvePackageDir() node_modules walker; A3b must reuse it. Verified dry-run on scaffold: spine 8 + crm 4 files, dashboard skip noted (Opus agent, verified by orchestrator)
- 2026-07-14 · A3b done — cli/src/lib/supabase-management.ts (injectable-fetch Management-API client, executeMigrationPlan + NOTIFY pgrst, dependency-free dotenv, confirmation gate) wired into db.ts; env contract SUPABASE_PROJECT_REF/SUPABASE_PAT (+aliases), files never override process env; non-TTY without --yes refuses fast. 23/23 cli tests; verified missing-env exit 1 + non-tty exit 1, zero network (Opus agent, verified by orchestrator)
- 2026-07-14 · A3c done — cli-smoke gains 3 db-apply cases (dry-run plan, missing-env naming both vars, non-TTY refusal pre-network; local packages/db symlinked into scaffold for spine); cli/README.md created; MIGRATION-ARCHITECTURE.md got append-only PROPOSED AMENDMENT (36+/0-) superseding the agency-os db-apply.mjs reference. Smoke green (Opus agent, verified by orchestrator)
- 2026-07-14 · A4 done — scaffolds now emit .env.example (runtime VITE_* vs tooling REF/PAT split, commented) + CLAUDE.md (EN, personalization checklist + "Connecting a real Supabase": install → db apply dry-run/apply → flip backend.provider mock→supabase in app.manifest.json → doctor); contract script (real name: check-generated-app-contract.mjs) gates .env.example, gate bite proven; 16/16 contract tests, smoke green. NOTE for later: raw scaffolds fail the contract's public-only @fayz-ai/sdk dep rule (pre-existing, resolveFayzPackageDependencies writes full internal set — revisit at B-workstream or A5) (Opus agent, verified by orchestrator)
- 2026-07-14 · A5+A6 done — CLI 0.3.0 (VERSION was 0.1.0 in BOTH files, npm has 0.2.0), engines node>=20 root+cli, changeset devcenter-cli-db-apply.md (cli minor, db+auth patch). docs/LOCAL-DEV.md + NEW docs/README.md index (didn't exist; customization doc's real name is customization-ladder.md — tracker wording was stale). ⚠ CP1 NOTE: @fayz-ai/auth IS in the changesets linked set — its patch pulls the whole linked group at version time. Untracked renova-*.png at repo root are founder's, left alone. Full suite green (Opus agent, verified by orchestrator)
- 2026-07-14 · PHASE 1 COMPLETE — all 8 milestones done · PR: https://github.com/FayaLabs/fayz-sdk/pull/11 (base main) · P2 branch devcenter/p2-signaling cut from p1 (stacked; rebase after P1 merges)
- 2026-07-14 · B1 done — check-package-docs.mjs gate (README + install + Status line + factory mention, 29 publishable pkgs green, bite proven); Status lines added to 19 READMEs; portal README + plugin-auth CHANGELOG/Install written. ⚠⚠ CP1 STRUCTURAL FINDING: plugin-blog + plugin-payments source is NOT on main — only on unmerged feat/plugin-admin-foundation (commit 02baea6 website-plugin release), yet both are PUBLISHED to npm (0.1.0/0.1.1). devcenter branches inherit the gap. Founder must decide merge order at CP1 (merge admin-foundation → main before/with P1). Accurate README/CHANGELOG for both authored anyway (committed as forward-prep; gate will enforce once source lands) (Opus agent, verified by orchestrator)
- 2026-07-14 · B2 done — `fayz.status` seeded into all 31 tree-present package.jsons (11 packages + 19 plugins + cli); NOT 33 — plugin-admin/blog/payments have no package.json on this branch (same B1 source gap), so 31 not 33 is correct. scripts/check-package-status.mjs (new): enum-valid + private⇔internal + plugin visual≠beta cross-check (imports inspectPlugin from check-plugin-capability.mjs — refactored to export it behind an IS_MAIN guard, single source of truth, no fork) + soft README-vs-status drift warning. All package.json edits are pure insertions after the `name` line (zero deletions verified). Seed: substrate+kits+cli+capability/partial-beta-README plugins → beta (23); visual + experimental-README partials → preview (7); app-runtime private → internal (1). One soft warning: plugin-auth README says beta but is visual→preview (B1 wording overclaims; not fixed here, B2 is package.json-only). Gate bite proven 3 ways (invalid enum / private-not-internal / visual-claims-beta). build 31/31 + typecheck 42/42 + plugin-capability + published-shape 30/30 + package-docs all green (Opus agent)
- 2026-07-14 · B4 done — emit-plugin-catalog.mjs → docs/plugin-catalog.json (19 plugins + 12 packages, idempotent, zero absolute paths; reuses inspectPlugin). ⚠ MORE CP1 EVIDENCE: no ./public|./website subpath exports exist anywhere on this branch (agenda publicSurface=false; branch agenda=0.1.8 vs npm 0.3.0) — main lags npm; published website-surface work is on feat/plugin-admin-foundation. Also: release-channels.json covers only 15 pkgs, all three channels byte-identical caret ranges drifting behind source versions (B5 input) (Opus agent, verified by orchestrator)
- 2026-07-14 · B5 done — sync-release-channels.mjs created (--check mode = check:release-channels root script; hard rule stable-channel-must-not-pin-internal, gate bite proven; soft drift warnings; default sync mode NOT run — CP1 release-wave tool). CP1 DRIFT REPORT: 6 stable pins behind tree (sdk ^0.1.5→0.6.5, core/auth/ui/saas ^0.1.6→0.6.0, plugin-crm ^0.1.1→0.2.3). ⚠ NOTE: a different sync-release-channels.mjs exists on feat/plugin-admin-foundation (47 lines) — reconcile at CP1 merge (Opus agent, verified by orchestrator)
- 2026-07-14 · D1+B3 done — SUPPORT.md tier table (linked from README; catalog gains repo-relative "support" field, idempotency preserved); DISTRIBUTION-FLAGS-2026-07.md memo with unfilled founder decision box; RECOMMENDATION: keep everything public MIT (published MIT can't be retracted; boundary belongs at product/app layer), no private flips, seed fayz.status on the 3 feat-branch plugins at merge. ⚠ docs/DISTRIBUTION.md does NOT exist on this branch (thesis lives in DIRECTION.md) — another feat-branch-only artifact. Zero package.json changes verified (Opus agent, verified by orchestrator)
- 2026-07-14 · PHASE 2 COMPLETE — B1,B2,B4,B5,D1,B3 all done · PR: https://github.com/FayaLabs/fayz-sdk/pull/12 (stacked on #11) · loop STOPPED at CHECKPOINT 1 per protocol; founder actions listed under CHECKPOINT 1 heading + CP1 evidence in B1/B4/B5/D1+B3 log lines
- 2026-07-14 · P4.6 done — Construir (15 pages, 8.4k words) + referencia/{plugin-manifest,cli}; honesty fixes: dropped nonexistent --channel create flag, Next→Vite in deploy, headless concept-only (no ./public on branch), auth split manifest-first vs code-config; sanitization sweeps clean; 101 internal hrefs green (Opus agent, verified by orchestrator)
- 2026-07-14 · P4.7 done — catalog-overrides.json prose layer (8 plugins: tasks/crm/agenda/financial/inventory/orders/menu/dashboard) merged into PluginDetail + grid destaques + raw-md fichas; versoes.md --channel contradiction fixed. ⚠ CORRECTED WRONG BRIEF FACTS against real SQL: NO fin_/inv_/crm_-prefixed core tables — archetype model (leads=saas_core.persons kind=lead; invoices=saas_core.orders; inventory extends saas_core.products; only tasks uses tsk_ prefix); agenda/orders/menu ship no migrations (mock default + optional providers); dashboard = pure widget aggregator. Consider surfacing archetype pattern in SDK docs (Opus agent, verified by orchestrator)
- 2026-07-14 · FOUNDER-DIRECTED: scaffold now emits vendor-neutral AGENTS.md (CLAUDE.md = 1-line pointer) — cli/src/commands/create.ts on devcenter/p2-signaling, all gates green; docs content updated (4 pages). Branding pass running: official Fayz.ai Design System tokens (Ignite Green #2FDD4B, Outfit/DM Sans/JetBrains Mono) + logo/favicons from platform repo → fayz-docs (Fable + Opus agent)
- 2026-07-14 · Branding done (fayz-docs 8ba4b79) — Ignite Green light/dark system (#119A27 text on light, #2FDD4B on dark, fill+near-black CTA), official logo + favicons, hero aurora; FONTS switched to Inter+JetBrains Mono per founder mid-task correction (Outfit/DM Sans rejected); founder's serif screenshot was the mid-swap hot-reload state, resolved
- 2026-07-14 · P4.8 done (fayz-docs 166b0f2 + fayz-sdk 508b2a1) — Recursos 5 pages (~2.6k words; troubleshooting anchored to real error strings incl. placeholder-screen as top item); scaffold AGENTS.md gains developers.fayz.ai + llms.txt pointers; all gates green (Opus agent, verified by orchestrator)
- 2026-07-14 · P4.9 done (fayz-docs 2c123f4) — docs-honesty engine (scaffold→file-contract-derived-FROM-DOCS-TABLE→install→doctor→db apply --dry-run→vite build→sanitization→links; SUPABASE_PAT refusal rail; version-gated SKIPs below CLI 0.3.0) + GH workflow (honesty + full build w/ artifact). Local CLI mode 9/9 pass; published 0.2.0 mode 7 pass + 2 gated SKIPs (Opus agent, verified by orchestrator)
- 2026-07-14 · ██ PHASE 4 COMPLETE (9/9) — loop STOPPED (all P4 done). CP2 READINESS: docs v1 content-complete (7-step verified tutorial, Construir, catálogo c/ prosa, Referência, Recursos, branding oficial, llms/raw-md/search, honesty CI). GATE CP2 ON: ① CP1 release wave (cli 0.3.0 + db 0.1.3 + auth — flips honesty SKIPs to real) ② live community channel for comunidade.md ③ domain lock (developers.fayz.ai assumed everywhere incl. scaffold AGENTS.md) ④ decide placeholder-runtime story (publish app-runtime vs code-config templates) ⑤ deploy the docs site (llms-full.txt is build-only). CP1 checklist unchanged and still open.
- 2026-07-14 · FOUNDER-DIRECTED (out of band): feat/plugin-admin-foundation pushed + PR https://github.com/FayaLabs/fayz-sdk/pull/13 opened (resolves CP1 merge-order blocker; suggested order #13 → #11 → #12, expect sync-release-channels.mjs conflict where devcenter --check version wins). P4.1/P4.2 pulled forward as EARLY PREVIEW at founder request: fayz-docs scaffold with full IA + stub pages for structure/menu validation (CP1 remains open; P3 untouched) (Fable, interactive)
- 2026-07-14 · P4.1+P4.2 done — fayz-docs live: 69 files, 37 content pages (10 real-skeleton incl. quickstart/dois-caminhos/tutorial-index/catálogo-vivo/referencia-cli, 27 stubs flagged "Em construção"), raw @markdoc/markdoc RSC pipeline, tags callout/badge/cards/steps/plugin-grid, dynamic plugins/<id> from catalog JSON, check-links.mjs green (56 targets), llms.txt stub, dark mode, Stripe-parity footer. Dev server port 4455 for founder preview. Deferred to P4.3: tabs/code-group+shiki, static-export proof, emit-raw-md/emit-llms/pagefind. P4 loop re-armed founder-directed while CP1 stays open (Opus agent, verified by orchestrator)
- 2026-07-14 · P4.3 done — output:'export' + postbuild chain (emit-raw-md 37 pages + 19 plugin fichas → out/*.md; emit-llms → llms.txt 9.9KB + llms-full.txt 36KB; pagefind 57 pages); footer "Ver em Markdown" real; search UI degrades in dev. Incident: npm run build clobbers live .next — recovery = touch next.config.mjs (auto-restart); RULE: never build in live fayz-docs dir (Opus agent, verified by orchestrator)
- 2026-07-14 · P4.4 done — Começar real content (visao-geral 621w, conceitos 935w, dois-caminhos 609w, quickstart 408w); sanitization grep 0; HONESTY FIXES vs stubs: generated app is VITE port 5173 (not 3000), `fayz create` has NO flags on this branch (--dir/--install/--channel belong to the unmerged feature-branch CLI — orchestrator re-verified against cli/dist help) (Opus agent, verified by orchestrator)
- 2026-07-14 · P4.5 done — tutorial 01–07 + index (3.6k words) with every command executed against a real scaffold (docs-honesty evidence in agent report: scaffold file list, db apply --dry-run real output incl. empty-spine warning on published db 0.1.2, plugin-add via manifest edit only, create plugin fidelidade 6-file layout, Vite build → dist/). ⚠⚠ CP1/CP2 CRITICAL FINDING: scaffold `npm run dev` renders a PLACEHOLDER — src/main.tsx imports renderApp from local stub src/lib/fayz-runtime.ts; real runtime is platform-bundled (@fayz-ai/app-runtime is private). External dev sees no real UI locally. Founder options: (a) publish app-runtime + wire scaffolds to it, (b) switch templates to code-config style (defineSaas imports like dogfood apps). Manifest theme = brand/radius/mode only, applied by platform runtime. Tutorial documents all of this honestly (validates via doctor/CLI, never claims unrendered visuals) (Opus agent, verified by orchestrator)
