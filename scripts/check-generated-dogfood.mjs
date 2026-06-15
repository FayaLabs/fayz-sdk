#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const defaultApps = [
  { id: 'beauty', label: 'Beauty / BeautyPlace', path: '/Users/fayalabs/dev/fayz-app/beauty-saas' },
  { id: 'shopfront', label: 'Shopfront / Aurora', path: '/Users/fayalabs/dev/fayz-app/shopfront' },
  { id: 'resto', label: 'Resto / The Chef', path: '/Users/fayalabs/dev/fayz-app/resto-saas' },
  { id: 'marketplace', label: 'Marketplace / admin', path: '/Users/fayalabs/dev/fayz-app/marketplace-saas' },
]

const apps = process.argv.slice(2).length > 0
  ? process.argv.slice(2).map((path) => ({ id: path, label: path, path }))
  : defaultApps

const results = []

for (const app of apps) {
  const appPath = resolve(app.path)
  if (!existsSync(appPath)) {
    results.push({ app, status: 'missing', warnings: [], output: `Path not found: ${appPath}` })
    continue
  }

  const run = spawnSync('node', ['./scripts/check-generated-app-contract.mjs', appPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  const output = [run.stdout, run.stderr].filter(Boolean).join('\n').trim()
  const warnings = output
    .split('\n')
    .filter((line) => line.startsWith('Warning: '))
    .map((line) => line.replace(/^Warning:\s*/, ''))

  results.push({
    app,
    status: run.status === 0 ? 'pass' : 'fail',
    warnings,
    output,
  })
}

console.log('Generated dogfood gate matrix')
console.log('')
console.log('| App | Gate | Warnings |')
console.log('|---|---:|---|')
for (const result of results) {
  const warnings = result.warnings.length > 0 ? result.warnings.join('<br>') : '-'
  console.log(`| ${result.app.label} | ${result.status} | ${warnings} |`)
}

const failures = results.filter((result) => result.status !== 'pass')
if (failures.length > 0) {
  console.error('')
  console.error('Generated dogfood gate failed:')
  for (const failure of failures) {
    console.error(`\n[${failure.app.label}] ${failure.status}`)
    console.error(failure.output || '(no output)')
  }
  process.exit(1)
}
