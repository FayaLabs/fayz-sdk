#!/usr/bin/env node
// ---------------------------------------------------------------------------
// embed-migrations.mjs — SQL files are the single source of truth.
//
// Regenerates each plugin's `src/migrations/index.ts` barrel from the .sql files
// sitting next to it, so the manifest can declare migrations as data (inline
// template strings) that stay byte-for-byte in sync with what `fayz db apply`
// executes from the .sql files themselves.
//
// For every plugins/<plugin>/src/migrations/ directory that contains .sql files:
//   - emit `export const MIGRATION_<PREFIX>_<REST> = \`<sql>\`` per file
//     (name = filename upper-cased, non-alphanumerics → underscore)
//   - emit `export const MIGRATIONS = [{ id, sql }, ...]` in filename order
//
// Run: node scripts/embed-migrations.mjs   (from the repo root)
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLUGINS_DIR = join(ROOT, 'plugins')

/** Turn a .sql filename into a stable export const identifier. */
function constName(file) {
  const stem = basename(file, '.sql')
  return 'MIGRATION_' + stem.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/** Escape a raw SQL body so it survives inside a JS template literal. */
function escapeSql(sql) {
  return sql
    .replace(/\\/g, '\\\\') // backslashes first (regex escapes like \D, \s)
    .replace(/`/g, '\\`') // template-literal delimiters
    .replace(/\$\{/g, '\\${') // template-literal interpolation
}

function generateBarrel(migrationsDir, sqlFiles) {
  const lines = [
    `// AUTO-GENERATED from ${sqlFiles.join(', ')} — regenerate with scripts/embed-migrations.mjs`,
    '// SQL files are the source of truth; this inline copy lets the manifest declare',
    '// migrations as data. Do not edit by hand — run the embed script instead.',
    '',
  ]
  const entries = []
  for (const file of sqlFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    const name = constName(file)
    lines.push(`export const ${name} = \`${escapeSql(sql)}\``)
    lines.push('')
    entries.push({ id: basename(file, '.sql'), name })
  }
  lines.push('export const MIGRATIONS: Array<{ id: string; sql: string }> = [')
  for (const e of entries) lines.push(`  { id: ${JSON.stringify(e.id)}, sql: ${e.name} },`)
  lines.push(']')
  lines.push('')
  return lines.join('\n')
}

function run() {
  const plugins = readdirSync(PLUGINS_DIR).filter((d) => {
    try {
      return statSync(join(PLUGINS_DIR, d)).isDirectory()
    } catch {
      return false
    }
  })

  let written = 0
  for (const plugin of plugins) {
    const migrationsDir = join(PLUGINS_DIR, plugin, 'src', 'migrations')
    if (!existsSync(migrationsDir)) continue
    const sqlFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    if (sqlFiles.length === 0) continue

    const out = generateBarrel(migrationsDir, sqlFiles)
    writeFileSync(join(migrationsDir, 'index.ts'), out)
    console.log(`embedded ${sqlFiles.length} migration(s) → plugins/${plugin}/src/migrations/index.ts`)
    written++
  }
  console.log(`\nDone. Regenerated ${written} migration barrel(s).`)
}

run()
