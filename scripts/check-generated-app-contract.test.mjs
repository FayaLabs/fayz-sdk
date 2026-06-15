import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = resolve(repoRoot, 'scripts/check-generated-app-contract.mjs')

function write(path, content = '') {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function createGeneratedApp() {
  const appRoot = mkdtempSync(join(tmpdir(), 'fayz-contract-app-'))
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
  return appRoot
}

function runContract(appRoot, args = []) {
  return spawnSync('node', [script, appRoot, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

describe('generated app contract gate', () => {
  it('passes a manifest surface page registered in the app registry', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'app.manifest.json'),
      JSON.stringify({
        manifestVersion: 2,
        id: 'generated-app',
        name: 'Generated App',
        surfaces: {
          admin: {
            pages: [
              {
                route: '/ops',
                label: 'Operations Room',
                component: 'custom:runtime.OperationsRoom',
              },
            ],
          },
        },
      }),
    )
    write(join(appRoot, 'src/registry.tsx'), "export const appRegistry = { pages: { 'custom:runtime.OperationsRoom': () => null } }\n")

    const result = runContract(appRoot)

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Generated app contract check passed/)
  })

  it('warns on path-only custom route refs and fails them in strict mode', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'app.manifest.json'),
      JSON.stringify({
        manifestVersion: 2,
        id: 'generated-app',
        name: 'Generated App',
        surfaces: {
          admin: {
            pages: [
              {
                path: '/ops',
                label: 'Operations Room',
                component: 'custom:runtime.OperationsRoom',
              },
            ],
          },
        },
      }),
    )
    write(join(appRoot, 'src/registry.tsx'), "export const appRegistry = { pages: { 'custom:runtime.OperationsRoom': () => null } }\n")

    const compatibleResult = runContract(appRoot)
    const strictResult = runContract(appRoot, ['--strict'])

    assert.equal(compatibleResult.status, 0)
    assert.match(compatibleResult.stderr, /without pages\[\]\.route/)
    assert.equal(strictResult.status, 1)
    assert.match(strictResult.stderr, /Generated app contract check failed in strict mode/)
    assert.match(strictResult.stderr, /pages\[\]\.path is compatibility only/)
  })

  it('fails top-level routes because the generated runtime reads surface pages', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'app.manifest.json'),
      JSON.stringify({
        manifestVersion: 2,
        id: 'generated-app',
        name: 'Generated App',
        routes: [
          {
            path: '/ops',
            component: 'custom:runtime.OperationsRoom',
          },
        ],
      }),
    )

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /uses top-level routes/)
  })

  it('fails manifests that omit the strict v2 manifest version', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'app.manifest.json'),
      JSON.stringify({
        id: 'generated-app',
        name: 'Generated App',
        surfaces: {
          admin: {
            pages: [],
          },
        },
      }),
    )

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /must use manifestVersion 2/)
  })

  it('fails manifests that bump the manifest version without migration support', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'app.manifest.json'),
      JSON.stringify({
        manifestVersion: 3,
        id: 'generated-app',
        name: 'Generated App',
        surfaces: {
          admin: {
            pages: [],
          },
        },
      }),
    )

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /approved SDK\/API manifest migration/)
  })

  it('fails surface page component refs that are not registered', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'app.manifest.json'),
      JSON.stringify({
        manifestVersion: 2,
        id: 'generated-app',
        name: 'Generated App',
        surfaces: {
          admin: {
            pages: [
              {
                path: '/ops',
                component: 'custom:runtime.Missing',
              },
            ],
          },
        },
      }),
    )
    write(join(appRoot, 'src/registry.tsx'), "export const appRegistry = { pages: {} }\n")

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /custom:runtime\.Missing/)
  })

  it('fails the stale scaffold placeholder index page', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/pages/Index.tsx'),
      `
const Index = () => (
  <main>
    <h1>Welcome to Your Blank App</h1>
    <p>Start building your amazing project here!</p>
  </main>
)

export default Index
`,
    )

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /scaffold placeholder/)
  })

  it('warns when backend url can become an empty env string and fails it in strict mode', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/shop.ts'),
      `
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL

export const shopBackend = {
  provider: supabaseUrl ? 'fayz-shop' : 'mock',
  url: supabaseUrl,
}
`,
    )

    const compatibleResult = runContract(appRoot)
    const strictResult = runContract(appRoot, ['--strict'])

    assert.equal(compatibleResult.status, 0)
    assert.match(compatibleResult.stderr, /assigns backend\.url directly/)
    assert.equal(strictResult.status, 1)
    assert.match(strictResult.stderr, /mock\/no-provider apps/)
  })

  it('accepts backend url env values guarded to undefined', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/shop.ts'),
      `
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL

export const shopBackend = {
  provider: supabaseUrl ? 'fayz-shop' : 'mock',
  url: supabaseUrl || undefined,
}
`,
    )

    const result = runContract(appRoot, ['--strict'])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Generated app contract check passed/)
  })
})
