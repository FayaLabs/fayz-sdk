#!/usr/bin/env node
// Rewrite packages/sdk/src/release-channels.json from the currently published
// npm versions of every @fayz-ai package (the SDK_PACKAGES/SDK_PLUGINS lists in
// packages/sdk/src/vite.ts are the canonical enumeration). Run after a release
// (see .claude/skills/release-sdk) so `fayz create` never scaffolds stale pins.
//
// All three channels currently track the latest published version; channel
// divergence (stable lagging latest) starts when we actually cut pre-releases.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const viteSrc = readFileSync(resolve(process.cwd(), 'packages/sdk/src/vite.ts'), 'utf8')

function extractList(name) {
  const match = viteSrc.match(new RegExp(`const ${name} = \\[([^\\]]+)\\]`))
  if (!match) throw new Error(`Could not find ${name} in packages/sdk/src/vite.ts`)
  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1])
}

const packages = [
  ...extractList('SDK_PACKAGES').map((p) => `@fayz-ai/${p}`),
  ...extractList('SDK_PLUGINS').map((p) => `@fayz-ai/plugin-${p}`),
]

const versions = {}
const missing = []
for (const pkg of packages) {
  try {
    const version = execFileSync('npm', ['view', pkg, 'version'], { encoding: 'utf8' }).trim()
    versions[pkg] = `^${version}`
    console.log(`  ${pkg} → ^${version}`)
  } catch {
    missing.push(pkg)
    console.warn(`  ⚠ ${pkg} — not published, skipping`)
  }
}

const outPath = resolve(process.cwd(), 'packages/sdk/src/release-channels.json')
writeFileSync(
  outPath,
  JSON.stringify({ channels: { stable: versions, latest: versions, preview: versions } }, null, 2) + '\n',
)
console.log(
  `\n✓ Wrote ${Object.keys(versions).length} package version(s) to packages/sdk/src/release-channels.json` +
    (missing.length ? ` (${missing.length} unpublished skipped: ${missing.join(', ')})` : ''),
)
