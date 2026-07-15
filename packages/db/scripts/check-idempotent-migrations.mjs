#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-idempotent-migrations.mjs — guardrail for the core migration spine.
//
// The industry-pool converter (000_core_v1_convert.sql) rewrites live pools in
// place, then the fresh baseline (001..010) runs on the SAME pool. Every file in
// packages/db/migrations must therefore be replay-safe: running 001..010 again
// on an already-converted pool must no-op, never error on an existing object.
//
// This checker fails (exit 1) if any of these bare, non-idempotent DDL forms
// appear:
//   * CREATE TABLE public.X          without IF NOT EXISTS
//   * CREATE [UNIQUE] INDEX          without IF NOT EXISTS
//   * CREATE TYPE                    outside a guarded DO block
//   * literal CREATE TRIGGER name    not preceded (same file, earlier) by a
//                                    DROP TRIGGER IF EXISTS <name>
//   * literal CREATE POLICY "name"   not preceded (same file, earlier) by a
//                                    DROP POLICY IF EXISTS "name" — OR by a
//                                    dynamic bulk drop (the converter drops all
//                                    policies via a pg_policies loop).
//
// Dynamic `EXECUTE format('CREATE POLICY "%s_..."')` statements (name built at
// runtime) are not statically checkable and are skipped; their idempotency is
// the author's responsibility (they pair with a format() DROP in the same loop).
//
// Run: node packages/db/scripts/check-idempotent-migrations.mjs
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

/** A line whose statement starts here (ignoring leading whitespace). */
function startsWith(line, re) {
  return re.test(line.replace(/^\s+/, ''))
}

function checkFile(file, sql) {
  const violations = []
  const lines = sql.split('\n')

  // Names dropped anywhere earlier in the file (literal DROP ... IF EXISTS).
  const droppedTriggers = new Set()
  const droppedPolicies = new Set()
  // The converter drops every policy on the moved tables via a pg_policies loop
  // (`DROP POLICY IF EXISTS %I ON public.%I`) — treat that as covering all of
  // this file's literal creates.
  const hasDynamicPolicyDrop = /DROP POLICY IF EXISTS %I ON public\.%I/.test(sql)
  // Policies guarded by an existence check (IF NOT EXISTS (SELECT 1 FROM
  // pg_policies WHERE policyname = 'name' ...)) are idempotent without a DROP.
  const guardedPolicies = new Set(
    [...sql.matchAll(/policyname = '([^']+)'/g)].map((m) => m[1]),
  )

  lines.forEach((raw, idx) => {
    const line = raw.replace(/^\s+/, '')
    const lineNo = idx + 1

    // Record drops seen so far (as we walk top-down).
    let m
    if ((m = line.match(/^DROP TRIGGER IF EXISTS (\w+)\b/))) droppedTriggers.add(m[1])
    if ((m = line.match(/^DROP POLICY IF EXISTS "([^"]+)"/))) droppedPolicies.add(m[1])

    // CREATE TABLE public.X — must be guarded.
    if (startsWith(raw, /^CREATE TABLE public\./)) {
      violations.push(`${lineNo}: CREATE TABLE public.* without IF NOT EXISTS`)
    }

    // CREATE [UNIQUE] INDEX — must be guarded. (Skip the DROP form.)
    if (startsWith(raw, /^CREATE (UNIQUE )?INDEX /) && !startsWith(raw, /^CREATE (UNIQUE )?INDEX IF NOT EXISTS /)) {
      violations.push(`${lineNo}: CREATE INDEX without IF NOT EXISTS`)
    }

    // CREATE TYPE — must live in a guarded DO block, never bare.
    if (startsWith(raw, /^CREATE TYPE /)) {
      violations.push(`${lineNo}: bare CREATE TYPE (wrap in a guarded DO block)`)
    }

    // literal CREATE TRIGGER name ... ON table
    if ((m = raw.match(/^\s*CREATE TRIGGER (\w+) /))) {
      const name = m[1]
      if (!droppedTriggers.has(name)) {
        violations.push(`${lineNo}: CREATE TRIGGER ${name} not preceded by DROP TRIGGER IF EXISTS ${name}`)
      }
    }

    // literal CREATE POLICY "name" ON public.table
    if ((m = raw.match(/^\s*CREATE POLICY "([^"]+)" ON /))) {
      const name = m[1]
      if (!droppedPolicies.has(name) && !guardedPolicies.has(name) && !hasDynamicPolicyDrop) {
        violations.push(`${lineNo}: CREATE POLICY "${name}" not preceded by DROP POLICY IF EXISTS "${name}"`)
      }
    }
  })

  return violations
}

function run() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let total = 0
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    const violations = checkFile(file, sql)
    if (violations.length > 0) {
      total += violations.length
      console.error(`\n✗ ${file}`)
      for (const v of violations) console.error(`    ${v}`)
    }
  }

  if (total > 0) {
    console.error(`\n${total} idempotency violation(s) found in packages/db/migrations. Migrations must be replay-safe on converted pools.`)
    process.exit(1)
  }
  console.log(`✓ ${files.length} migration file(s) are idempotent (replay-safe).`)
}

run()
