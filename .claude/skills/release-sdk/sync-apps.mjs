#!/usr/bin/env node
// Sync dogfood apps to the latest published @fayz-ai/* versions.
//
// For each app repo it: bumps every @fayz-ai/* dependency (deps + devDeps) to the
// latest version published on npm, then (unless --dry) commits and pushes to the
// app's CURRENT branch — rebasing once if the remote moved (the exact failure that
// bit us on agency-os). Prints a final report table.
//
// Usage:
//   node sync-apps.mjs                       # all apps under ../fayz-app, commit+push
//   node sync-apps.mjs beauty-saas agency-os # only these apps
//   node sync-apps.mjs --dry                 # bump files only, no git
//   node sync-apps.mjs --apps-dir /path      # override apps root
//
// Notes / gotchas baked in:
//  - Only bumps a dep if its package is actually published on npm AND the new
//    version differs (never downgrades a caret that already covers latest).
//  - Leaves unknown/unpublished @fayz-ai deps untouched (e.g. packages owned by a
//    parallel lane that this release did not republish).
//  - Preserves 2-space JSON + trailing newline; only version strings change.

import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const appsDirFlag = args.indexOf('--apps-dir')
const appsDir = appsDirFlag !== -1
  ? resolve(args[appsDirFlag + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), '../../..', '..', 'fayz-app')
const explicitApps = args.filter((a, i) =>
  !a.startsWith('--') && !(appsDirFlag !== -1 && i === appsDirFlag + 1))

if (!existsSync(appsDir)) {
  console.error(`apps dir not found: ${appsDir}\nPass --apps-dir <path>`)
  process.exit(1)
}

// --- resolve the app list ---------------------------------------------------
function isAppRepo(name) {
  const p = join(appsDir, name)
  return existsSync(join(p, 'package.json')) && existsSync(join(p, '.git'))
}
const apps = (explicitApps.length ? explicitApps : readdirSync(appsDir))
  .filter(isAppRepo)
if (!apps.length) { console.error('no app repos found'); process.exit(1) }

// --- npm latest cache -------------------------------------------------------
const npmCache = new Map()
function npmLatest(pkg) {
  if (npmCache.has(pkg)) return npmCache.get(pkg)
  let v = null
  try { v = execSync(`npm view ${pkg} version`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null }
  catch { v = null }
  npmCache.set(pkg, v)
  return v
}

function git(cwd, cmdArgs) {
  return execFileSync('git', cmdArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
}

// --- process each app -------------------------------------------------------
const report = []
for (const app of apps) {
  const cwd = join(appsDir, app)
  const fp = join(cwd, 'package.json')
  const pkg = JSON.parse(readFileSync(fp, 'utf8'))
  const changes = []
  const skipped = []
  for (const section of ['dependencies', 'devDependencies']) {
    const deps = pkg[section]
    if (!deps) continue
    for (const name of Object.keys(deps)) {
      if (!name.startsWith('@fayz-ai/')) continue
      const latest = npmLatest(name)
      if (!latest) { skipped.push(`${name} (unpublished)`); continue }
      const want = `^${latest}`
      if (deps[name] !== want) { changes.push(`${name}: ${deps[name]} -> ${want}`); deps[name] = want }
    }
  }

  let branch = '', pushed = '—'
  try { branch = git(cwd, ['branch', '--show-current']) } catch {}

  if (!changes.length) {
    report.push({ app, branch, changed: 0, skipped: skipped.length, pushed: 'no change' })
    continue
  }

  writeFileSync(fp, JSON.stringify(pkg, null, 2) + '\n')

  if (dry) {
    report.push({ app, branch, changed: changes.length, skipped: skipped.length, pushed: 'DRY' })
    console.log(`\n=== ${app} (${branch}) — ${changes.length} bumped [dry] ===`)
    changes.forEach((c) => console.log('   ' + c))
    continue
  }

  try {
    git(cwd, ['add', 'package.json'])
    git(cwd, ['commit', '-m',
      'chore(deps): bump @fayz-ai/* to latest published\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>'])
    try {
      git(cwd, ['push', 'origin', `HEAD:${branch}`])
    } catch {
      // remote moved — rebase once and retry (the agency-os case)
      git(cwd, ['pull', '--rebase', 'origin', branch])
      git(cwd, ['push', 'origin', `HEAD:${branch}`])
    }
    pushed = 'pushed'
  } catch (e) {
    pushed = 'PUSH FAILED: ' + (e.stderr?.toString().trim().split('\n').pop() || e.message)
  }
  report.push({ app, branch, changed: changes.length, skipped: skipped.length, pushed })
  console.log(`\n=== ${app} (${branch}) — ${changes.length} bumped -> ${pushed} ===`)
  changes.forEach((c) => console.log('   ' + c))
}

// --- final report -----------------------------------------------------------
console.log('\n──────── RELEASE SYNC REPORT ────────')
for (const r of report) {
  console.log(`  ${r.app.padEnd(22)} ${String(r.branch).padEnd(24)} bumped=${r.changed} skipped=${r.skipped}  ${r.pushed}`)
}
console.log('─────────────────────────────────────')
