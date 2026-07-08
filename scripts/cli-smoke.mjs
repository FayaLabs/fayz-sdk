#!/usr/bin/env node
// Smoke test the CLI: create all three app kinds in a temp dir, doctor each,
// and assert the generated shape is the real dogfood one (not the old stub).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI = join(process.cwd(), 'cli/dist/index.js')
const CHANNEL = JSON.parse(readFileSync(join(process.cwd(), 'packages/sdk/src/release-channels.json'), 'utf8')).channels.stable
const dir = mkdtempSync(join(tmpdir(), 'fayz-cli-'))

function assert(cond, message) {
  if (!cond) {
    console.error(`✗ ${message}`)
    process.exit(1)
  }
}

function contains(app, rel, needle) {
  const path = join(dir, app, rel)
  assert(existsSync(path), `${app}/${rel} missing`)
  assert(readFileSync(path, 'utf8').includes(needle), `${app}/${rel} should contain "${needle}"`)
}

try {
  execFileSync('node', [CLI, 'create', 'storefront', 'smoke-shop'], { cwd: dir, stdio: 'inherit' })
  execFileSync('node', [CLI, 'create', 'admin', 'smoke-admin'], { cwd: dir, stdio: 'inherit' })
  execFileSync('node', [CLI, 'create', 'member', 'smoke-portal', '--dir', '.'], { cwd: dir, stdio: 'inherit' })

  for (const app of ['smoke-shop', 'smoke-admin', 'smoke-portal']) {
    execFileSync('node', [CLI, 'doctor', app], { cwd: dir, stdio: 'inherit' })
    // Real-app baseline every kind must share.
    for (const rel of ['CLAUDE.md', 'tailwind.config.ts', 'postcss.config.js', 'src/plugins.generated.ts', 'src/registry.tsx']) {
      assert(existsSync(join(dir, app, rel)), `${app}/${rel} missing`)
    }
    assert(!existsSync(join(dir, app, 'src/lib/fayz-runtime.ts')), `${app} still ships the stub fayz-runtime`)
    contains(app, 'vite.config.ts', 'fayzVite')
    contains(app, 'src/styles.css', '@fayz-ai/ui/styles.css')
    // Every @fayz-ai dep must carry the stable release-channel pin.
    const pkg = JSON.parse(readFileSync(join(dir, app, 'package.json'), 'utf8'))
    for (const [dep, version] of Object.entries(pkg.dependencies)) {
      if (!dep.startsWith('@fayz-ai/')) continue
      assert(CHANNEL[dep] === version, `${app} pins ${dep}@${version}, release channel says ${CHANNEL[dep] ?? 'MISSING'}`)
    }
  }

  contains('smoke-shop', 'src/App.tsx', 'createStorefront(')
  contains('smoke-shop', 'src/config/catalog.ts', 'buildMockCatalog')
  contains('smoke-admin', 'src/App.tsx', 'defineSaas(')
  contains('smoke-admin', 'src/config/app.tsx', 'createDashboardPlugin')
  contains('smoke-portal', 'src/plugins.generated.ts', '@fayz-ai/portal')

  console.log('\n✓ CLI smoke passed')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
