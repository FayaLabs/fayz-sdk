#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const runTypecheck = args.includes('--typecheck')
const strictWarnings = args.includes('--strict')
const jsonOutput = args.includes('--json')
const appArgs = args.filter((arg) => arg !== '--' && arg !== '--typecheck' && arg !== '--strict' && arg !== '--json')

const defaultApps = [
  { id: 'beauty', label: 'Beauty / BeautyPlace', path: '/Users/fayalabs/dev/fayz-app/beauty-saas' },
  { id: 'shopfront', label: 'Shopfront / Aurora', path: '/Users/fayalabs/dev/fayz-app/shopfront' },
  { id: 'resto', label: 'Resto / The Chef', path: '/Users/fayalabs/dev/fayz-app/resto-saas' },
  { id: 'marketplace', label: 'Marketplace / admin', path: '/Users/fayalabs/dev/fayz-app/marketplace-saas' },
]

const apps = appArgs.length > 0
  ? appArgs.map((path) => ({ id: path, label: path, path }))
  : defaultApps

const results = []

for (const app of apps) {
  const appPath = resolve(app.path)
  if (!existsSync(appPath)) {
    results.push({ app, status: 'missing', typecheck: 'skip', warnings: [], output: `Path not found: ${appPath}` })
    continue
  }

  const contractArgs = ['./scripts/check-generated-app-contract.mjs', appPath]
  if (strictWarnings) contractArgs.push('--strict')

  const run = spawnSync('node', contractArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  const output = [run.stdout, run.stderr].filter(Boolean).join('\n').trim()
  const warnings = output
    .split('\n')
    .filter((line) => line.startsWith('Warning: '))
    .map((line) => line.replace(/^Warning:\s*/, ''))

  let typecheck = 'skip'
  let typecheckOutput = ''
  if (runTypecheck) {
    const typecheckRun = spawnSync('npm', ['run', 'typecheck'], {
      cwd: appPath,
      encoding: 'utf8',
    })
    typecheck = typecheckRun.status === 0 ? 'pass' : 'fail'
    typecheckOutput = [typecheckRun.stdout, typecheckRun.stderr].filter(Boolean).join('\n').trim()
  }

  results.push({
    app,
    status: run.status === 0 ? 'pass' : 'fail',
    typecheck,
    warnings,
    output: [output, typecheckOutput].filter(Boolean).join('\n\n'),
  })
}

if (jsonOutput) {
  console.log(JSON.stringify({
    status: results.every((result) => result.status === 'pass' && (!runTypecheck || result.typecheck === 'pass')) ? 'pass' : 'fail',
    strict: strictWarnings,
    typecheck: runTypecheck,
    apps: results.map((result) => ({
      id: result.app.id,
      label: result.app.label,
      path: resolve(result.app.path),
      contract: result.status,
      typecheck: result.typecheck,
      warnings: result.warnings,
      missing: result.status === 'missing',
    })),
  }, null, 2))
} else {
  console.log('Generated dogfood gate matrix')
  console.log('')
  console.log(runTypecheck ? '| App | Contract | Typecheck | Warnings |' : '| App | Contract | Warnings |')
  console.log(runTypecheck ? '|---|---:|---:|---|' : '|---|---:|---|')
  for (const result of results) {
    const warnings = result.warnings.length > 0 ? result.warnings.join('<br>') : '-'
    if (runTypecheck) {
      console.log(`| ${result.app.label} | ${result.status} | ${result.typecheck} | ${warnings} |`)
    } else {
      console.log(`| ${result.app.label} | ${result.status} | ${warnings} |`)
    }
  }
}

const failures = results.filter((result) => result.status !== 'pass' || (runTypecheck && result.typecheck !== 'pass'))
if (failures.length > 0) {
  console.error('')
  console.error('Generated dogfood gate failed:')
  for (const failure of failures) {
    console.error(`\n[${failure.app.label}] contract=${failure.status} typecheck=${failure.typecheck}`)
    console.error(failure.output || '(no output)')
  }
  process.exit(1)
}
