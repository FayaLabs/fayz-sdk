#!/usr/bin/env node
// Wipe ALL user objects in schema `public` of the dentist pool (project
// mcbfebruhimlbvlvczsn) — the legacy control-plane — so a fresh Industry-Pools
// baseline can be applied. Keeps the `public` schema itself and all extensions.
//
// DESTRUCTIVE. Guarded three ways; refuses unless ALL hold:
//   1. argv[2] === 'mcbfebruhimlbvlvczsn'  (exact project ref — no other project)
//   2. argv[3] === '--yes'
//   3. ~/dev/fayz-backups/2026-07-14-industry-pools/mcbfebruhimlbvlvczsn/ exists
//      (the pre-wipe JSON backup — never wipe without it)
//
// Usage: node cli/pool-profiles/wipe-mcbf.mjs mcbfebruhimlbvlvczsn --yes
// Requires SUPABASE_ACCESS_TOKEN in the environment (Management API PAT).
// NOTE: this script is NOT run by the SDK build/tests — it is an operator tool.

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const REF = 'mcbfebruhimlbvlvczsn'
const BACKUP_DIR = join(
  homedir(),
  'dev',
  'fayz-backups',
  '2026-07-14-industry-pools',
  REF,
)

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// --- Guards -----------------------------------------------------------------
if (process.argv[2] !== REF) {
  die(`refusing: argv[2] must be exactly '${REF}' (got ${JSON.stringify(process.argv[2] ?? '')}).`)
}
if (process.argv[3] !== '--yes') {
  die(`refusing: pass --yes as argv[3] to confirm the wipe.`)
}
if (!existsSync(BACKUP_DIR)) {
  die(`refusing: pre-wipe backup not found at ${BACKUP_DIR} — never wipe without a verified backup.`)
}
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) die('SUPABASE_ACCESS_TOKEN not set (Management API PAT required).')

// --- Management API ---------------------------------------------------------
async function q(query, attempt = 0) {
  try {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
      return q(query, attempt + 1)
    }
    const text = await r.text()
    if (r.status !== 200 && r.status !== 201) throw new Error(`HTTP ${r.status}: ${text.slice(0, 400)}`)
    return text ? JSON.parse(text) : []
  } catch (e) {
    if (attempt < 5) {
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
      return q(query, attempt + 1)
    }
    throw e
  }
}

const qIdent = (s) => '"' + String(s).replace(/"/g, '""') + '"'

// --- Enumerate user objects in public (excluding extension-owned) -----------
// pg_depend deptype 'e' = the object is a member of an extension; those we keep.
async function listObjects() {
  // Views + materialized views + base tables (relkind r/p/v/m), in public,
  // that are NOT extension members.
  const rels = await q(`
    SELECT c.relname AS name,
           c.relkind AS kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p','v','m')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = c.oid AND d.deptype = 'e'
      )
    ORDER BY c.relkind, c.relname;
  `)

  // Functions + procedures in public, not extension members, with a signature
  // string suitable for DROP FUNCTION/PROCEDURE ... (args) CASCADE.
  const funcs = await q(`
    SELECT p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.prokind AS kind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
    ORDER BY p.proname;
  `)

  return { rels, funcs }
}

function relDropSql(rel) {
  const ident = `public.${qIdent(rel.name)}`
  switch (rel.kind) {
    case 'v':
      return `DROP VIEW IF EXISTS ${ident} CASCADE;`
    case 'm':
      return `DROP MATERIALIZED VIEW IF EXISTS ${ident} CASCADE;`
    default: // 'r' | 'p'
      return `DROP TABLE IF EXISTS ${ident} CASCADE;`
  }
}

function funcDropSql(fn) {
  const kw = fn.kind === 'p' ? 'PROCEDURE' : 'FUNCTION'
  return `DROP ${kw} IF EXISTS public.${qIdent(fn.name)}(${fn.args}) CASCADE;`
}

// --- Run --------------------------------------------------------------------
const { rels, funcs } = await listObjects()

const relLabel = (k) => (k === 'v' ? 'view' : k === 'm' ? 'matview' : 'table')
console.log(`▸ Project ${REF} — public user objects to DROP:\n`)
console.log(`  ${rels.length} relation(s):`)
for (const r of rels) console.log(`    ${relLabel(r.kind).padEnd(8)} ${r.name}`)
console.log(`  ${funcs.length} routine(s):`)
for (const f of funcs) console.log(`    ${(f.kind === 'p' ? 'procedure' : 'function').padEnd(10)} ${f.name}(${f.args})`)

if (rels.length === 0 && funcs.length === 0) {
  console.log('\n▸ Nothing to drop — public is already clean.')
  process.exit(0)
}

console.log('\n▸ Dropping (CASCADE)…')
// Drop views/matviews first, then tables, then routines — CASCADE handles the rest.
const ordered = [
  ...rels.filter((r) => r.kind === 'm').map(relDropSql),
  ...rels.filter((r) => r.kind === 'v').map(relDropSql),
  ...rels.filter((r) => r.kind === 'r' || r.kind === 'p').map(relDropSql),
  ...funcs.map(funcDropSql),
]

let dropped = 0
for (const sql of ordered) {
  try {
    await q(sql)
    dropped++
    console.log(`  ✓ ${sql}`)
  } catch (e) {
    console.log(`  ! ${sql}  — ${e.message}`)
  }
}

// Verify public is clean (ignoring extension-owned objects).
const { rels: relsAfter, funcs: funcsAfter } = await listObjects()
console.log(
  `\n▸ Done: issued ${dropped}/${ordered.length} drops. ` +
    `Remaining public user objects: ${relsAfter.length} relation(s), ${funcsAfter.length} routine(s).`,
)
if (relsAfter.length > 0 || funcsAfter.length > 0) {
  console.log('  (remaining objects may be extension-owned or have failed drops — inspect above.)')
  process.exit(1)
}
console.log('✓ public schema is clean — ready for the dentist baseline apply.')
process.exit(0)
