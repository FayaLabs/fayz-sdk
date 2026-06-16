# ROADMAP — Gaps, risks, and the next two weeks

> Actionable plan. **2026-06-16.** Companion: [STATE.md](STATE.md), [PLUGIN-MODEL.md](PLUGIN-MODEL.md).

---

## 1. The gaps that block "lock it and scale to thousands"

Ranked by leverage (highest first). Each is finite — none is "rebuild the foundation."

| # | Gap | Why it blocks scale | Where |
|---|---|---|---|
| **G1** | **Plugin capability contract is declared-but-not-executed.** `entities`/`permissions`/`migrations` are metadata nothing runs. Install = UI + mock, not a provisioned backend. | You can't trust "install" to produce a governed capability → can't open to community, can't promise tenants real data. | `core/src/types/plugins.ts`, `core/src/plugin/runtime.ts` |
| **G2** | **Marketplace→app registration seam is a stub.** `plugins.generated.ts` says "Fayz will inject plugin factory registrations here" — not dynamic. | Marketplace install flips the manifest flag, but AI-generated projects don't auto-register the plugin factory + migrations. The seam between the two halves of the platform. | `fayz/.../scaffold/template/src/plugins.generated.ts` |
| **G3** | **Zero plugin tests.** | No plugin can claim a *verified* end-to-end capability. Foundation can't be "locked" on faith. | all `plugins/*` |
| **G4** | **Payment unimplemented.** No MercadoPago/Pix/gateway/webhook. | The commerce vertical — the flagship proof — can't take money. | `shop`, `storefront`, `sdk/src/shop.ts` |
| **G5** | **Version + source-alias drift.** Apps pin `@fayz-ai/sdk ^0.1.3`; SDK builds `0.1.5`/`0.1.0`; apps run off Vite source aliases, not published packages. | The published-package path (what real customer apps will use) is unverified. | `fayz-app/*/package.json`, `fayz-app/*/vite.config.ts` |
| **G6** | **Two parallel SaaS shells** (`createFayzApp` native vs `createSaasApp` legacy) mid-migration. | Duplicated nav/route/settings logic; every change is done twice; ambiguity for the AI generating configs. | `packages/saas/src/app/*` vs `packages/saas/src/shell/*` |
| **G7** | **Migrations exist but aren't applied or manifest-wired** (only `plugin-tasks` wires them; nothing runs the SQL). | Schema provisioning is manual → defeats "install a capability." Subset of G1 but worth its own track. | `plugins/{crm,financial,inventory,forms}/src/migrations/*` |
| **G8** | **Shop type duplication + broker 501s.** `sdk/src/shop.ts` redefines types; broker implements only 3 read methods. | The reference contract drifts and the broker (the production data path) is hollow. | `sdk/src/shop.ts` |
| **G9** | **Permissions permissive-by-default** (`profileHasPermission` returns `true` when no profile set). | Fine for single-user dev; unsafe for agency multi-tenant. | `packages/saas/src/permissions/context.tsx:16` |

---

## 2. What's explicitly NOT a gap (stop worrying about these)

- **"Fayz Core / AI builder doesn't exist."** It does, and it's production-grade. ([STATE.md §2.1](STATE.md))
- **"The marketplace is just cards."** Install mutates the real `ProjectAppManifest`. ([STATE.md §2.1](STATE.md))
- **"The design system / shell is shallow."** ~26 primitives, real CRUD engine, real multi-tenant org model, strong theming. ([STATE.md §2.2](STATE.md))
- **"We need more public packages."** No — one public package is locked and correct. Resist sprawl. ([28-proof-first-route-lock.md](28-proof-first-route-lock.md))

---

## 3. The next two weeks — one vertical slice, fully wired

**Theme: turn "install" into "a real, tested, governed capability is now live."** Prove it on `plugin-tasks` (smallest real, already migration-wired), then `shop` (money + multi-tenant). Do **not** broaden to all 18.

### Week 1 — Lock the contract on the reference plugin

- **D1–2 · Define `PluginCapabilityContract`.** Make `entities` bind to real `EntityDef` + a provider; require manifest-wired `migrations`; make `permissions` enforced grants. Write it as a spec doc + the TypeScript types. Don't refactor 18 plugins yet — just the type + one plugin.
- **D2–3 · Install-time migration runner.** A function that applies a plugin's manifest-declared migrations (idempotent, versioned) when a plugin is enabled in a manifest. Wire `plugin-tasks` end-to-end: enable → tables exist → seed applied → permissions granted.
- **D3–4 · First plugin test.** End-to-end slice test for `plugin-tasks`: enable plugin → provider persists → permission denies unauthorised action → seed renders. This is the template for every future plugin.
- **D4–5 · `check:plugin-capability` gate.** Fails any plugin missing entity↔provider binding, manifest-wired migrations, enforced permissions, seed, or the e2e test. Run it; let `plugin-tasks` be the only green one for now.

### Week 2 — Prove it under money + close the registration seam

- **D6–7 · Close G2.** Make `plugins.generated.ts` registration dynamic from the manifest's enabled plugins (factory + migrations + seed registered on install). This joins the marketplace install to a real capability in generated apps — the foundation lock.
- **D7–8 · Shop: kill the 501s + de-dupe types.** Finish the broker provider for writes/orders/customers/discounts; make `sdk/src/shop.ts` import `@fayz-ai/shop/types` instead of redefining them.
- **D8–10 · Payment (G4).** Implement the MercadoPago/Pix path behind `payments.mode: 'pix-mercadopago'` (server-side charge + webhook → order `paid`). This is the single biggest unlock for the commerce proof. Keep the gateway server-side in Fayz (trust boundary).
- **Continuous · G5 verification.** One CI job that builds a dogfood app against the **published** packages (not source aliases) and reconciles version pins. Even if it just fails loudly, it surfaces the drift.

### Deliberately deferred (named so they're not silently dropped)

- Refactoring all 18 plugins to the capability contract (do after the gate + reference exist).
- Consolidating the two SaaS shells (G6) — high value but big; schedule as its own slice once the contract work lands.
- Dynamic marketplace catalog derived from manifests (G1 follow-on).
- Community submission backend, plugin certification.
- Collapsing the 3 visual-only plugins into one factory (quick win, do opportunistically).

---

## 4. Linear board — audit + grooming (read live 2026-06-16)

The `fayz-sdk` Linear project (`337cbb5c`, FAY team) holds **27 issues** and is **well-groomed and low-noise** — 4 coherent epics that map ~1:1 to the architecture lock. Status: 4 Done · 1 In Progress · 4 In Review · 7 Todo · 8 Backlog · 3 Canceled. The old March-era `@fayz/` plugin tickets (FAY-924/926/938/939) were already cleanly canceled in the proof-first pivot — no stale noise to delete.

**The board reflects what we're building. Its one blind spot is the foundation lock itself:** it tracks the *manifest*, *shop*, and *customization* seams thoroughly but has **no ticket for the Plugin Capability Contract** (G1/G2/G3) and **no payment ticket** (G4). Ironically the canceled **FAY-926** ("Plugin SDK: createPlugin, manifest, registry, schema/migrations, permissions") *was* the capability-contract ticket; the concept needs reviving, reframed for proof-first (one plugin end-to-end, not a public plugin SDK).

Existing epics (keep — all aligned):

| Epic | Children | Maps to |
|---|---|---|
| **FAY-1178** render Panel from DB-backed AppManifest *(In Review)* | 1200, 1201 (+done 1179/1180) | manifest hinge |
| **FAY-1185** proof-first dogfood sequence *(Todo)* | 1186, 1187, 1188, 1189, 1199 | proof-first lock |
| **FAY-1196** app-owned customization foundation *(Todo)* | 1191, 1192, 1194 | the escape valves |
| **FAY-1190** Shop commerce primitives + broker *(Todo)* | 1193, 1195, 1197, 1198, 1202 | reference contract / G8 |
| standalone | 1181/1183/1184 (public surface/versions — G5), 1182 (trust), 1162 (urgent runtime bug) | |

**Tickets to create** (fill the blind spot — covered by existing epics where noted):

1. **`Plugin Capability Contract + check:plugin-capability gate`** (G1/G3/G7) — *new epic, or under FAY-1196.* Revives the intent of canceled FAY-926.
2. **`Install-time migration runner + dynamic plugin registration`** (G2) — closes marketplace→app seam.
3. **`plugin-tasks: canonical capability reference + first e2e test`** (G3) — the template.
4. **`Payments: MercadoPago/Pix server-side charge + webhook`** (G4) — under FAY-1190.
5. *(backlog)* **`Consolidate the two SaaS shells`** (G6); **`Harden multi-tenant permissions, deny-by-default`** (G9).

Already covered, no new ticket needed: G5 → FAY-1183 + FAY-1199; G8 → FAY-1197 + FAY-1198/1202.

---

## 5. Keeping this audit alive (local routine)

This audit is a living state, not a one-shot. To keep it current without redoing the whole sweep:

- **Source of truth:** these three docs (`STATE`, `PLUGIN-MODEL`, `ROADMAP`) + the durable decision docs they link. Update `STATE.md` whenever a layer's maturity changes; check items off §3 here as they land.
- **Optional automation:** a weekly scheduled agent that re-runs the gates (`pnpm check:plugin-patterns`, `check:generated-dogfood`, `check:public-surface`, and the new `check:plugin-capability`) and appends a dated status line to `STATE.md §2`. Ask for it and I'll set up the routine.
- **Definition of "foundation locked":** `check:plugin-capability` is green on ≥3 plugins, the marketplace→app registration seam (G2) is closed, one dogfood app builds against published packages, and shop can take a real payment. At that point breadth (the other 15 plugins, community) is safe to pursue.
