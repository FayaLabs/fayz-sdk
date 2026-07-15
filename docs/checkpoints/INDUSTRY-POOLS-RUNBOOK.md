# INDUSTRY-POOLS RUNBOOK — M2/M3 pool conversion sequences

Prereqs: repo fayz-sdk @ feat/industry-pools, `pnpm --filter @fayz-ai/cli build`, SUPABASE_ACCESS_TOKEN in env. Backups verified at ~/dev/fayz-backups/2026-07-14-industry-pools/ (do NOT proceed without them). One pool at a time; STOP on any failure.

## M2 — Canary: creators (coqpsuofwohzpqymoajb)

```sh
node cli/dist/index.js db pool apply creators --app cli/pool-profiles/creators --yes
node cli/pool-profiles/smoke.mjs coqpsuofwohzpqymoajb
```
Expected: quarantine moves public.subscriptions (4 rows) → legacy_pre_pools; convert renames persons→people etc; plg_courses_* renamed with 3 courses intact. Verify extra:
`plg_courses_courses` count = 3; `legacy_pre_pools.subscriptions` = 4.
✋ Founder eyeballs smoke output before M3.

## M3 — order: ecommerce → dentist(wipe) → school → restaurant → agency → salon(LAST)

### 1. ecommerce (yfxutrkyhydgltakbqle)
```sh
node cli/dist/index.js db pool apply ecommerce --app cli/pool-profiles/ecommerce --yes
node cli/pool-profiles/smoke.mjs yfxutrkyhydgltakbqle
```
Notes: shop 0000_plg_rename renames shop_*→plg_shop_* (keeps 70 products / orders). OLD agenda RPCs/views (get_available_slots, create_public_booking, v_public_services, v_bookings) keep working post-convert (OID-based) — production booking sites stay live until their tenants move. Do NOT drop them yet.

### 2. dentist (mcbfebruhimlbvlvczsn) — WIPE first (backup exists: 27 tables/167 rows)
Wipe (drop all public user tables — legacy control-plane), then fresh baseline:
```sh
node -e "…DROP TABLE loop via Management API — see wipe-mcbf.sql in scratch/runbook…"
node cli/dist/index.js db pool apply dentist --app cli/pool-profiles/dentist --yes   # needs pools.config status flip PROVISIONING→or use explicit name
node cli/pool-profiles/smoke.mjs mcbfebruhimlbvlvczsn
```

### 3. school (pjugfwxomeohuaxyjtyu) — bespoke tables PRESERVED
Fresh baseline coexists (IF NOT EXISTS; no name collisions with alunos/professores/turmas/leads).
```sh
node cli/dist/index.js db pool apply school --app cli/pool-profiles/school --yes
node cli/pool-profiles/smoke.mjs pjugfwxomeohuaxyjtyu   # + verify leads count = 25
```

### 4. restaurant (mgctsbkyykomwaopkbjm)
Quarantine auto-moves public.orders/order_items (0 rows) → legacy_pre_pools. App-side decision (logged): drizzle extension renamed restaurant_orders/restaurant_order_items (app repo follow-up).
```sh
node cli/dist/index.js db pool apply restaurant --app cli/pool-profiles/restaurant --yes
node cli/pool-profiles/smoke.mjs mgctsbkyykomwaopkbjm   # + menu_items=4, restaurant_tables=12 intact
```

### 5. agency (bcxumqjrduekrsasduwe)
Fix-5 re-pointer handles app conversations policies; FKs follow.
```sh
node cli/dist/index.js db pool apply agency --app cli/pool-profiles/agency --yes
node cli/pool-profiles/smoke.mjs bcxumqjrduekrsasduwe   # + conversations tables readable, contacts=2
```

### 6. salon (gphxclpkbtbucoqclbco) — REAL DATA, LAST, read-only gate
Pre-counts: tenants=6, persons=67, bookings=25, clients=52.
```sh
node cli/dist/index.js db pool apply salon --app cli/pool-profiles/salon --yes --allow-critical
node cli/pool-profiles/smoke.mjs gphxclpkbtbucoqclbco
```
Post checks (read-only, BEFORE any app write): people=67, appointments=25, clients=52, staff_members intact; v_clients/v_staff/rep_* app views still SELECTable (OID re-render); legacy_pre_pools.appointments present (0 rows).

## Tenant moves (after both pools of a pair are converted)

Per tenant (espaco 33333333-…0001 yfxu→gphx; hempdent 11111111-…0001 yfxu→mcbf; great-djs 22222222-…0001 yfxu→pjug):
1. JSON backup of the tenant's rows (tenants/people/services/schedules/appointments/orders/order_items filtered by tenant_id) from yfxu.
2. INSERT the rows into the target pool (same UUIDs; parents before children: tenants→people→services→schedules→orders→appointments→order_items).
3. Verify counts source==target.
4. DELETE from yfxu (children first).
5. Fetch the target pool's anon key: `GET /v1/projects/<ref>/api-keys` → fill the booking app's env/fallback (feat/industry-pools branches have PENDING_POOL_ANON_KEY placeholders).
6. Booking e2e on the site against the new pool.

## Prune yfxu (after all 3 moves)
Drop old agenda objects no longer needed on the ecommerce pool: v_bookings/v_appointments? (keep none — agenda not an ecommerce plugin): DROP FUNCTION get_available_slots/create_public_booking, DROP VIEW v_public_services + v_appointments if present. Remove agenda schedules/services/appointments rows if any remain (should be zero post-moves).

## Registry sync (post-M3)
Update IndustryPoolPluginVersion + TenantPoolRoute statuses MOVING→ACTIVE via seed re-run or SQL on the platform DB (founder applies with prisma).
