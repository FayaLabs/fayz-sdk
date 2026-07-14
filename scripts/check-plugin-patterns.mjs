#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-plugin-patterns — guards the unified plugin foundation against drift.
// Plugins must compose the shared primitives, not hand-roll the things we
// already standardized. Each rule can be opted out per-file with an inline
// `drift-allow: <rule>` comment when a genuine exception exists (rare).
//
// Rules:
//   raw-table      no hand-rolled <table>/<thead> in plugin views/ — use DataTable (@fayz-ai/ui)
//   local-dedup    no plugins/*/src/lib/dedup.ts — import { dedup } from '@fayz-ai/saas'
//   settings-gear  no hand-coded `/settings/<id>` gear in *Page.tsx — use ModuleActionBar
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const PLUGINS_DIR = join(ROOT, 'plugins')
const problems = []

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

function allows(content, rule) {
  return content.includes(`drift-allow: ${rule}`)
}

if (existsSync(PLUGINS_DIR)) {
  for (const plugin of readdirSync(PLUGINS_DIR)) {
    const srcDir = join(PLUGINS_DIR, plugin, 'src')
    if (!existsSync(srcDir)) continue

    for (const file of walk(srcDir)) {
      const rel = relative(ROOT, file)
      const content = readFileSync(file, 'utf8')

      // local-dedup: the file itself
      if (rel.endsWith('/lib/dedup.ts')) {
        problems.push(`${rel} — local dedup copy; import { dedup } from '@fayz-ai/saas' and delete this file [local-dedup]`)
      }

      // raw-table: only inside views/
      if (rel.includes('/views/') && /<(table|thead)\b/.test(content) && !allows(content, 'raw-table')) {
        problems.push(`${rel} — hand-rolled <table>; use DataTable from '@fayz-ai/ui' (or add 'drift-allow: raw-table') [raw-table]`)
      }

      // settings-gear: hand-coded gear inside a *Page.tsx
      if (basename(file).endsWith('Page.tsx')
        && /location\.hash\s*=\s*['"`]\/settings\//.test(content)
        && /\bSettings\b/.test(content)
        && !allows(content, 'settings-gear')) {
        problems.push(`${rel} — hand-coded settings gear; use <ModuleActionBar settingsPath=… /> from '@fayz-ai/saas' (or add 'drift-allow: settings-gear') [settings-gear]`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error('Plugin pattern check failed:')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('\nSee docs/PLUGIN-PATTERNS.md for the canonical plugin anatomy.')
  process.exit(1)
}

console.log('Plugin pattern check passed: no foundation drift detected.')
