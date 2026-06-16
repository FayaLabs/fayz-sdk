# PLAN — per-app definition-of-done + backlog

Focus order is optimized for **fastest architecture validation, then depth**: a flagship that
proves the hard cases (beauty), then a guaranteed quick e2e win (pulse), then the community-plugin
proof (resto), then greenfield (agency). Reorder by editing FOCUS in STATE.md.

Legend per task: `[ ]` todo · `[~]` staged-for-human (checkpoint) · `[x]` done.
"DoD" = an app is **done** when a human can log in with the test user and use it end-to-end.

---

## 1. beauty-saas  (flagship · real client · mines ~/dev/beautyplace)
Live Supabase already wired (gphxclpkbtbucoqclbco), 34 migrations, archetype-based. Plugins
configured but dashboard is mostly hardcoded; onboarding checks are stubs; commission not computed;
no public booking. `fayz.data.countRows` already works for one metric — that's the template.

- B2 `[ ]` Replace hardcoded dashboard `compute` fns (revenue-week, active-clients, avg-ticket, occupancy, no-show, new-clients-month, retention, revenue-per-professional, product-sales) with real `fayz.data` queries, mirroring `countActiveBookingsForDay`. Some need a view/aggregate → author SQL (B4). Verify: typecheck.
- B3 `[ ]` Replace onboarding `check: async () => false` (4 steps) with real existence queries (clients>0, services>0, schedule configured, payment methods>0). Verify: typecheck.
- B4 `[ ]` Author idempotent migrations for any view/table B2/B3 need (e.g. `v_revenue_week`, staff_members.commission_rate). Stage in `beauty-saas/supabase/migrations/`. → human apply.
- B5 `[ ]` Commission compute: `fin_commission_rules` × `person(kind=staff)` × `booking` → financial movement. Wire plugin-financial bridge. Verify: typecheck.
- B6 `[ ]` Public booking flow ported from beautyplace (scoped: slot pick + create booking on real data; WhatsApp confirm optional). Verify: typecheck + build.
- B7 `[ ]` Confirm used plugins run on real data, tenant-scoped; `setActiveTenantId` wired on org switch.
- B-CHECK `[~]` HUMAN: apply staged migrations (`supabase db push`), log in as test user, smoke test dashboard + create client + create appointment. Leave FEEDBACK in STATE.
- **DoD:** dashboard shows real numbers; create client → service → appointment → commission flows e2e.

## 2. pulse-store  (fast e2e win · shop RLS already secure)
Storefront on shop Supabase (euzqjcusjloljlgwlkiw). RLS is already correct (public catalog read,
customer-scoped orders, `shop_place_order` SECURITY DEFINER RPC). Only gap: catalog is mock-only,
never persisted, so real checkout would fail.

- P1 `[ ]` Author a catalog→`shop_products` seed module (reads `pulseCatalog`, upserts products/categories/images/discounts via the shop provider or SQL). Verify: typecheck.
- P2 `[ ]` Move storefront content (hero slides, announcement, category copy) from hardcoded `app.ts` to data/config the seed populates. Verify: typecheck + build.
- P3 `[~]` HUMAN: run the seed against live shop DB, place a test order via the storefront, confirm RPC path + inventory decrement + customer-scoped read. Leave FEEDBACK.
- **DoD:** real catalog persisted; checkout places an order via the RPC; RLS verified e2e.

## 3. resto-saas  (community-plugin proof · app-owned domain code ↔ SDK)
30 migrations with RLS exist, but Supabase env is empty (mock fallback); MenuManager is hardcoded
mock; custom menu/orders/tables providers disabled by default. The real prize: prove an app can
own restaurant-specific code that still integrates with SDK plugins.

- R1 `[ ]` Make provider selection real: wire `shouldUseFayz*Provider` / Supabase env so menu/orders/tables use real data when env is set; complete `.env.example`. Verify: typecheck.
- R2 `[ ]` Replace `MenuManager.tsx` `MOCK_CATEGORIES` with real menu data via `product(kind=…)` + plugin-menu provider; persist toggles. Verify: typecheck.
- R3 `[ ]` Extract resto-specific UI (ModuleToggles, TableMap, MenuManager) into an app-owned `restaurant` module/plugin seam that consumes SDK providers and falls back to mock — the community-plugin template. Document the seam in `resto-saas`. Verify: typecheck + build.
- R4 `[ ]` Wire orders/tables to real data + tenant scoping; confirm `restaurant_tables` RLS. Verify: typecheck.
- R-CHECK `[~]` HUMAN: provision a Supabase project for resto (or confirm reuse), set env, apply 30 migrations, log in, menu CRUD + table/order smoke test. Leave FEEDBACK.
- **DoD:** boots on real Supabase; menu CRUD persists; tables+orders e2e; resto module pattern documented & integrates with SDK.

## 4. agency-os  (greenfield schema · fresh Supabase)
Fresh Supabase live (bcxumqjrduekrsasduwe) but NO migrations and placeholder pages. All stock
plugins (conversations, crm, calendars, marketing…), `multiOrg: true`.

- A1 `[ ]` Author initial migration set: `saas_core` bootstrap + agency Ring-2 extensions (sub-accounts/locations for the GHL model). Stage. Verify: SQL lints / typecheck of any TS.
- A2 `[ ]` Replace `Placeholder` pages; wire conversations + CRM + calendars to real data on the fresh DB. Verify: typecheck.
- A3 `[ ]` Multi-org isolation: confirm `setActiveTenantId` on org switch + RLS scoping across sub-accounts. Verify: typecheck.
- A-CHECK `[~]` HUMAN: apply migrations to the fresh DB, log in, create a sub-account + a CRM contact + a conversation. Leave FEEDBACK.
- **DoD:** boots on its Supabase; CRM + conversations + calendars e2e; org isolation holds.

---

## Milestones (your stop-and-test points)
- **M-BEAUTY** — beauty-saas DoD reached → checkpoint → feedback.
- **M-PULSE** — pulse-store DoD reached → checkpoint → feedback.
- **M-RESTO** — resto-saas DoD reached + community-plugin seam proven → checkpoint.
- **M-AGENCY** — agency-os DoD reached → checkpoint.
- **M-LOCK** — all four green e2e → architecture validated → lock the convention → hand to Fayz generation.
