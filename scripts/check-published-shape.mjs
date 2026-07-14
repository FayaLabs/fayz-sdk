#!/usr/bin/env node
// Asserts the PUBLISHED tarball shape for every package/plugin: the files npm
// would publish must include built JS (and, except for the saas-core-bridged
// plugins still pending W6 de-bridge, type declarations). Run after a full build.
import { execFileSync } from 'node:child_process'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
// Plugins still bridged to @fayz/saas-core (JS-only until de-bridged in W6).
// De-bridged so far: tasks, forms → they ship declarations like native packages.
const BRIDGED = new Set()

const dirs = []
for (const group of ['packages', 'plugins']) {
  for (const name of readdirSync(join(ROOT, group))) {
    if (existsSync(join(ROOT, group, name, 'package.json'))) dirs.push({ group, name, dir: join(ROOT, group, name) })
  }
}

let failures = 0
for (const { group, name, dir } of dirs) {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: dir, encoding: 'utf8' })
  const files = JSON.parse(out)[0].files.map((f) => f.path)
  const has = (suffix) => files.some((f) => f.endsWith(suffix))
  const needDts = !(group === 'plugins' && BRIDGED.has(name))
  const problems = []
  if (!has('dist/index.js')) problems.push('missing dist/index.js (ESM)')
  if (!has('dist/index.cjs')) problems.push('missing dist/index.cjs (CJS)')
  if (needDts && !has('dist/index.d.ts')) problems.push('missing dist/index.d.ts (types)')
  // @fayz-ai/db ships spine SQL so `fayz db apply` can resolve migrations/*.sql
  // relative to the installed package (require.resolve('@fayz-ai/db/package.json')).
  if (name === 'db' && !files.some((f) => /^migrations\/.+\.sql$/.test(f))) {
    problems.push('missing migrations/*.sql (spine SQL)')
  }
  // Legacy entry-point fields (main/module/types) must resolve to built dist, not
  // raw TS in src/. Tools that read these fields (older bundlers, some TS
  // moduleResolution modes, jest) would otherwise consume unbuilt source from the
  // published tarball. The `source` export condition legitimately points at src/.
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  for (const field of ['main', 'module', 'types']) {
    const val = pkg[field]
    if (typeof val === 'string' && /(^\.?\/?)src\//.test(val)) {
      problems.push(`${field} points into src/ (${val}); should point at dist/`)
    }
  }
  if (problems.length) {
    failures++
    console.error(`✗ ${group}/${name}: ${problems.join('; ')}`)
  } else {
    console.log(`✓ ${group}/${name}${needDts ? '' : ' (JS-only, dts deferred to W6)'}`)
  }
}

if (failures) {
  console.error(`\n${failures} package(s) have an invalid published shape.`)
  process.exit(1)
}
console.log(`\nAll ${dirs.length} packages have a valid published shape.`)
