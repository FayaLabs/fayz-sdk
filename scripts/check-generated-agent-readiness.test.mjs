import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = resolve(repoRoot, 'scripts/check-generated-agent-readiness.mjs')

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(output || `${command} ${args.join(' ')} failed`)
  }
  return result
}

function write(path, content = '') {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function createGeneratedApp() {
  const appRoot = mkdtempSync(join(tmpdir(), 'fayz-agent-ready-app-'))
  run('git', ['init'], appRoot)
  run('git', ['config', 'user.email', 'test@example.com'], appRoot)
  run('git', ['config', 'user.name', 'Test User'], appRoot)
  write(
    join(appRoot, 'package.json'),
    JSON.stringify({
      scripts: {
        build: 'vite build',
        typecheck: 'tsc -b',
      },
      dependencies: {
        '@fayz-ai/sdk': 'latest',
      },
    }),
  )
  write(
    join(appRoot, 'app.manifest.json'),
    JSON.stringify({
      manifestVersion: 2,
      id: 'generated-app',
      name: 'Generated App',
      surfaces: {
        admin: {
          pages: [],
        },
      },
    }),
  )
  write(join(appRoot, 'src/config/app.ts'), 'export const appConfig = {}\n')
  run('git', ['add', '.'], appRoot)
  run('git', ['commit', '-m', 'initial'], appRoot)
  return appRoot
}

function runReadiness(appRoot, args = []) {
  return spawnSync('node', [script, appRoot, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

describe('generated agent readiness gate', () => {
  it('passes when contract and strict scope both pass', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'src/config/theme.ts'), 'export const theme = {}\n')

    const result = runReadiness(appRoot, ['--paths', 'src/config/theme.ts', '--json'])

    assert.equal(result.status, 0)
    const payload = JSON.parse(result.stdout)
    assert.equal(payload.status, 'pass')
    assert.equal(payload.gates.contract.status, 'pass')
    assert.equal(payload.gates.scope.status, 'pass')
    assert.equal(payload.gates.scope.payload.counts.appOwned, 1)
  })

  it('fails when strict scope requires review', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'src/App.tsx'), 'export function App() { return <main /> }\n')

    const result = runReadiness(appRoot, ['--paths', 'src/App.tsx', '--json'])

    assert.equal(result.status, 1)
    const payload = JSON.parse(result.stdout)
    assert.equal(payload.status, 'fail')
    assert.equal(payload.gates.contract.status, 'pass')
    assert.equal(payload.gates.scope.status, 'fail')
    assert.deepEqual(payload.gates.scope.payload.review, ['src/App.tsx'])
  })

  it('fails when the generated app contract rejects the manifest', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'app.manifest.json'), '{"id":"generated-app","name":"Generated App"}\n')

    const result = runReadiness(appRoot, ['--paths', 'app.manifest.json', '--json'])

    assert.equal(result.status, 1)
    const payload = JSON.parse(result.stdout)
    assert.equal(payload.status, 'fail')
    assert.equal(payload.gates.contract.status, 'fail')
    assert.match(payload.gates.contract.stderr, /must use manifestVersion 2/)
  })
})
