#!/usr/bin/env node
// ---------------------------------------------------------------------------
// sync-release-channels — keep packages/sdk/src/release-channels.json aligned
// with the monorepo tree, and enforce channel discipline.
//
// Milestone B5 of the Developer Center program. release-channels.json declares,
// per channel (stable | latest | preview), the caret RANGE a generated app pins
// for each Fayz package. Two jobs live here:
//
//   sync  (default): rewrite every channel's pinned RANGE to `^<tree version>`
//         for packages the channel already lists (channel membership is NOT
//         changed — sync never adds or removes packages, only refreshes ranges).
//         Runs validation first and refuses to write if a HARD rule fails.
//
//   --check: validation only, NO file writes. This is the gate wired into
//         `pnpm check:release-channels`.
//
// Rules enforced by validation:
//   HARD (fail, exit non-zero):
//     the `stable` channel may not pin a package whose tree `fayz.status` is
//     `internal`. `internal` == private:true, never published (see B2 /
//     check-package-status) — such a package is not installable, so a stable
//     app must never depend on it. NOTE: the channel *named* `latest` is not the
//     status enum; don't conflate the two.
//   SOFT (warn only, never fails):
//     - a stable pin whose package.json is absent from the tree (e.g. an
//       unmerged plugin like blog/payments on another branch) — warn, don't fail.
//     - drift: a stable range that no longer satisfies the tree version. This is
//       the release-wave signal for CP1 — surfacing it, not auto-failing.
//
// Package discovery mirrors the sibling gates (check-package-status /
// check-package-docs): packages/*, plugins/*, and cli — every dir with a
// package.json that declares `fayz.status`.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const CHANNELS_PATH = join(ROOT, 'packages', 'sdk', 'src', 'release-channels.json')

// --- tiny semver helpers (no deps) -----------------------------------------

// Parse an "X.Y.Z" prefix into a numeric triple, or null.
function parseVersion(value) {
  const m = String(value).trim().match(/^v?(\d+)\.(\d+)\.(\d+)/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

// Minimal caret-range satisfies check. Handles `^X.Y.Z` (incl. 0.x semantics)
// and bare exact `X.Y.Z`. Anything else we can't parse → treat as unsatisfied
// so it surfaces as drift rather than silently passing.
function rangeSatisfies(range, version) {
  const ver = parseVersion(version)
  if (!ver) return false
  const caret = String(range).trim().match(/^\^(\d+)\.(\d+)\.(\d+)/)
  if (!caret) {
    const exact = parseVersion(range)
    return exact ? cmp(exact, ver) === 0 : false
  }
  const lower = [Number(caret[1]), Number(caret[2]), Number(caret[3])]
  if (cmp(ver, lower) < 0) return false
  // Upper bound is set by the left-most non-zero component (npm caret rules).
  let upper
  if (lower[0] > 0) upper = [lower[0] + 1, 0, 0]
  else if (lower[1] > 0) upper = [lower[0], lower[1] + 1, 0]
  else upper = [lower[0], lower[1], lower[2] + 1]
  return cmp(ver, upper) < 0
}

// --- tree index -------------------------------------------------------------

// name -> { version, status, private, label } for every unit that owns a
// package.json under packages/*, plugins/*, or cli.
function buildTreeIndex() {
  const index = new Map()
  const dirs = []
  for (const group of ['packages', 'plugins']) {
    const groupDir = join(ROOT, group)
    if (!existsSync(groupDir)) continue
    for (const name of readdirSync(groupDir).sort()) {
      const dir = join(groupDir, name)
      if (existsSync(join(dir, 'package.json'))) dirs.push({ label: `${group}/${name}`, dir })
    }
  }
  if (existsSync(join(ROOT, 'cli', 'package.json'))) dirs.push({ label: 'cli', dir: join(ROOT, 'cli') })

  for (const { label, dir } of dirs) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    if (!pkg.name) continue
    index.set(pkg.name, {
      version: pkg.version,
      status: pkg.fayz?.status,
      private: pkg.private === true,
      label,
    })
  }
  return index
}

function loadChannels() {
  return JSON.parse(readFileSync(CHANNELS_PATH, 'utf8'))
}

// --- validation -------------------------------------------------------------

// Returns { errors: string[], warnings: string[] }.
function validate(channels, tree) {
  const errors = []
  const warnings = []
  const stable = channels.channels?.stable ?? {}

  for (const [name, range] of Object.entries(stable)) {
    const unit = tree.get(name)
    if (!unit) {
      warnings.push(`${name}: pinned in stable but no package.json in tree (unmerged branch?) — skipping`)
      continue
    }
    // HARD: stable must not pin an internal package.
    if (unit.status === 'internal') {
      errors.push(
        `${name} (${unit.label}): fayz.status='internal' but pinned in the stable channel — ` +
          `internal packages are private:true / never published and must never ship in a stable app`,
      )
    }
    // SOFT: drift — range no longer satisfies the tree version.
    if (!rangeSatisfies(range, unit.version)) {
      warnings.push(`${name}: stable pins '${range}' but tree is ${unit.version} — drift (range does not satisfy tree)`)
    }
  }

  return { errors, warnings }
}

function report({ errors, warnings }) {
  if (warnings.length) {
    console.warn('warnings (non-blocking):')
    for (const w of warnings) console.warn(`  ⚠ ${w}`)
  }
  if (errors.length) {
    console.error(`\nchannel-discipline violations:`)
    for (const e of errors) console.error(`  ✗ ${e}`)
    return false
  }
  console.log(`\n✓ stable channel is clean — no internal packages pinned.`)
  return true
}

// --- sync (write) -----------------------------------------------------------

// Refresh each channel's ranges to `^<tree version>` for packages it already
// lists. Membership is preserved; packages absent from the tree keep their pin.
function sync(channels, tree) {
  let changed = 0
  for (const channel of Object.keys(channels.channels ?? {})) {
    const pins = channels.channels[channel]
    for (const name of Object.keys(pins)) {
      const unit = tree.get(name)
      if (!unit || !unit.version) continue
      const next = `^${unit.version}`
      if (pins[name] !== next) {
        pins[name] = next
        changed++
      }
    }
  }
  return changed
}

// --- main -------------------------------------------------------------------

function main() {
  const checkOnly = process.argv.includes('--check')
  const tree = buildTreeIndex()
  const channels = loadChannels()

  const result = validate(channels, tree)

  if (checkOnly) {
    const ok = report(result)
    process.exit(ok ? 0 : 1)
  }

  // Default (sync) mode: never write over a hard violation.
  if (result.errors.length) {
    report(result)
    console.error(`\nRefusing to sync while the stable channel pins an internal package. Fix status/membership first.`)
    process.exit(1)
  }
  const changed = sync(channels, tree)
  if (changed > 0) {
    writeFileSync(CHANNELS_PATH, JSON.stringify(channels, null, 2) + '\n')
    console.log(`Synced release-channels.json — updated ${changed} pin(s) to tree versions.`)
  } else {
    console.log(`release-channels.json already in sync — no changes.`)
  }
  // Surface drift-vs-nothing after sync (post-sync there should be none).
  if (result.warnings.length) report({ errors: [], warnings: result.warnings })
}

main()
