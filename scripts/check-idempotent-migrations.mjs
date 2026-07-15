#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-idempotent-migrations.mjs — repo-wide replay-safety guardrail.
//
// Every migration that industry pools apply through the ledger (`fayz db apply`)
// must be idempotent: re-running the same file on an already-provisioned pool
// must no-op, never error on an existing object. The ledger re-applies a file
// whenever its checksum changes, so a non-idempotent DDL form is a latent
// production break the first time the file is touched.
//
// This checker scans EVERY migration source the runner can resolve:
//   • packages/db/migrations                  (core spine)
//   • packages/shop/migrations                (@fayz-ai/shop)
//   • packages/courses/migrations             (@fayz-ai/courses)
//   • plugins/<plugin>/src/migrations         (convention plugins)
//   • plugins/plugin-agenda/src/integrations/*/migrations (connector SQL)
//
// It fails (exit 1) on these bare, non-idempotent forms:
//   * CREATE TABLE public.X          without IF NOT EXISTS
//   * CREATE [UNIQUE] INDEX          without IF NOT EXISTS
//   * CREATE TYPE                    outside a guarded DO block
//   * CREATE TRIGGER <name>          not preceded (same file) by
//                                    DROP TRIGGER IF EXISTS <name>
//   * CREATE POLICY <name>|"name"    not made replay-safe by ANY of:
//       - a literal DROP POLICY IF EXISTS earlier in the file,
//       - a dynamic bulk drop (EXECUTE format('DROP POLICY IF EXISTS %I ...')),
//       - a pg_policies existence guard (IF NOT EXISTS (SELECT 1 FROM
//         pg_policies ...) around the CREATE), or
//       - a `policyname = 'name'` guard clause naming the policy.
//
// Dynamic `EXECUTE format('CREATE POLICY ...%I...')` statements are skipped
// (name built at runtime); they pair with a format() DROP in the same loop.
//
// Run: node scripts/check-idempotent-migrations.mjs
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Collect every migrations directory the ledger resolves, in a stable order. */
function migrationDirs() {
  const dirs = [
    join(ROOT, 'packages', 'db', 'migrations'),
    join(ROOT, 'packages', 'shop', 'migrations'),
    join(ROOT, 'packages', 'courses', 'migrations'),
  ]
  const pluginsRoot = join(ROOT, 'plugins')
  for (const plugin of readdirSync(pluginsRoot).sort()) {
    const base = join(pluginsRoot, plugin)
    if (!existsSync(base) || !statSync(base).isDirectory()) continue
    const src = join(base, 'src', 'migrations')
    if (existsSync(src)) dirs.push(src)
    // Connector SQL (e.g. agenda's google-calendar integration).
    const integrations = join(base, 'src', 'integrations')
    if (existsSync(integrations)) {
      for (const conn of readdirSync(integrations).sort()) {
        const cm = join(integrations, conn, 'migrations')
        if (existsSync(cm)) dirs.push(cm)
      }
    }
  }
  return dirs.filter((d) => existsSync(d))
}

function startsWith(line, re) {
  return re.test(line.replace(/^\s+/, ''))
}

function checkFile(sql) {
  const violations = []
  const lines = sql.split('\n')

  const droppedTriggers = new Set()
  const droppedPolicies = new Set()
  const hasDynamicPolicyDrop = /DROP POLICY IF EXISTS %I ON /.test(sql)
  const guardedPolicies = new Set([...sql.matchAll(/policyname = '([^']+)'/g)].map((m) => m[1]))

  // Whether we are currently inside an `IF NOT EXISTS (SELECT 1 FROM pg_policies …)`
  // guard block. CREATE POLICY statements inside it are idempotent by construction.
  let inPolicyGuard = false

  lines.forEach((raw, idx) => {
    const line = raw.replace(/^\s+/, '')
    const lineNo = idx + 1
    let m

    if (/IF NOT EXISTS \(SELECT 1 FROM pg_policies/.test(line)) inPolicyGuard = true
    else if (/^END IF;?/.test(line)) inPolicyGuard = false

    // Record literal drops seen so far (quoted or unquoted policy names).
    if ((m = line.match(/^DROP TRIGGER IF EXISTS (\w+)\b/))) droppedTriggers.add(m[1])
    if ((m = line.match(/^DROP POLICY IF EXISTS "([^"]+)"/))) droppedPolicies.add(m[1])
    else if ((m = line.match(/^DROP POLICY IF EXISTS (\w+)\b/))) droppedPolicies.add(m[1])

    if (startsWith(raw, /^CREATE TABLE public\./)) {
      violations.push(`${lineNo}: CREATE TABLE public.* without IF NOT EXISTS`)
    }

    if (
      startsWith(raw, /^CREATE (UNIQUE )?INDEX /) &&
      !startsWith(raw, /^CREATE (UNIQUE )?INDEX IF NOT EXISTS /)
    ) {
      violations.push(`${lineNo}: CREATE INDEX without IF NOT EXISTS`)
    }

    if (startsWith(raw, /^CREATE TYPE /)) {
      violations.push(`${lineNo}: bare CREATE TYPE (wrap in a guarded DO block)`)
    }

    // CREATE TRIGGER <name> — the name may be the last token on the line, so
    // match a word-boundary rather than a trailing space (shop uses newlines).
    if ((m = line.match(/^CREATE TRIGGER (\w+)\b/))) {
      const name = m[1]
      if (!droppedTriggers.has(name)) {
        violations.push(`${lineNo}: CREATE TRIGGER ${name} not preceded by DROP TRIGGER IF EXISTS ${name}`)
      }
    }

    // CREATE POLICY (quoted or unquoted), skipping the dynamic EXECUTE form.
    if (!/EXECUTE format\(/.test(line)) {
      let name = null
      if ((m = line.match(/^CREATE POLICY "([^"]+)" ON /))) name = m[1]
      else if ((m = line.match(/^CREATE POLICY (\w+) ON /))) name = m[1]
      if (name !== null) {
        const safe =
          droppedPolicies.has(name) ||
          guardedPolicies.has(name) ||
          hasDynamicPolicyDrop ||
          inPolicyGuard
        if (!safe) {
          violations.push(`${lineNo}: CREATE POLICY ${name} not made replay-safe (no DROP / guard)`)
        }
      }
    }
  })

  return violations
}

function run() {
  const dirs = migrationDirs()
  let totalViolations = 0
  let totalFiles = 0

  for (const dir of dirs) {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const file of files) {
      totalFiles++
      const violations = checkFile(readFileSync(join(dir, file), 'utf8'))
      if (violations.length > 0) {
        totalViolations += violations.length
        console.error(`\n✗ ${join(dir, file).slice(ROOT.length + 1)}`)
        for (const v of violations) console.error(`    ${v}`)
      }
    }
  }

  if (totalViolations > 0) {
    console.error(
      `\n${totalViolations} idempotency violation(s) across ${dirs.length} migration dir(s). ` +
        `Migrations must be replay-safe on already-provisioned pools.`,
    )
    process.exit(1)
  }
  console.log(`✓ ${totalFiles} migration file(s) across ${dirs.length} dir(s) are idempotent (replay-safe).`)
}

run()
