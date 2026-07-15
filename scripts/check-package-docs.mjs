#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-package-docs — the README documentation floor for publishable packages.
//
// Milestone B1 of the Developer Center program: before a package is fit to
// appear in a public catalog / on npm, its README must clear a minimal heading
// contract so a stranger can tell WHAT it is, HOW mature it is, and HOW to
// install + use it. This gate enforces the floor (not the prose):
//
//   1. README.md exists.
//   2. It contains an install command for the package's OWN name
//      (`npm install <name>`, `npm i <name>`, `pnpm add <name>`, `yarn add <name>`).
//   3. It carries a human `Status` line (maturity wording — the machine-readable
//      `fayz.status` field lands in B2; until then this is the human signal).
//   4. Plugins additionally mention their `create<X>Plugin` factory export by
//      name, so the quick-start snippet is real and copy-pasteable.
//
// Private packages (`"private": true`) are skipped — they never publish.
//
// This mirrors the conventions of the sibling gates (check-published-shape,
// check-plugin-capability): iterate packages/ + plugins/, collect problems[]
// per package, print ✓/✗, exit non-zero if anything fails.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')

const dirs = []
for (const group of ['packages', 'plugins']) {
  const groupDir = join(ROOT, group)
  if (!existsSync(groupDir)) continue
  for (const name of readdirSync(groupDir)) {
    if (existsSync(join(groupDir, name, 'package.json'))) {
      dirs.push({ group, name, dir: join(groupDir, name) })
    }
  }
}

// Extract create<X>Plugin factory export names from a plugin's entry source
// (falls back to built declarations if src isn't present).
function factoryNames(dir) {
  const candidates = ['src/index.ts', 'src/index.tsx', 'dist/index.d.ts']
  for (const rel of candidates) {
    const p = join(dir, rel)
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    const found = new Set()
    // exported factory: `export function createXPlugin`, `export const createXPlugin`,
    // `export declare function createXPlugin`, or `export { createXPlugin }`.
    for (const m of text.matchAll(/\bcreate[A-Z][A-Za-z0-9]*Plugin\b/g)) found.add(m[0])
    if (found.size) return [...found]
  }
  return []
}

let failures = 0
for (const { group, name, dir } of dirs) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  if (pkg.private === true) {
    console.log(`- ${group}/${name} (private — skipped)`)
    continue
  }
  const pkgName = pkg.name || name
  const problems = []
  const readmePath = join(dir, 'README.md')

  if (!existsSync(readmePath)) {
    problems.push('missing README.md')
  } else {
    const readme = readFileSync(readmePath, 'utf8')
    const lower = readme.toLowerCase()

    // (2) install command for own name
    const nm = pkgName.toLowerCase()
    const hasInstall = [`npm install ${nm}`, `npm i ${nm}`, `pnpm add ${nm}`, `yarn add ${nm}`].some(
      (cmd) => lower.includes(cmd),
    )
    if (!hasInstall) problems.push(`no install command for ${pkgName} (e.g. \`npm install ${pkgName}\`)`)

    // (3) a Status line (maturity wording), allowing markdown quote/bold prefixes
    const hasStatus = /^\s*>?\s*\**\s*status\b/im.test(readme)
    if (!hasStatus) problems.push('no `Status` line (maturity wording)')

    // (4) plugins must mention their create<X>Plugin factory export
    if (group === 'plugins') {
      const factories = factoryNames(dir)
      if (factories.length && !factories.some((f) => readme.includes(f))) {
        problems.push(`README does not mention its factory export (${factories.join(' / ')})`)
      }
    }
  }

  if (problems.length) {
    failures++
    console.error(`✗ ${group}/${name}: ${problems.join('; ')}`)
  } else {
    console.log(`✓ ${group}/${name}`)
  }
}

if (failures) {
  console.error(`\n${failures} publishable package(s) fail the README docs floor.`)
  process.exit(1)
}
console.log(`\nAll publishable packages clear the README docs floor.`)
