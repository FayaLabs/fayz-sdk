# INDUSTRY-POOLS-EXECUTION — pivot to industry-pool architecture

Status: ACTIVE · Started: 2026-07-14 · Branch: feat/industry-pools
Plan of record: ~/.claude/plans/baixa-esse-app-pra-imperative-sunbeam.md (approved by founder)
Supersedes: FAYZ-CLOUD-MIGRATION.md (single-shared-project model) and its pending publish wave.

## Locked decisions

1. Industry pools `cluster-{industry}-br-{shard}`; tenant_id + RLS is the isolation; 3 tiers, identical shape.
2. Core v1 = surgical rename INTO public (no schema): persons→people, bookings→appointments (+booking_items→appointment_items); orders/services/schedules/transactions keep names; staff=people.kind; roles=existing RBAC.
3. ALL plugin tables plg_<plugin>_* (shop_*→plg_shop_*, crm_*→plg_crm_*, financial_movements→plg_financial_movements, course_*→plg_courses_*, …). sequences + documents stay core (unprefixed).
4. Registry = platform Prisma DB (models Industry/IndustryPool/IndustryPoolPluginVersion/TenantPoolRoute) — never a Supabase project.
5. mcbf legacy control-plane: backup → wipe. Publish wave (core 0.7.2 etc.): superseded, unpublished.

## Pool mapping (locked)

| ref | pool | data care |
|---|---|---|
| yfxutrkyhydgltakbqle | cluster-**ecommerce**-br-01 | ONE pool for ALL e-commerce (founder 2026-07-14): artorious + pulse/tannat/shopfront/cristina (catalogs already here); booking tenants move OUT |
| euzqjcusjloljlgwlkiw | ~~cluster-retail-br-01~~ DECOMMISSIONED | legacy unprefixed shop; catalog already copied to ecommerce pool; JSON backup retained (325 rows) |
| coqpsuofwohzpqymoajb | cluster-creators-br-01 | CANARY (near-empty) |
| mcbfebruhimlbvlvczsn | cluster-dentist-br-01 | WIPE legacy control-plane post-backup |
| gphxclpkbtbucoqclbco | cluster-salon-br-01 | REAL clinic data — convert LAST, read-only gate |
| mgctsbkyykomwaopkbjm | cluster-restaurant-br-01 | 3 tenants |
| bcxumqjrduekrsasduwe | cluster-agency-br-01 | 1 tenant |
| pjugfwxomeohuaxyjtyu | cluster-school-br-01 | bespoke pt-BR tables PRESERVED (25 real leads) |

Tenant moves after pool conversion: espaco-renova→salon, hempdent→dentist, great-djs→school (JSON backup each; prune yfxu after).

## Guardrails

- Backup verified BEFORE any destructive step (quarantine, wipe, move, drop schema).
- One pool at a time; gphx-salon last; fail on one pool halts the wave.
- Never edit an applied migration (ledger checksum HARD STOP) — author a new file.
- npm publish and prisma migrate on platform DB are FOUNDER-ONLY checkpoints.
- App work consumes SDK via local tarballs until M4 publish.

## Milestones

- [x] M0 Prep — status: done (founder checkpoint pending)
  - [x] worktree fayz-sdk-cloud removed; branch feat/industry-pools = devcenter/p2-signaling + merge of feat/fayz-api-default (build 34/34, typecheck 45/45, CLI tests 23/23; pushed)
  - [x] JSON backups of ALL 8 pools verified: 323 tables, 2088 rows, 0 verify failures → ~/dev/fayz-backups/2026-07-14-industry-pools/ (salon 6 tenants/67 persons/52 clients confirmed; dentist control-plane captured pre-wipe; school 25 leads intact)
  - [x] Registry Prisma models+seed+hand-written migration: fayz repo branch feat/industry-pools-registry commit ce08ed5 (prisma validate + tsc clean; push classifier-blocked)
  - [ ] ✋ FOUNDER: `git push -u origin feat/industry-pools-registry` (repo fayz) + `prisma migrate deploy` + seed on platform Postgres
- [x] M1 Core v1 + plg_ wave + Runner v2 — status: DONE (incl. adversarial review + 5 fixes)
  - db baseline rewrite → public (people/appointments); 0000_legacy_quarantine.sql; 000_core_v1_convert.sql; 010_migration_ledger.sql
  - plg_ renames in every plugin's SQL + tables.ts constants + providers (drop .schema('saas_core'))
  - views/RPCs re-emitted (v_public_services, get_available_slots, create_public_booking, v_leads, v_deals, v_invoice_balances, v_bookings→v_appointments)
  - unify migration representations (SQL files = source of truth; embed script regenerates inlines; pluginPackageName table-driven)
  - runner v2: checksums, ledger-gated executor, `fayz db pool status|apply|move-tenant`, `fayz db fan-out --canary`
  - acceptance: pnpm build + typecheck + cli tests green (old 23 + new ledger/registry/pool tests)
- [ ] M2 Canary: fan-out --canary cluster-creators-br-01 + read-only smoke — ✋ FOUNDER validates
  - [x] Runner v2 shipped (commit 5977fd2; 48/48 tests); pool profiles authored (cli/pool-profiles/* + workspace symlink bridge); dry-runs green (creators=17 files, ecommerce=17, restaurant=33, agency=27, school=13)
  - [x] Read-only smoke script: cli/pool-profiles/smoke.mjs
  - [ ] ✋ FOUNDER GATE (classifier blocks agent DDL-apply via CLI): run
        `node cli/dist/index.js db pool apply creators --app cli/pool-profiles/creators --yes`
        (repo fayz-sdk, needs SUPABASE_ACCESS_TOKEN in env) — OR add a Bash permission rule
        allowing `node cli/dist/index.js db *` so the loop can run M2+M3 unattended.
        After apply: agent runs smoke + proceeds.
- [ ] M3 Pools with data: mcbf(wipe) → pjug(preserve bespoke) → mgct → bcxu → yfxu-ecommerce → gphx(LAST) → tenant moves → prune yfxu (euzq: decommission only, no reseed)
- [ ] M4 ✋ FOUNDER publish wave (db/core majors + saas + touched plugins + shop + courses + cli); apps flip tarball→ranges
- [ ] M5 Apps + final report: course-admin, marketplace-saas, resto-saas, agency-os, artorious, beauty-saas (read-mostly), retail stores (post-WIP), booking sites. Per app: manifest backend block, env, build, auth smoke + create-record smoke, fixed dev port. Deliverable: table app × pool × DB-state × plugins × port.

## Log

- 2026-07-14 · resto-saas prep READY (dd0c1b2; typecheck 1→0 errors; menu provider on public; runtime-API mode untouched). ORDERS COLLISION DECISION (Fable, architect call): app's drizzle extension tables public.orders/order_items (0 rows, never queried against pool at runtime) → rename to restaurant_orders/restaurant_order_items at M3-restaurant conversion; quarantine moves the 0-row originals to legacy_pre_pools regardless. Booking-sites prep dispatched (new pool URLs; anon keys pending pool provisioning).

- 2026-07-14 · M5-preps: agency-os READY (branch feat/industry-pools, build green on tarballs, unmock gated by VITE_SUPABASE_ENABLED; tenantId TBD post-conversion; conversations FK/RLS re-point handled by converter Fix 5). beauty-saas READY (c135ca9; app's own `appointments` extension table renamed appointment_execution — post-conversion move legacy_pre_pools.appointments rows into it; v_clients/v_staff app views survive conversion via OID re-render — verify in smoke; drizzle regen + seed-saas-core re-home = post-conversion follow-ups; tenantId TBD). resto-saas + ecommerce apps (artorious/marketplace) preps in flight.

- 2026-07-14 · M1 COMPLETE + HARDENED. Adversarial Opus review found 2 BLOCKERs (quarantine sorted after converter; non-idempotent baseline bricked converted pools) + 3 data-loss HIGHs (unguarded CASCADE; forms 002 dropping populated tables; app-created RLS policies referencing saas_core dropped by CASCADE — found via agency-os prep). ALL FIXED in 72ccb0e: 0000_legacy_quarantine.sql generalized from REAL collision map (creators subscriptions=4rows, salon appointments, restaurant orders/order_items), idempotency checker script, CASCADE emptiness gate, forms data-preserving migration, generic pg_policies re-pointer. Build 34/34, typecheck 45/45, cli 48/48. App preps: agency-os branch feat/industry-pools ready (build green on tarballs, unmock gated); beauty-saas prep in flight. 33 SDK tarballs at ~/dev/fayz-tarballs/industry-pools. CANARY APPLY: classifier denies agent 4x — founder gate (permission rule or manual command, see M2).

- 2026-07-14 · M0 started. Worktree removed; feat/industry-pools created (merge conflicts resolved toward devcenter side, deps reconciled: courses+saas/react-table, marketing+db, auth+radix/lucide). Build/typecheck/tests green. Backup + registry agents dispatched (Opus). (Fable)
