#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const args = process.argv.slice(2)
const strictWarnings = args.includes('--strict')
const targetArg = args.find((arg) => !arg.startsWith('--'))
if (!targetArg) {
  console.error('Usage: pnpm check:generated-app <path-to-generated-app> [--strict]')
  process.exit(2)
}

const root = resolve(process.cwd(), targetArg)
const problems = []
const warnings = []

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, acc)
    else acc.push(path)
  }
  return acc
}

function hasFile(path) {
  return existsSync(join(root, path))
}

function fail(message) {
  problems.push(message)
}

function warn(message) {
  warnings.push(message)
}

function collectSurfacePageComponents(manifest) {
  const refs = []
  const surfaces = manifest?.surfaces && typeof manifest.surfaces === 'object' ? manifest.surfaces : {}

  for (const [surfaceName, surface] of Object.entries(surfaces)) {
    if (!surface || typeof surface !== 'object' || !Array.isArray(surface.pages)) continue

    surface.pages.forEach((page, index) => {
      if (!page || typeof page !== 'object' || typeof page.component !== 'string' || page.component.length === 0) return
      refs.push({
        component: page.component,
        path: page.path,
        route: page.route,
        surface: surfaceName,
        index,
      })
    })
  }

  return refs
}

const commerceMetadataKeys = new Set([
  'color',
  'colorway',
  'fit',
  'material',
  'pairing',
  'region',
  'size',
  'sizes',
  'variant',
  'variants',
  'vintage',
])

function extractBalanced(text, openIndex, openChar, closeChar) {
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = null
      }
      continue
    }
    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === openChar) {
      depth += 1
      continue
    }
    if (char === closeChar) {
      depth -= 1
      if (depth === 0) return text.slice(openIndex + 1, index)
    }
  }

  return null
}

function extractTopLevelObjects(text) {
  const objects = []
  let depth = 0
  let start = -1
  let quote = null
  let escaped = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') {
      if (depth === 0) start = index
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start + 1, index))
        start = -1
      }
    }
  }

  return objects
}

function collectTopLevelPropertyNames(objectText) {
  const properties = []
  let segmentStart = 0
  let curlyDepth = 0
  let squareDepth = 0
  let parenDepth = 0
  let quote = null
  let escaped = false

  function pushSegment(end) {
    const segment = objectText.slice(segmentStart, end)
    const match = segment.match(/^\s*(?:['"]?)([A-Za-z_$][\w$-]*)['"]?\s*:/)
    if (match) properties.push(match[1])
  }

  for (let index = 0; index < objectText.length; index += 1) {
    const char = objectText[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') curlyDepth += 1
    else if (char === '}') curlyDepth -= 1
    else if (char === '[') squareDepth += 1
    else if (char === ']') squareDepth -= 1
    else if (char === '(') parenDepth += 1
    else if (char === ')') parenDepth -= 1
    else if (char === ',' && curlyDepth === 0 && squareDepth === 0 && parenDepth === 0) {
      pushSegment(index)
      segmentStart = index + 1
    }
  }

  pushSegment(objectText.length)
  return properties
}

function collectTopLevelCommerceProductFields(text) {
  const fields = new Set()
  const productPropertyPattern = /\bproducts\s*:/g

  for (const match of text.matchAll(productPropertyPattern)) {
    const arrayStart = text.indexOf('[', match.index)
    if (arrayStart === -1) continue
    const arrayText = extractBalanced(text, arrayStart, '[', ']')
    if (!arrayText) continue

    for (const productObject of extractTopLevelObjects(arrayText)) {
      for (const property of collectTopLevelPropertyNames(productObject)) {
        if (commerceMetadataKeys.has(property)) fields.add(property)
      }
    }
  }

  return Array.from(fields).sort()
}

function collectCommerceProductMetadataFields(text) {
  const fields = new Set()
  const productPropertyPattern = /\bproducts\s*:/g

  for (const match of text.matchAll(productPropertyPattern)) {
    const arrayStart = text.indexOf('[', match.index)
    if (arrayStart === -1) continue
    const arrayText = extractBalanced(text, arrayStart, '[', ']')
    if (!arrayText) continue

    for (const productObject of extractTopLevelObjects(arrayText)) {
      const metadataMatch = /\bmetadata\s*:/.exec(productObject)
      if (!metadataMatch) continue
      const metadataStart = productObject.indexOf('{', metadataMatch.index)
      if (metadataStart === -1) continue
      const metadataText = extractBalanced(productObject, metadataStart, '{', '}')
      if (!metadataText) continue
      for (const property of collectTopLevelPropertyNames(metadataText)) {
        if (commerceMetadataKeys.has(property)) fields.add(property)
      }
    }
  }

  return Array.from(fields).sort()
}

const packageJsonPath = join(root, 'package.json')
if (!existsSync(packageJsonPath)) fail('package.json not found')

if (existsSync(packageJsonPath)) {
  const pkg = readJson(packageJsonPath)
  const dependencyGroups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
  for (const group of dependencyGroups) {
    const deps = pkg[group] ?? {}
    for (const name of Object.keys(deps)) {
      if (name.startsWith('@fayz-ai/') && name !== '@fayz-ai/sdk') {
        fail(`${group}.${name} is an internal Fayz package. Generated apps should depend publicly only on @fayz-ai/sdk.`)
      }
      if (name.startsWith('@fayz/') || name === '@fayz/shop-core' || name === 'saas-core') {
        fail(`${group}.${name} is a legacy Fayz package reference.`)
      }
    }
  }

  if (!pkg.dependencies?.['@fayz-ai/sdk'] && !pkg.devDependencies?.['@fayz-ai/sdk']) {
    warn('package.json does not include @fayz-ai/sdk. API-only or app-shell-bundled repos may be intentional, but generated apps should normally include it.')
  }

  if (!pkg.scripts?.build) warn('package.json has no build script; generated apps need a repeatable build gate.')
  if (!pkg.scripts?.typecheck) warn('package.json has no typecheck script; generated apps need a repeatable type gate.')
}

const npmrcPath = join(root, '.npmrc')
if (existsSync(npmrcPath)) {
  const npmrc = readFileSync(npmrcPath, 'utf8')
  if (npmrc.includes('npm.pkg.github.com') || npmrc.includes('NODE_AUTH_TOKEN')) {
    fail('.npmrc contains GitHub Packages auth wiring. Generated apps must use public npm for @fayz-ai/sdk.')
  }
}

const sourceImportPattern = /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](@fayz-ai\/[^'"]+)['"]|import\s*\(\s*['"](@fayz-ai\/[^'"]+)['"]\s*\)/g
for (const file of walk(root)) {
  if (!/\.(?:cjs|mjs|js|jsx|ts|tsx)$/.test(file)) continue
  const rel = relative(root, file)
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(sourceImportPattern)) {
    const specifier = match[1] ?? match[2]
    if (!specifier) continue
    if (specifier === '@fayz-ai/sdk' || specifier.startsWith('@fayz-ai/sdk/')) continue
    fail(`${rel} imports internal Fayz package "${specifier}". Generated apps should import public SDK APIs from @fayz-ai/sdk or use platform-bundled adapters.`)
  }
}

if (hasFile('src/App.tsx')) {
  const appLines = readFileSync(join(root, 'src/App.tsx'), 'utf8').split('\n').length
  if (appLines > 80) {
    warn(`src/App.tsx has ${appLines} lines. Prefer a tiny App.tsx that imports app config/manifest from src/config.`)
  }
}

if (hasFile('src/pages/Index.tsx')) {
  const indexText = readFileSync(join(root, 'src/pages/Index.tsx'), 'utf8')
  if (indexText.includes('Welcome to Your Blank App') || indexText.includes('Start building your amazing project here')) {
    fail('src/pages/Index.tsx still contains the scaffold placeholder. Generated apps must render app content or delegate to the manifest runtime.')
  }
}

const rootManifestPath = join(root, 'app.manifest.json')
const srcManifestPath = join(root, 'src/app.manifest.json')
const manifestPath = existsSync(rootManifestPath) ? rootManifestPath : existsSync(srcManifestPath) ? srcManifestPath : null

if (!hasFile('src/config') && !manifestPath) {
  warn('No src/config directory or src/app.manifest.json found. Generated apps should keep business config separate from entrypoints.')
}

if (manifestPath) {
  try {
    const manifest = readJson(manifestPath)
    const manifestRel = relative(root, manifestPath)

    if (manifest.manifestVersion !== 2) {
      fail(`${manifestRel} must use manifestVersion 2. Do not bump or omit this field without an approved SDK/API manifest migration.`)
    }

    if (Array.isArray(manifest.routes) && manifest.routes.length > 0) {
      fail(`${manifestRel} uses top-level routes. Current generated runtime resolves pages from surfaces.<surface>.pages; route overrides must be declared there or the runtime must explicitly support routes.`)
    }

    const componentRefs = collectSurfacePageComponents(manifest)
    for (const ref of componentRefs) {
      if (typeof ref.route !== 'string' || ref.route.length === 0) {
        warn(`${manifestRel} surfaces.${ref.surface}.pages[${ref.index}] uses component "${ref.component}" without pages[].route. pages[].path is compatibility only; new custom routes should use pages[].route.`)
      }
    }

    if (componentRefs.length > 0) {
      const registryPath = join(root, 'src/registry.tsx')
      if (!existsSync(registryPath)) {
        fail(`${manifestRel} references surface page components, but src/registry.tsx was not found.`)
      } else {
        const registryText = readFileSync(registryPath, 'utf8')
        for (const ref of componentRefs) {
          if (!registryText.includes(ref.component)) {
            fail(`${manifestRel} surfaces.${ref.surface}.pages[${ref.index}].component "${ref.component}" is not registered in src/registry.tsx.`)
          }
        }
      }
    }
  } catch (error) {
    fail(`${relative(root, manifestPath)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const sourceFiles = walk(join(root, 'src')).filter((path) => /\.(ts|tsx|js|jsx)$/.test(path))
const fayzShopProviderFiles = []
let appOwnedCommerceMetadata = false

for (const path of sourceFiles) {
  const rel = relative(root, path)
  const text = readFileSync(path, 'utf8')

  if (text.includes('@supabase/supabase-js')) {
    const runtimeSupabaseImport = text
      .split('\n')
      .some((line) =>
        line.includes('@supabase/supabase-js') &&
        /^\s*import\s+(?!type\b)/.test(line)
      )
    if (runtimeSupabaseImport || /\bcreateClient\s*</.test(text) || /\bcreateClient\s*\(/.test(text)) {
      fail(`${rel} imports @supabase/supabase-js at runtime. Default generated apps should use @fayz-ai/sdk/Fayz broker or an explicit adapter file.`)
    } else {
      warn(`${rel} imports Supabase types only. Prefer SDK-owned shared types when available.`)
    }
  }

  if (/service_role|refresh_token|client_secret|SUPABASE_SERVICE|GOOGLE_CLIENT_SECRET|STRIPE_SECRET/i.test(text)) {
    fail(`${rel} appears to reference provider secrets. Secrets and refresh tokens must stay server-side in Fayz.`)
  }

  if (text.includes('npm.pkg.github.com') || text.includes('NODE_AUTH_TOKEN')) {
    fail(`${rel} references GitHub Packages auth. Generated apps should not require package registry credentials.`)
  }

  const directBackendUrlPattern =
    /\burl\s*:\s*(?:import\.meta\.env\.[A-Z0-9_]+|(?:supabase|backend|api|fayz)[A-Za-z0-9_]*Url)\s*(?:[,}\n]|$)/i
  if (directBackendUrlPattern.test(text)) {
    warn(`${rel} assigns backend.url directly from an env/url variable. Use "url: value || undefined" so mock/no-provider apps do not emit an empty manifest backend URL.`)
  }

  const topLevelCommerceFields = collectTopLevelCommerceProductFields(text)
  if (topLevelCommerceFields.length > 0) {
    warn(`${rel} defines product-specific commerce fields at product top level (${topLevelCommerceFields.join(', ')}). Put client-domain attributes under Product.metadata so SDK/shop primitives preserve them across mock and provider-backed catalogs.`)
  }

  if (collectCommerceProductMetadataFields(text).length > 0) {
    appOwnedCommerceMetadata = true
  }

  if (text.includes('createFayzShopProvider(')) {
    fayzShopProviderFiles.push({ rel, hasProductMetadata: /\bproductMetadata\b/.test(text) })
  }
}

if (appOwnedCommerceMetadata) {
  for (const file of fayzShopProviderFiles) {
    if (!file.hasProductMetadata) {
      warn(`${file.rel} configures createFayzShopProvider without productMetadata while the app owns commerce Product.metadata. Pass a typed productMetadata overlay from app-owned catalog products so provider-backed stores preserve variants/custom attributes; backend metadata remains source of truth when present.`)
    }
  }
}

const integrationDirs = [
  'src/integrations/supabase',
  'src/lib/supabase',
  'src/api/supabase',
]
for (const dir of integrationDirs) {
  if (hasFile(dir)) {
    warn(`${dir} exists. Keep direct providers behind an explicit optional adapter; default app data access should go through @fayz-ai/sdk/Fayz broker.`)
  }
}

const localEngineDirs = [
  'src/plugins',
  'src/runtime',
  'src/app-runtime',
]
for (const dir of localEngineDirs) {
  if (hasFile(dir)) {
    warn(`${dir} exists. Generated apps should prefer app-owned config/pages/custom routes and reusable SDK/internal engines; local engine copies require explicit review.`)
  }
}

for (const warning of warnings) console.warn(`Warning: ${warning}`)

if (strictWarnings && warnings.length > 0) {
  console.error('Generated app contract check failed in strict mode:')
  for (const warning of warnings) console.error(`  - ${warning}`)
  process.exit(1)
}

if (problems.length > 0) {
  console.error('Generated app contract check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`Generated app contract check passed for ${root}`)
