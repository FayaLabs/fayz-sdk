import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = resolve(repoRoot, 'scripts/check-generated-dogfood.mjs')

function write(path, content = '') {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function createGeneratedApp(name, packageOverrides = {}) {
  const appRoot = mkdtempSync(join(tmpdir(), `${name}-`))
  const pkg = {
    scripts: {
      build: 'vite build',
      typecheck: 'tsc -b',
    },
    dependencies: {
      '@fayz-ai/sdk': 'latest',
    },
    ...packageOverrides,
  }
  write(join(appRoot, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  write(join(appRoot, 'src/config/app.ts'), 'export const appConfig = {}\n')
  write(join(appRoot, 'src/App.tsx'), 'export function App() { return null }\n')
  return appRoot
}

function run(args) {
  return spawnSync('node', [script, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

describe('generated dogfood gate', () => {
  it('emits machine-readable JSON status', () => {
    const cleanApp = createGeneratedApp('fayz-clean-app')
    const warningApp = createGeneratedApp('fayz-warning-app', { scripts: { build: 'vite build' } })

    const result = run(['--json', cleanApp, warningApp])

    assert.equal(result.status, 0)
    const payload = JSON.parse(result.stdout)
    assert.equal(payload.status, 'pass')
    assert.equal(payload.apps.length, 2)
    assert.equal(payload.apps[0].contract, 'pass')
    assert.equal(payload.apps[0].warnings.length, 0)
    assert.equal(payload.apps[1].contract, 'pass')
    assert.deepEqual(payload.apps[1].warnings, [
      'package.json has no typecheck script; generated apps need a repeatable type gate.',
    ])
  })

  it('emits executive summary status from the same gate data', () => {
    const cleanApp = createGeneratedApp('fayz-clean-app')
    const warningApp = createGeneratedApp('fayz-warning-app', { scripts: { build: 'vite build' } })

    const result = run(['--summary', cleanApp, warningApp])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Resultado: 2\/2 contract gates passed; 1 warning\(s\)\./)
    assert.match(result.stdout, /Impacto: Dogfood baseline can support constrained app-owned agent edits\./)
    assert.match(result.stdout, /Risco: .*fayz-warning-app/)
    assert.match(result.stdout, /Proximo: Fix blockers\/warnings or escalate them into SDK\/internal package work\./)
  })
})
