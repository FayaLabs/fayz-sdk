#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-package-status — the machine-readable maturity floor for the catalog.
//
// Milestone B2 of the Developer Center program: every publishable unit carries
// a `fayz.status` field so a catalog / marketplace can filter and badge packages
// by maturity WITHOUT scraping prose. B1 gave humans a `Status:` line in each
// README; B2 gives machines the enum. This gate keeps the two honest.
//
// Enum (pre-1.0 — `stable` is reserved for post-1.0; nothing claims it yet):
//   stable    battle-tested, API frozen (post-1.0 only)
//   beta      published + used across dogfood apps; minor API churn before 1.0
//   preview   incubating / not capability-complete; explore-only, API may move
//   internal  private:true — never published (umbrella runtimes, app-runtime)
//
// Rules (hard — fail the gate):
//   1. every package/plugin (+cli) declares `fayz.status` with a valid enum value.
//   2. private:true  ⇒ status MUST be `internal`;
//      non-private   ⇒ status must NOT be `internal`.
//   3. plugin cross-check: a plugin the capability contract classifies as
//      `visual` (UI-only, no data/backend half) may not claim `beta`/`stable`.
//      The classification is imported from check-plugin-capability (single
//      source of truth), not re-derived here.
//
// Rule (soft — warn only, never fails):
//   4. if the README `Status:` wording and the machine `fayz.status` disagree
//      in spirit (e.g. README says "experimental" but status=beta), warn so a
//      human can reconcile. B1 wording wins by policy; this only surfaces drift.
//
// Mirrors the sibling gates (check-package-docs / check-published-shape):
// iterate packages/ + plugins/ (+ cli), collect problems[] per unit, print
// ✓/✗, exit non-zero if any hard rule fails.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectPlugin } from './check-plugin-capability.mjs'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')

const VALID = new Set(['stable', 'beta', 'preview', 'internal'])

// Discover every unit that owns a package.json: packages/*, plugins/*, and cli.
const units = []
for (const group of ['packages', 'plugins']) {
  const groupDir = join(ROOT, group)
  if (!existsSync(groupDir)) continue
  for (const name of readdirSync(groupDir).sort()) {
    const dir = join(groupDir, name)
    if (existsSync(join(dir, 'package.json'))) units.push({ group, name, dir })
  }
}
if (existsSync(join(ROOT, 'cli', 'package.json'))) {
  units.push({ group: 'cli', name: 'cli', dir: join(ROOT, 'cli') })
}

// Infer a maturity rank from a README `Status:` line's wording, for the soft check.
// Returns one of the enum values, or null if there's no Status line / unknown wording.
function readmeRank(dir) {
  const readmePath = join(dir, 'README.md')
  if (!existsSync(readmePath)) return null
  const readme = readFileSync(readmePath, 'utf8')
  const m = readme.match(/^\s*>?\s*\**\s*status[:*]*\s*(.+)$/im)
  if (!m) return null
  const line = m[1].toLowerCase()
  if (/\b(experimental|incubating|preview|alpha)\b/.test(line)) return 'preview'
  if (/\b(beta|early)\b/.test(line)) return 'beta'
  if (/\bstable\b/.test(line)) return 'stable'
  return null
}

let failures = 0
const warnings = []

for (const { group, name, dir } of units) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const label = group === 'cli' ? 'cli' : `${group}/${name}`
  const status = pkg.fayz?.status
  const problems = []

  // (1) present + valid enum
  if (status === undefined) {
    problems.push('missing fayz.status')
  } else if (!VALID.has(status)) {
    problems.push(`invalid fayz.status '${status}' (expected ${[...VALID].join(' | ')})`)
  }

  // (2) private ⇔ internal
  const isPrivate = pkg.private === true
  if (VALID.has(status)) {
    if (isPrivate && status !== 'internal') {
      problems.push(`private:true package must be 'internal', not '${status}'`)
    }
    if (!isPrivate && status === 'internal') {
      problems.push(`non-private package must not be 'internal'`)
    }
  }

  // (3) plugin capability cross-check — a `visual` plugin may not claim beta/stable.
  if (group === 'plugins' && (status === 'beta' || status === 'stable')) {
    const cap = inspectPlugin(dir)
    if (cap && cap.klass === 'visual') {
      problems.push(
        `capability contract classifies this plugin as 'visual' (UI-only); ` +
          `it may not claim '${status}' — use 'preview'`,
      )
    }
  }

  // (4) soft README/machine consistency
  if (VALID.has(status) && status !== 'internal') {
    const rr = readmeRank(dir)
    if (rr && rr !== status) {
      warnings.push(`${label}: README says '${rr}' but fayz.status='${status}' — reconcile (B1 wording wins)`)
    }
  }

  if (problems.length) {
    failures++
    console.error(`✗ ${label}: ${problems.join('; ')}`)
  } else {
    console.log(`✓ ${label} — ${status}`)
  }
}

if (warnings.length) {
  console.warn(`\nwarnings (non-blocking):`)
  for (const w of warnings) console.warn(`  ⚠ ${w}`)
}

if (failures) {
  console.error(`\n${failures} unit(s) fail the package-status floor.`)
  process.exit(1)
}
console.log(`\nAll ${units.length} units declare a valid fayz.status.`)
