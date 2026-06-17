# STATE — live ledger (read first, every iteration)

> The brain. Trust this over chat history. Update it at the end of every iteration.

## FOCUS
- **App:** pulse-store
- **Next task:** P2 (storefront content from data)
- **Milestone in progress:** M-PULSE  (beauty-saas code queue complete → M-BEAUTY staged behind B-CHECK human)

## Order
beauty-saas → pulse-store → resto-saas → agency-os  (edit to reorder)

## Task queues  (mirror of PLAN.md — tick here as you go)

### beauty-saas  [M-BEAUTY]
- [x] B2 dashboard real queries — 7/10 metrics wired (v_bookings/v_clients/v_staff); avg-rating, occupancy, product-sales left hardcoded w/ TODO(B4) — typecheck pass
- [x] B3 onboarding real checks — 4/4 wired via tableHasRows() existence helper (clients→v_clients; services→saas_core.services; schedule→saas_core.schedules; payments→public.payment_methods). countRows `schema` param used for cross-schema; try/catch → false on missing source. No new view needed. typecheck pass
- [x] B4 migrations for B2/B3 views — verified B2/B3 *wired* metrics already backed (v_bookings.order_total, v_clients last_visit/visits/created_at, v_staff, saas_core.services/schedules, public.payment_methods all exist). Only missing piece: staff_members.commission_rate (absent from all 34 migrations) → authored idempotent `20260616000001_staff_commission_rate.sql` (ADD COLUMN IF NOT EXISTS numeric(5,2) DEFAULT 0 + surfaced in v_staff w/ security_invoker). typecheck pass (no TS touched), staged not applied. Source views for the 3 hardcoded metrics (avg-rating/occupancy/product-sales) deferred — not yet wired.
- [x] B5 commission compute — added `createCommissionMovement(orderId)` to AgendaFinancialBridge (SDK plugin-agenda) + pure `computeCommissionAmount(total, rate%)` helper. Resolves the professional via `orders.assignee_id`, reads `v_staff.commission_rate`, inserts a `financial_movements` row (direction='debit', movement_kind='commission', metadata{professionalId,commissionRate,baseAmount}); idempotent per order (reuses existing commission movement). No `fin_commission_rules` table in this schema — rate lives on staff_members.commission_rate (B4). typecheck pass EXIT=0, capability gate EXIT=0
- [x] B6 public booking flow — added `src/lib/booking.ts` (booking engine on fayz.data): listBookableServices (saas_core.services), listProfessionals (v_staff), pure `generateDaySlots`/`filterAvailableSlots` + `getAvailableSlots` (reads v_bookings for the pro+day, filters conflicts + minAdvanceHours), and `createBooking` writing order→booking→booking_items+order_items into saas_core (mirrors agenda provider insert shape; tenant_id from BookingDraft). Multi-step `PublicBooking.tsx` page (service→pro→date→time→client→success) registered at `/book`. Tenant resolved from `?tenant=` URL param / VITE_DEFAULT_TENANT_ID. typecheck pass EXIT=0, build pass (vite ✓). NOTE: page is registered behind app auth (permission clients.create) — true anon hosting + person lookup/create-by-phone deferred to B-CHECK/follow-up.
- [x] B7 plugins on real data + tenant wiring — CONFIRMED: (1) `setActiveTenantId` wired on org switch via SDK org store `setCurrentOrg` (packages/saas/src/org/store.ts), driven by OrgInitializer init + OrgSwitcher, and cleared on `reset()`; (2) plugin entityDefs tenant-scope through `resolveDataProvider` injecting `() => getActiveTenantId()` (packages/core/src/data/resolve.ts) — supabase/archetype/fayz-api paths all keyed on it + cache keyed on tenant; (3) real-vs-mock data selection driven by `VITE_SUPABASE_URL` (auth/org/data adapters in app.tsx). FIXED the one gap: custom public-booking reads (`listBookableServices`/`listProfessionals`/`getAvailableSlots`) relied on authenticated RLS context the anon public flow lacks → now explicitly filter `tenant_id` (services/v_staff/v_bookings all expose it); PublicBooking threads resolved tenantId + gates loads on it. typecheck pass EXIT=0. Writes already stamp tenant_id on order/booking parents (item tables scope via parent FK, per agenda shape).
- [~] B-CHECK human: apply migrations + login smoke test  ← **NEXT HUMAN CHECKPOINT** (see FOR THE HUMAN)

### pulse-store  [M-PULSE]
- [x] P1 catalog→shop_products seed module — authored `src/config/seed.ts`: idempotent `seedPulseCatalog({client?, tenantId?})` upserts pulseCatalog into `shop_categories`/`shop_products`/`shop_product_images`/`shop_discounts` (columns mirror SupabaseShopProvider). Idempotency by tenant-scoped natural key (category.slug, product.sku, discount.code, image.url) → re-runnable. Returns per-table touch counts. typecheck pass EXIT=0. ⚠️ See PROVIDER NOTE below — storefront reads a DIFFERENT schema than the seed writes.
- [ ] P2 storefront content from data
- [~] P3 human: seed live + place test order (RLS verify)

> **PULSE PROVIDER/SCHEMA NOTE (found during P1 — affects P3 e2e):** pulse-store's storefront provider is `createFayzShopProvider({supabaseUrl, publishableKey, storeId})` (legacy *supabase mode*, src/config/shop.ts). That path (1) is **read-only** — all write methods throw 501 ("writes require the Fayz admin/broker API") and it uses the anon/publishable key, and (2) queries **bare tables** `products`/`product_images`/`categories`/`orders`/`order_items`/`discounts` with a **client-side placeOrder** (NOT the `shop_place_order` SECURITY DEFINER RPC). The seed (and the DATA-MODEL Ring-1 convention + the task title) target the canonical **`shop_*`** schema used by `SupabaseShopProvider` (which DOES use `shop_place_order`). So before P3 can pass e2e, reconcile ONE of: (a) switch pulse to `SupabaseShopProvider` (shop_* + RPC, the convention) — preferred; or (b) point the seed at the bare `products`/etc tables the legacy provider reads; or (c) confirm euzqjcusjloljlgwlkiw exposes `products` as views over `shop_*`. Recommend (a) — fold into P2 or a new P1b. Until reconciled, seeded `shop_*` rows won't appear in the storefront.

### resto-saas  [M-RESTO]
- [ ] R1 real provider selection + env
- [ ] R2 MenuManager real data
- [ ] R3 app-owned restaurant module/plugin seam (community-plugin template)
- [ ] R4 orders/tables real data + RLS
- [~] R-CHECK human: provision DB, apply migrations, smoke test

### agency-os  [M-AGENCY]
- [ ] A1 initial migration set (saas_core + agency Ring-2)
- [ ] A2 replace placeholders, wire conversations/CRM/calendars
- [ ] A3 multi-org isolation
- [~] A-CHECK human: apply migrations, smoke test

## Blockers
- (none yet)

## Notes for B4 (migrations)
- B2 left 3 metrics hardcoded — each needs a source view before it can be real:
  - `avg-rating` → reviews/ratings table or `v_client_ratings` (none exists).
  - `occupancy-rate` → slot-capacity view from `work_schedules` × service duration.
  - `product-sales` → goods-vs-service split on order lines or an `inv_` sales rollup.
- B2 revenue uses `v_bookings.order_total` summed client-side via `listRows` (no
  server aggregate in `fayz.data`). If volume grows, B4 can add `v_revenue_week`.
- B3 needs **no new view**: `fayz.data.countRows` accepts a `schema` param, so
  services/schedules are counted directly against `saas_core.*` (same access path
  the archetype-lookup uses). The v_* views are only for cross-schema JOINs.
- B5 (commission) needs `staff_members.commission_rate` — DONE in B4: confirmed absent across all 34 migrations, added via `20260616000001_staff_commission_rate.sql` (numeric(5,2) DEFAULT 0) and surfaced in `v_staff`. B5 can read the per-professional default rate from `v_staff.commission_rate`. Migration is staged (human-apply in B-CHECK), so until applied the column reads as missing against the live DB — B5 code should tolerate that.

## FOR THE HUMAN  (checkpoint queue — do these when you stop in)
- **B-CHECK — beauty-saas (all code tasks B2–B7 landed on `fay/dogfood-sprint`).** Do this to reach M-BEAUTY:
  1. Apply the staged migration: `cd ~/dev/fayz-app/beauty-saas && supabase db push` (adds `staff_members.commission_rate` + re-creates `v_staff` — file `supabase/migrations/20260616000001_staff_commission_rate.sql`). Until applied, B5 commission read tolerates the missing column.
  2. Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (gphxclpkbtbucoqclbco) in `.env` so auth/org/data use the real adapter (otherwise the app boots on mock).
  3. Log in as the test user; smoke test: dashboard shows real numbers (B2/B3), create a client → service → appointment, confirm commission movement appears (B5), and open `/book?tenant=<orgId>` to place a public booking on real data (B6/B7).
  4. Verify tenant isolation: switch org in the OrgSwitcher and confirm the dashboard/agenda data swaps (this exercises `setActiveTenantId` → cache clear).
  - Leave findings in **FEEDBACK** below; the next iteration honors them before continuing pulse-store.

## FEEDBACK  (you write here; the next iteration honors it first)
- (empty)

## Milestones reached
- **M-BEAUTY (code-complete)** — beauty-saas code tasks B2–B7 all landed + typecheck green on `fay/dogfood-sprint`. Full M-BEAUTY (e2e DoD) gated on **B-CHECK** human checkpoint. FOCUS advanced to pulse-store.
