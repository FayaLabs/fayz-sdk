#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-plugin-capability — the executable Plugin Capability Contract.
//
// A plugin is only a real, governed capability (not a showcase card) when it
// owns the data/backend half of the contract, not just UI surfaces. This gate
// classifies every plugin and reports exactly what each is missing to become
// capability-complete. See PLUGIN_PATTERNS.md and docs/discovery/PLUGIN-MODEL.md.
//
// Capability facets (detected statically from src/, mirroring check-plugin-patterns):
//   provider     a data path — createSafeDataProvider / data/supabase.ts / *Provider()
//   entities     a typed entity bound to a table (registries[].entity.data.table)
//   migrations   schema lives in src/migrations/*.sql AND is wired into the manifest
//   seed         typed seed/demo rows (seedData / SEED_ / makeSeed)
//   permissions  declared grants (declaredFeatures / permissions / requiredPermission)
//   tests        at least one *.test.* / *.spec.* — proves the slice end-to-end
//
// Classification:
//   capability   provider + entities + seed + tests + (migrations wired if .sql present)
//   partial      some facets present, not capability-complete
//   visual       no provider / entities / migrations — a UI-only placeholder
//
// Exit behavior:
//   default      report + classify, ALWAYS exit 0 (safe to add to CI now)
//   --strict     every plugin in ENFORCED must be capability-complete, else exit 1
//
// ENFORCED ratchets up one plugin at a time as each is migrated and tested.
// plugin-tasks is the canonical reference (FAY-1206); it graduates into ENFORCED
// the moment it ships its first end-to-end test.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const PLUGINS_DIR = join(ROOT, 'plugins')
const STRICT = process.argv.includes('--strict')

// Plugins that MUST be capability-complete under --strict. Add a plugin here
// once it reaches the bar — never remove. This is the foundation ratchet.
const ENFORCED = [
  'plugin-tasks', // FAY-1206 — first capability-complete reference plugin
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(full)) out.push(full)
  }
  return out
}

// Detect the capability facets of one plugin from its source tree.
function inspectPlugin(pluginDir) {
  const srcDir = join(pluginDir, 'src')
  if (!existsSync(srcDir)) return null

  const files = walk(srcDir)
  const src = files
    .filter((f) => !/\.(test|spec)\.(ts|tsx)$/.test(f))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')

  const migrationsDir = join(srcDir, 'migrations')
  const migrationFiles = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    : []

  const provider =
    /createSafeDataProvider\s*\(/.test(src) ||
    files.some((f) => /\/data\/supabase\.(ts|tsx)$/.test(f)) ||
    /create[A-Z]\w*Provider\s*\(/.test(src) ||
    /import\s+\{[^}]*Provider[^}]*\}\s+from\s+'@fayz-ai\/(shop|courses)'/.test(src)

  // A typed entity bound to a real table (the data contract, not just UI props).
  const entities = /data:\s*\{[^}]*\btable:\s*['"]/s.test(src) || /\bentities:\s*\[/.test(src)

  const migrationsWired = /\bmigrations:\s*\[/.test(src)

  const seed =
    /\bseedData:\s*\[/.test(src) ||
    /\bSEED_[A-Z]/.test(src) ||
    /\bmakeSeed\w*\s*\(/.test(src) ||
    /\bmockData:\s*\[/.test(src)

  const permissions =
    /\bdeclaredFeatures:\s*\[/.test(src) ||
    /\bpermissions:\s*\[/.test(src) ||
    /\brequiredPermission\b/.test(src)

  const tests = files.some((f) => /\.(test|spec)\.(ts|tsx)$/.test(f))

  // What's missing to be capability-complete.
  const missing = []
  if (!provider) missing.push('provider')
  if (!entities) missing.push('entities')
  if (migrationFiles.length > 0 && !migrationsWired) missing.push('wire-migrations')
  if (!seed) missing.push('seed')
  if (!tests) missing.push('tests')

  // permissions is recommended, surfaced separately (not blocking completeness).
  const facets = { provider, entities, migrationFiles: migrationFiles.length, migrationsWired, seed, permissions, tests }

  let klass
  if (!provider && !entities && migrationFiles.length === 0) klass = 'visual'
  else if (missing.length === 0) klass = 'capability'
  else klass = 'partial'

  return { facets, missing, klass }
}

const yes = (b) => (b ? '✓' : '·')
const rows = []
const failures = []

if (existsSync(PLUGINS_DIR)) {
  for (const plugin of readdirSync(PLUGINS_DIR).sort()) {
    const pluginDir = join(PLUGINS_DIR, plugin)
    if (!statSync(pluginDir).isDirectory()) continue
    const result = inspectPlugin(pluginDir)
    if (!result) continue
    const { facets, missing, klass } = result
    rows.push({ plugin, facets, missing, klass })

    if (STRICT && ENFORCED.includes(plugin) && klass !== 'capability') {
      failures.push(`${plugin} — must be capability-complete; missing: ${missing.join(', ')}`)
    }
  }
}

// --- Report -----------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n)
const mig = (f) => (f.migrationFiles === 0 ? '·' : f.migrationsWired ? '✓' : '⚠') // ⚠ = sql exists, not wired
console.log('Plugin capability contract — classification\n')
console.log(`  ${pad('plugin', 22)} prov ent mig seed perm test  class`)
console.log(`  ${'-'.repeat(22)} ---- --- --- ---- ---- ----  -----`)
for (const r of rows) {
  const f = r.facets
  console.log(
    `  ${pad(r.plugin, 22)}  ${yes(f.provider)}    ${yes(f.entities)}   ${mig(f)}   ${yes(f.seed)}    ${yes(f.permissions)}    ${yes(f.tests)}   ${r.klass}`,
  )
}

const counts = rows.reduce((acc, r) => ((acc[r.klass] = (acc[r.klass] || 0) + 1), acc), {})
console.log(
  `\n  ${counts.capability || 0} capability · ${counts.partial || 0} partial · ${counts.visual || 0} visual` +
    `   (⚠ in mig = .sql present but not wired into the manifest)`,
)

const gaps = rows.filter((r) => r.klass === 'partial' && r.missing.length)
if (gaps.length) {
  console.log('\n  To reach capability-complete:')
  for (const r of gaps) console.log(`  - ${pad(r.plugin, 22)} needs: ${r.missing.join(', ')}`)
}

if (failures.length) {
  console.error('\nPlugin capability check FAILED (--strict):')
  for (const f of failures) console.error(`  - ${f}`)
  console.error('\nSee PLUGIN_PATTERNS.md → capability anatomy, and docs/discovery/PLUGIN-MODEL.md.')
  process.exit(1)
}

console.log(
  STRICT
    ? `\nStrict capability check passed for: ${ENFORCED.join(', ') || '(none enforced yet)'}.`
    : '\nReport only (no --strict). Add plugins to ENFORCED as they reach the bar.',
)
