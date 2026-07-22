#!/usr/bin/env node
// core/src/access must stay runnable in any JS runtime (browser, Node, edge):
// the SAME decision engine is imported by the saas providers AND by the Fayz
// broker for server-side agent authorization. React/zustand/supabase (or any
// non-relative import at all) would silently break one of those consumers.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'access')
const offenders = []

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
  const src = readFileSync(join(dir, file), 'utf8')
  for (const match of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = match[1]
    if (!spec.startsWith('.')) {
      offenders.push(`${file}: imports "${spec}"`)
    }
  }
}

if (offenders.length) {
  console.error('core/src/access must only use relative imports (pure engine):')
  for (const o of offenders) console.error(`  - ${o}`)
  process.exit(1)
}
console.log('access purity OK')
