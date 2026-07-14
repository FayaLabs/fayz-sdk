import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
  write(join(appRoot, '.env.example'), 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\nSUPABASE_PROJECT_REF=\nSUPABASE_PAT=\n')
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

  it('fails when the committed .env.example is missing', () => {
    const appRoot = createGeneratedApp()
    rmSync(join(appRoot, '.env.example'))

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /\.env\.example not found/)
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

  it('fails source imports from internal Fayz packages even when package.json stays public-only', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/app.tsx'),
      `
import { createFayzApp } from '@fayz-ai/saas'
import { createFayzShopProvider } from '@fayz-ai/sdk/shop'

export const app = createFayzApp({})
export const provider = createFayzShopProvider
`,
    )

    const result = runContract(appRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /src\/config\/app\.tsx imports internal Fayz package "@fayz-ai\/saas"/)
    assert.doesNotMatch(result.stderr, /@fayz-ai\/sdk\/shop/)
  })

  it('can explicitly allow internal imports for local SDK dogfood baselines', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/app.tsx'),
      `
import { createFayzApp } from '@fayz-ai/saas'

export const app = createFayzApp({})
`,
    )

    const result = runContract(appRoot, ['--strict', '--allow-internal-imports'])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Generated app contract check passed/)
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

  it('warns when product-specific commerce fields are defined at product top level', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/catalog.ts'),
      `
export const catalog = {
  categories: [{ name: 'Tintos' }],
  products: [{
    name: 'Tannat Reserva',
    price: 129.9,
    inventory: 12,
    sku: 'TIN-001',
    category: 'Tintos',
    vintage: '2021',
    region: 'Canelones',
  }],
}
`,
    )

    const compatibleResult = runContract(appRoot)
    const strictResult = runContract(appRoot, ['--strict'])

    assert.equal(compatibleResult.status, 0)
    assert.match(compatibleResult.stderr, /product-specific commerce fields/)
    assert.match(compatibleResult.stderr, /Product\.metadata/)
    assert.equal(strictResult.status, 1)
    assert.match(strictResult.stderr, /vintage/)
    assert.match(strictResult.stderr, /region/)
  })

  it('accepts product-specific commerce fields nested under Product.metadata', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/catalog.ts'),
      `
export const catalog = {
  categories: [{ name: 'Tintos' }],
  products: [{
    name: 'Tannat Reserva',
    price: 129.9,
    inventory: 12,
    sku: 'TIN-001',
    category: 'Tintos',
    metadata: {
      vintage: '2021',
      region: 'Canelones',
      pairing: 'Carnes grelhadas',
    },
  }],
}
`,
    )

    const result = runContract(appRoot, ['--strict'])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Generated app contract check passed/)
  })

  it('warns when a provider-backed shop omits the app-owned product metadata overlay', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/catalog.ts'),
      `
export const pulseCatalog = {
  categories: [{ name: 'Sneakers' }],
  products: [{
    name: 'Runner Vortex Neon',
    price: 599.9,
    sku: 'SNK-001',
    category: 'Sneakers',
    metadata: { sizes: ['38', '39', '40'], colorway: 'Neon / Preto' },
  }],
}
`,
    )
    write(
      join(appRoot, 'src/config/shop.ts'),
      `
import { createFayzShopProvider } from '@fayz-ai/sdk/shop'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
const storeId = import.meta.env.PUBLIC_FAYZ_STORE_ID

export const shopProvider = supabaseUrl && publishableKey && storeId
  ? createFayzShopProvider({ supabaseUrl, publishableKey, storeId })
  : undefined
`,
    )

    const compatibleResult = runContract(appRoot)
    const strictResult = runContract(appRoot, ['--strict'])

    assert.equal(compatibleResult.status, 0)
    assert.match(compatibleResult.stderr, /without productMetadata/)
    assert.match(compatibleResult.stderr, /provider-backed stores preserve variants/)
    assert.equal(strictResult.status, 1)
    assert.match(strictResult.stderr, /createFayzShopProvider without productMetadata/)
  })

  it('accepts provider-backed shops that pass app-owned product metadata overlays', () => {
    const appRoot = createGeneratedApp()
    write(
      join(appRoot, 'src/config/catalog.ts'),
      `
export const pulseCatalog = {
  categories: [{ name: 'Sneakers' }],
  products: [{
    name: 'Runner Vortex Neon',
    price: 599.9,
    sku: 'SNK-001',
    category: 'Sneakers',
    metadata: { sizes: ['38', '39', '40'], colorway: 'Neon / Preto' },
  }],
}
`,
    )
    write(
      join(appRoot, 'src/config/shop.ts'),
      `
import { createFayzShopProvider } from '@fayz-ai/sdk/shop'
import { pulseCatalog } from './catalog'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
const storeId = import.meta.env.PUBLIC_FAYZ_STORE_ID
const productMetadata = pulseCatalog.products.map((product) => ({
  sku: product.sku,
  slug: product.slug,
  metadata: product.metadata,
}))

export const shopProvider = supabaseUrl && publishableKey && storeId
  ? createFayzShopProvider({ supabaseUrl, publishableKey, storeId, productMetadata })
  : undefined
`,
    )

    const result = runContract(appRoot, ['--strict'])

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Generated app contract check passed/)
  })
})
