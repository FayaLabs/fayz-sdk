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
| yfxutrkyhydgltakbqle | cluster-food-shop-br-01 | keeps artorious; booking tenants move OUT |
| euzqjcusjloljlgwlkiw | cluster-retail-br-01 | legacy unprefixed shop dropped post-backup; reseeded |
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

- [ ] M0 Prep — status: in-progress
  - [x] worktree fayz-sdk-cloud removed; branch feat/industry-pools = devcenter/p2-signaling + merge of feat/fayz-api-default (build 34/34, typecheck 45/45, CLI tests 23/23; pushed)
  - [ ] JSON backups of all 8 pools verified (agent running → ~/dev/fayz-backups/2026-07-14-industry-pools/)
  - [ ] Registry Prisma models + seed + hand-written migration on fayz repo branch feat/industry-pools-registry (agent running)
  - [ ] ✋ FOUNDER: `prisma migrate deploy` + seed on platform Postgres
- [ ] M1 Core v1 + plg_ wave + Runner v2 — status: todo
  - db baseline rewrite → public (people/appointments); 000_core_v1_convert.sql; 000b_gphx_quarantine.sql; 010_migration_ledger.sql
  - plg_ renames in every plugin's SQL + tables.ts constants + providers (drop .schema('saas_core'))
  - views/RPCs re-emitted (v_public_services, get_available_slots, create_public_booking, v_leads, v_deals, v_invoice_balances, v_bookings→v_appointments)
  - unify migration representations (SQL files = source of truth; embed script regenerates inlines; pluginPackageName table-driven)
  - runner v2: checksums, ledger-gated executor, `fayz db pool status|apply|move-tenant`, `fayz db fan-out --canary`
  - acceptance: pnpm build + typecheck + cli tests green (old 23 + new ledger/registry/pool tests)
- [ ] M2 Canary: fan-out --canary cluster-creators-br-01 + read-only smoke — ✋ FOUNDER validates
- [ ] M3 Pools with data: euzq → mcbf(wipe) → pjug(preserve bespoke) → mgct → bcxu → yfxu → gphx(LAST) → tenant moves → prune yfxu
- [ ] M4 ✋ FOUNDER publish wave (db/core majors + saas + touched plugins + shop + courses + cli); apps flip tarball→ranges
- [ ] M5 Apps + final report: course-admin, marketplace-saas, resto-saas, agency-os, artorious, beauty-saas (read-mostly), retail stores (post-WIP), booking sites. Per app: manifest backend block, env, build, auth smoke + create-record smoke, fixed dev port. Deliverable: table app × pool × DB-state × plugins × port.

## Log

- 2026-07-14 · M0 started. Worktree removed; feat/industry-pools created (merge conflicts resolved toward devcenter side, deps reconciled: courses+saas/react-table, marketing+db, auth+radix/lucide). Build/typecheck/tests green. Backup + registry agents dispatched (Opus). (Fable)
