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
- [x] M2 Canary APPLIED + SMOKE PASSED (2026-07-14, founder liberou expressamente): 16 files applied + quarantine skip; saas_core dropped, 6/6 core tables, ledger=17, plg_courses_courses=3 intact, legacy_pre_pools.subscriptions=4. Live-run fix: converter re-emitted LANGUAGE sql functions before table moves → reordered after moves/renames (converter had never applied anywhere; safe edit)
  - [x] Runner v2 shipped (commit 5977fd2; 48/48 tests); pool profiles authored (cli/pool-profiles/* + workspace symlink bridge); dry-runs green (creators=17 files, ecommerce=17, restaurant=33, agency=27, school=13)
  - [x] Read-only smoke script: cli/pool-profiles/smoke.mjs
  - [ ] ✋ FOUNDER GATE (classifier blocks agent DDL-apply via CLI): run
        `node cli/dist/index.js db pool apply creators --app cli/pool-profiles/creators --yes`
        (repo fayz-sdk, needs SUPABASE_ACCESS_TOKEN in env) — OR add a Bash permission rule
        allowing `node cli/dist/index.js db *` so the loop can run M2+M3 unattended.
        After apply: agent runs smoke + proceeds.
- [x] M3 COMPLETE (2026-07-15 madrugada, founder liberou expressamente): ALL 7 pools converted + smoked green — creators(17 files), ecommerce(17; 70 products/12 services intact, booking RPCs kept live), dentist(wipe→13 baseline), school(13; 25 leads intact), restaurant(33; menu_items=4/tables=12), agency(28; conversations+people=5, 0 stale policies), salon(46; people=67/appointments=25/clients=52/staff=6, v_clients/v_staff/rep_*/v_bookings-compat all SELECTable). 3 tenant moves executed with backup→verify→delete (espaco 18 rows→salon, hempdent 19→dentist, great-djs 15→school); anon/publishable keys fetched + filled in the 3 booking-site branches; PostgREST anon probes green on all 3 (v_public_services + get_available_slots). yfxu pruned (agenda RPCs/views dropped). euzq: decommission only.
  - Live-run fixes shipped (each committed): converter fn ordering; 0000b straggler sweep (salon tenant_roles); agenda 000b rename+002 compat (rep_* deps on v_bookings); agenda 000c non-destructive phone dedupe (9 dogfood rows, 6 NULLed w/ metadata stash); financial 007b out-of-band column capture; forms 001 archetype-aware; move-tenant fk booking_id.
  - ⚠ FOUNDER follow-up: salon has TWO espaco tenants — pre-existing 947b0ed0 (beauty dogfood, 23 people/21 services, untouched) + moved booking tenant 33333333 (slug renamed espaco-renova-rio-booking to avoid collision). Decide merge/keep.
- [ ] M4 ✋ FOUNDER publish wave (db/core majors + saas + touched plugins + shop + courses + cli); apps flip tarball→ranges
- [ ] M5 Apps + final report: course-admin, marketplace-saas, resto-saas, agency-os, artorious, beauty-saas (read-mostly), retail stores (post-WIP), booking sites. Per app: manifest backend block, env, build, auth smoke + create-record smoke, fixed dev port. Deliverable: table app × pool × DB-state × plugins × port.

## Log

- 2026-07-15 · M5 re-smoke round 2: espaco booking e2e PASS ("Agendamento confirmado!", 0 console errors — fix do overload validado). marketplace: login teste@teste.com PASS, 5 lojas no switcher, 16 produtos lidos; criar produto NÃO EXISTE na UI do plugin-shop admin (gap de produto, anotado). artorious: catálogo PASS, pedido CRIADO no pool via shop_place_order (58b3c84f, R$77.99) mas confirmação 401 → BUG SDK achado e corrigido: getOrder fazia read direto na tabela FORA do try, 401 do anon nunca chegava no fallback shop_get_order — fix commitado, sdk repackado, reinstalado no artorious, RPC read-back anon 200. Round 3 (checkout final) dispatched. 404s benignos anotados: plg_financial_*/plg_inventory_*/tenant_roles/plg_crm_activities no pool ecommerce (plugins não instalados nesse pool — apps admin multi-plugin consultam além do perfil do pool).

- 2026-07-15 · M5 smoke round 1 (Opus, 8 apps): beauty PASS read-only (auth teste@teste.com, 14 clients, agenda ok; 404 payment_methods + metric 'Clientes Ativos 0' = app follow-ups); resto PASS auth+create (menu item 002acdfb; 404 tenant_roles benigno; uncategorized items não agrupam = UI follow-up); hempdent + great-djs booking e2e PASS nos pools novos; artorious/marketplace/espaco estavam bloqueados → TODOS destravados na sequência: (a) grants anon shop 0005 (já aplicado), (b) seed teste@teste.com owner nos 5 store tenants do ecommerce (auth admin API), (c) salon get_available_slots: dropada o overload 6-arg LEGADO (corpo ainda em saas_core!) e re-emitido o canônico 5-arg da agenda 001 — probe anon 200. NB: primeiro drop pegou a função errada (canônica) — corrigido re-emitindo do arquivo; a 001 usa CREATE OR REPLACE, então pools futuros convergem sozinhos; overload legado só existia no salon. Re-smoke dos 3 fluxos dispatched.

- 2026-07-15 · Founder-reported M5 bugs FIXED live: (1) artorious sem produtos = anon perdeu SELECT no catálogo (009 revoga tudo; 0002 do shop criava policy sem GRANT) → shop 0005 + courses 0005 (mesma classe) + spine 011 (revoga writes herdados do anon + default privileges); aplicado nos 7 pools; probes anon 200 em shop/courses/v_public_services. (2) agency-os contatos não salvavam = app em modo MOCK (VITE_SUPABASE_ENABLED=false, gate desenhado pra flip pós-M3) → flip pra true (.env local, gitignored).

- 2026-07-14 · M5 smoke harness READY (cli/pool-profiles/app-smoke.md, 18472b5): 8 apps com porta dev fixa + strictPort, todos bootam HTTP 200 — beauty 5301/f58b7fe, resto 5302/09c43d0, agency 5303/1c645e8, artorious 5304/3cd621b, marketplace 5305/e3950db, hempdent 5307/0d5dcf1, great-djs 5308/015e68b, espaco 5309/9935fdc. course-admin (5306) SKIP: sem branch feat/industry-pools, WIP do Vini em feat/admin-plugin-manifest — coordenar. Findings: marketplace-saas é shop ADMIN (sem /checkout; create-smoke = Product), artorious é o storefront real; hempdent+great-djs .env VITE_SUPABASE_URL ainda no pool ecommerce (override do fallback) — repontar no fill de anon keys (M3 passo 5).

- 2026-07-14 · M3 tooling COMPLETE (814ece8, cli tests 62/62): `db pool move-tenant --from --to --tenant [--yes]` real (dry-run default; JSON backup → jsonb_populate_recordset inserts parents-first ON CONFLICT DO NOTHING → count verify HARD STOP → delete children-first by captured ids); `cli/pool-profiles/wipe-mcbf.mjs` (triple-guarded); `apply --include-provisioning` for dentist baseline; runbook updated with real commands. Caveats logged: dentist needs wipe→apply→flip ACTIVE before hempdent move; dataCritical doesn't gate move-tenant (only apply/fan-out); registry sync + anon-key fetch stay manual. ALL agent-side work now done — critical path 100% blocked on founder gate (canary apply).

- 2026-07-14 · Booking-sites prep DONE (all M5-preps now complete): hempdent 7d4148e→dentist pool, great-djs-school 1600860→school pool, espaco-renova-rio 7ed865f→salon pool; builds green; full @fayz-ai closure pinned to tarballs (single core@0.6.0, no dupes); anon keys = PENDING_POOL_ANON_KEY placeholders (fill at M3 step 5). SDK BUG found+FIXED (f01b402): plugin-agenda/reputation/auth exports maps were missing ./public|./website subpaths (tsup built them, package.json didn't declare) — fixed at source, tarballs regenerated, sweep confirms no other package affected. Booking sites confirmed public-API-only (zero v_bookings/saas_core refs). Known drift flagged: great-djs+espaco track stale yarn.lock alongside package-lock.json (not fixed, out of scope).

- 2026-07-14 · resto-saas prep READY (dd0c1b2; typecheck 1→0 errors; menu provider on public; runtime-API mode untouched). ORDERS COLLISION DECISION (Fable, architect call): app's drizzle extension tables public.orders/order_items (0 rows, never queried against pool at runtime) → rename to restaurant_orders/restaurant_order_items at M3-restaurant conversion; quarantine moves the 0-row originals to legacy_pre_pools regardless. Booking-sites prep dispatched (new pool URLs; anon keys pending pool provisioning).

- 2026-07-14 · M5-preps: agency-os READY (branch feat/industry-pools, build green on tarballs, unmock gated by VITE_SUPABASE_ENABLED; tenantId TBD post-conversion; conversations FK/RLS re-point handled by converter Fix 5). beauty-saas READY (c135ca9; app's own `appointments` extension table renamed appointment_execution — post-conversion move legacy_pre_pools.appointments rows into it; v_clients/v_staff app views survive conversion via OID re-render — verify in smoke; drizzle regen + seed-saas-core re-home = post-conversion follow-ups; tenantId TBD). resto-saas + ecommerce apps (artorious/marketplace) preps in flight.

- 2026-07-14 · M1 COMPLETE + HARDENED. Adversarial Opus review found 2 BLOCKERs (quarantine sorted after converter; non-idempotent baseline bricked converted pools) + 3 data-loss HIGHs (unguarded CASCADE; forms 002 dropping populated tables; app-created RLS policies referencing saas_core dropped by CASCADE — found via agency-os prep). ALL FIXED in 72ccb0e: 0000_legacy_quarantine.sql generalized from REAL collision map (creators subscriptions=4rows, salon appointments, restaurant orders/order_items), idempotency checker script, CASCADE emptiness gate, forms data-preserving migration, generic pg_policies re-pointer. Build 34/34, typecheck 45/45, cli 48/48. App preps: agency-os branch feat/industry-pools ready (build green on tarballs, unmock gated); beauty-saas prep in flight. 33 SDK tarballs at ~/dev/fayz-tarballs/industry-pools. CANARY APPLY: classifier denies agent 4x — founder gate (permission rule or manual command, see M2).

- 2026-07-14 · M0 started. Worktree removed; feat/industry-pools created (merge conflicts resolved toward devcenter side, deps reconciled: courses+saas/react-table, marketing+db, auth+radix/lucide). Build/typecheck/tests green. Backup + registry agents dispatched (Opus). (Fable)
