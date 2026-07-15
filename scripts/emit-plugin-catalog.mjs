#!/usr/bin/env node
// ---------------------------------------------------------------------------
// emit-plugin-catalog — machine-readable plugin/package catalog for the docs site.
//
// Milestone B4 of the Fayz Developer Center program. Emits
// `docs/plugin-catalog.json`: the single machine-readable manifest a SEPARATE
// docs-site repo (fayz-docs → data/plugin-catalog.json) consumes to generate
// per-plugin and per-package reference pages WITHOUT scraping this repo.
//
// Consumer contract (fayz-docs):
//   - reads docs/plugin-catalog.json verbatim; `schemaVersion` gates its parser.
//   - each entry is self-describing: id, package, version, status, capability
//     (plugins only), public-surface flag, subpath exports, factory, migrations,
//     description, README intro, and release-channel pins.
//
// Self-healing skip rule:
//   Discovery iterates packages/* + plugins/* (+ cli) and SKIPS any directory
//   without a package.json. On this branch plugin-admin / plugin-blog /
//   plugin-payments source is not merged yet (known CP1 gap), so they simply do
//   not appear. The moment their package.json lands, they flow into the catalog
//   with no change to this script — the catalog self-heals.
//
// Single sources of truth (no forking of logic):
//   - capability classification  → inspectPlugin() from check-plugin-capability.mjs
//   - unit discovery + Status parse → adapted from check-package-status.mjs
//   - release-channel pins        → packages/sdk/src/release-channels.json
//
// Output discipline (idempotency is the acceptance):
//   - stable sort by id, 2-space indent, trailing newline.
//   - NO timestamps, NO absolute paths, NO founder-specific data — this file
//     ships to a PUBLIC docs repo. Running the emitter twice must produce a
//     zero git diff.
//
// Top-level `support` field (D1):
//   Points the docs site at the support/stability-tier contract. We emit a
//   REPO-RELATIVE path ("SUPPORT.md") rather than an absolute github.com URL so
//   the catalog stays host-agnostic — the consumer (fayz-docs) resolves it
//   against whatever base it publishes under, and the value never has to change
//   if the repo moves hosts or the docs site rewrites links.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectPlugin } from './check-plugin-capability.mjs'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const SCHEMA_VERSION = 1
const GENERATED_FROM = 'scripts/emit-plugin-catalog.mjs'
// Repo-relative (host-agnostic) pointer to the support/stability-tier contract.
const SUPPORT_DOC = 'SUPPORT.md'
const OUT_PATH = join(ROOT, 'docs', 'plugin-catalog.json')

const VALID_STATUS = new Set(['stable', 'beta', 'preview', 'internal'])
// semver-ish: MAJOR.MINOR.PATCH with an optional pre-release/build suffix.
const SEMVERISH = /^\d+\.\d+\.\d+(?:[-+].+)?$/

// --- release channels -------------------------------------------------------
const releaseChannels = JSON.parse(
  readFileSync(join(ROOT, 'packages', 'sdk', 'src', 'release-channels.json'), 'utf8'),
)
const CHANNELS = releaseChannels.channels ?? {}

function channelsFor(pkgName) {
  return {
    stable: CHANNELS.stable?.[pkgName] ?? null,
    latest: CHANNELS.latest?.[pkgName] ?? null,
    preview: CHANNELS.preview?.[pkgName] ?? null,
  }
}

// --- unit discovery (adapted from check-package-status) ---------------------
// Every unit that owns a package.json: packages/*, plugins/*, and cli. Dirs
// without a package.json are skipped (self-healing skip rule).
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

// --- README intro parser (first prose paragraph, plain text) ----------------
// Skips heading (#), tagline blockquote (>), badge/image lines, and the B1
// `Status:` line, then returns the first real prose paragraph as plain text.
function readmeIntro(dir) {
  const readmePath = join(dir, 'README.md')
  if (!existsSync(readmePath)) return null

  const paragraphs = []
  let current = []
  for (const line of readFileSync(readmePath, 'utf8').split(/\r?\n/)) {
    if (line.trim() === '') {
      if (current.length) paragraphs.push(current.join(' '))
      current = []
    } else {
      current.push(line.trim())
    }
  }
  if (current.length) paragraphs.push(current.join(' '))

  for (const para of paragraphs) {
    const t = para.trim()
    if (!t) continue
    if (t.startsWith('#')) continue // heading
    if (t.startsWith('>')) continue // tagline blockquote
    if (t.startsWith('[![') || t.startsWith('![')) continue // badges / images
    if (/^\*{0,2}status[:*]/i.test(t)) continue // B1 Status: line
    // Reduce markdown to plain text: images/links → their text, strip emphasis.
    const plain = t
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!plain) continue
    if (plain.length <= 400) return plain
    // Truncate at a word boundary under 400 chars, with an ellipsis.
    const cut = plain.slice(0, 400)
    const lastSpace = cut.lastIndexOf(' ')
    return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
  }
  return null
}

// Detect the plugin factory: `export function createXPlugin(` or
// `export const createXPlugin =`. Returns the name or null.
function detectFactory(dir) {
  const indexPath = join(dir, 'src', 'index.ts')
  if (!existsSync(indexPath)) return null
  const src = readFileSync(indexPath, 'utf8')
  const m =
    src.match(/export\s+(?:async\s+)?function\s+(create\w*Plugin)\s*\(/) ||
    src.match(/export\s+const\s+(create\w*Plugin)\s*[:=]/)
  return m ? m[1] : null
}

// --- build entries ----------------------------------------------------------
const plugins = []
const packages = []
const errors = []

for (const { group, name, dir } of units) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const id = name // dir name — 'plugin-tasks', 'db', 'cli'
  const label = group === 'cli' ? 'cli' : `${group}/${name}`

  const status = pkg.fayz?.status
  const version = pkg.version
  const isPrivate = pkg.private === true

  // Validation — fail loud on malformed input rather than shipping bad JSON.
  if (!VALID_STATUS.has(status)) {
    errors.push(`${label}: invalid/missing fayz.status '${status}' (expected ${[...VALID_STATUS].join(' | ')})`)
  }
  if (typeof version !== 'string' || !SEMVERISH.test(version)) {
    errors.push(`${label}: invalid/missing version '${version}' (expected semver MAJOR.MINOR.PATCH)`)
  }
  if (typeof pkg.name !== 'string' || !pkg.name) {
    errors.push(`${label}: missing package name`)
  }

  const subpathExports = Object.keys(pkg.exports ?? {})
  const publicSurface = subpathExports.includes('./public') || subpathExports.includes('./website')

  const base = {
    id,
    package: pkg.name,
    version,
    kind: group === 'plugins' ? 'plugin' : 'package',
    status,
    capability: undefined, // filled for plugins, deleted for packages below
    private: isPrivate,
    publicSurface,
    subpathExports,
    description: typeof pkg.description === 'string' ? pkg.description : null,
    readmeIntro: readmeIntro(dir),
    channels: channelsFor(pkg.name),
  }

  if (group === 'plugins') {
    const cap = inspectPlugin(dir)
    const migrationsCount = cap?.facets?.migrationFiles ?? 0
    plugins.push({
      ...base,
      capability: cap?.klass ?? null,
      hasMigrations: migrationsCount > 0,
      migrationsCount,
      factory: detectFactory(dir),
    })
  } else {
    // Packages carry no capability/factory/migrations fields.
    delete base.capability
    packages.push(base)
  }
}

if (errors.length) {
  console.error('emit-plugin-catalog: malformed input — refusing to write catalog:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

// Deterministic ordering — stable sort by id.
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
plugins.sort(byId)
packages.sort(byId)

const catalog = {
  generatedFrom: GENERATED_FROM,
  schemaVersion: SCHEMA_VERSION,
  support: SUPPORT_DOC,
  plugins,
  packages,
}

mkdirSync(join(ROOT, 'docs'), { recursive: true })
writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`)

// --- report -----------------------------------------------------------------
const dist = (rows, key) =>
  rows.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {})
const fmt = (obj) =>
  Object.entries(obj)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join(' · ') || '(none)'

console.log('Wrote docs/plugin-catalog.json')
console.log(`  ${plugins.length} plugins · ${packages.length} packages (${units.length} units)`)
console.log(`  plugin status:     ${fmt(dist(plugins, 'status'))}`)
console.log(`  plugin capability: ${fmt(dist(plugins, 'capability'))}`)
console.log(`  package status:    ${fmt(dist(packages, 'status'))}`)
