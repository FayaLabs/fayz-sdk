#!/usr/bin/env node
// Read-only post-apply smoke for a converted pool (Industry Pools M2/M3).
// Usage: node cli/pool-profiles/smoke.mjs <projectRef>
// Uses SUPABASE_ACCESS_TOKEN (Management API) — SELECT-only queries.
const ref = process.argv[2]
if (!ref) { console.error('usage: smoke.mjs <projectRef>'); process.exit(1) }
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) { console.error('SUPABASE_ACCESS_TOKEN missing'); process.exit(1) }

async function q(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`)
  return t ? JSON.parse(t) : []
}

const checks = []
function check(name, ok, detail = '') { checks.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`) }

// 1. saas_core must be gone
const schemas = await q(`SELECT schema_name FROM information_schema.schemata WHERE schema_name='saas_core'`)
check('saas_core schema dropped', schemas.length === 0)

// 2. core tables present in public
const core = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('tenants','people','appointments','orders','services','tenant_members')`)
check('core tables in public (tenants/people/appointments/orders/services/tenant_members)', core.length === 6, `${core.length}/6`)

// 3. old names must NOT exist in public
const old = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('persons','bookings','booking_items')`)
check('no legacy persons/bookings tables', old.length === 0, old.map((r) => r.table_name).join(','))

// 4. ledger present with rows (renamed fayz_migration_ledger → _migrations;
//    fall back to the legacy name for pools not yet rebaselined)
const ledger =
  (await q(`SELECT count(*)::int AS n FROM public._migrations`).catch(() => null)) ??
  (await q(`SELECT count(*)::int AS n FROM public.fayz_migration_ledger`).catch(() => null))
check('_migrations ledger populated', !!ledger && ledger[0].n > 0, ledger ? `${ledger[0].n} rows` : 'missing')

// 5. functions re-homed
const fns = await q(`SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname IN ('user_tenant_ids','create_tenant_with_owner','handle_updated_at')`)
check('core functions in public', fns.length >= 3, fns.map((r) => r.proname).join(','))

// 6. no plg-less legacy plugin tables left (spot common ones)
const legacyPlg = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('crm_activities','financial_movements','stock_movements','frm_documents','tsk_tasks','mkt_content_plans','shop_products','course_courses')`)
check('legacy plugin table names renamed to plg_*', legacyPlg.length === 0, legacyPlg.map((r) => r.table_name).join(','))

// 7. RLS sanity: tenants table has RLS enabled
const rls = await q(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='tenants'`)
check('RLS enabled on tenants', rls[0]?.relrowsecurity === true)

// 8. row-count preservation probes (people/appointments) — reported, not asserted
const counts = await q(`SELECT (SELECT count(*)::int FROM public.people) people, (SELECT count(*)::int FROM public.appointments) appointments, (SELECT count(*)::int FROM public.tenants) tenants`)
console.log(`ℹ counts: ${JSON.stringify(counts[0])}`)

const failed = checks.filter((c) => !c.ok)
console.log(failed.length ? `\nSMOKE FAILED (${failed.length})` : '\nSMOKE PASSED')
process.exit(failed.length ? 1 : 0)
