import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = resolve(repoRoot, 'scripts/check-generated-agent-scope.mjs')

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
  const appRoot = mkdtempSync(join(tmpdir(), 'fayz-generated-app-'))
  run('git', ['init'], appRoot)
  run('git', ['config', 'user.email', 'test@example.com'], appRoot)
  run('git', ['config', 'user.name', 'Test User'], appRoot)
  write(join(appRoot, 'package.json'), '{"scripts":{"typecheck":"tsc --noEmit"}}\n')
  write(join(appRoot, 'src/App.tsx'), 'export function App() { return null }\n')
  run('git', ['add', '.'], appRoot)
  run('git', ['commit', '-m', 'initial'], appRoot)
  return appRoot
}

function runScope(appRoot, args = []) {
  return spawnSync('node', [script, appRoot, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

describe('generated agent scope gate', () => {
  it('passes app-owned changes in strict mode', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'src/config/theme.ts'), 'export const theme = {}\n')

    const result = runScope(appRoot, ['--strict'])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /\| app-owned \| src\/config\/theme\.ts \|/)
  })

  it('fails blocked local engine changes', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'src/plugins/orders/index.ts'), 'export {}\n')

    const result = runScope(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stdout, /\| blocked \| src\/plugins\/orders\/index\.ts \|/)
    assert.match(result.stderr, /blocked files require SDK\/internal work/)
  })

  it('allows review files without strict mode', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'package.json'), '{"scripts":{"typecheck":"tsc --noEmit","build":"vite build"}}\n')

    const result = runScope(appRoot)

    assert.equal(result.status, 0)
    assert.match(result.stdout, /\| review \| package\.json \|/)
  })

  it('fails review files in strict mode', () => {
    const appRoot = createGeneratedApp()
    write(join(appRoot, 'package.json'), '{"scripts":{"typecheck":"tsc --noEmit","build":"vite build"}}\n')

    const result = runScope(appRoot, ['--strict'])

    assert.equal(result.status, 1)
    assert.match(result.stdout, /\| review \| package\.json \|/)
    assert.match(result.stderr, /review files require explicit approval in strict mode/)
  })

  it('passes a clean generated app', () => {
    const appRoot = createGeneratedApp()

    const result = runScope(appRoot, ['--strict'])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /\| clean \| - \|/)
  })
})
