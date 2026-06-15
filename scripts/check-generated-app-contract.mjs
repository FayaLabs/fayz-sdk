#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const targetArg = process.argv[2]
if (!targetArg) {
  console.error('Usage: pnpm check:generated-app <path-to-generated-app>')
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

if (hasFile('src/App.tsx')) {
  const appLines = readFileSync(join(root, 'src/App.tsx'), 'utf8').split('\n').length
  if (appLines > 80) {
    warn(`src/App.tsx has ${appLines} lines. Prefer a tiny App.tsx that imports app config/manifest from src/config.`)
  }
}

if (!hasFile('src/config') && !hasFile('src/app.manifest.json')) {
  warn('No src/config directory or src/app.manifest.json found. Generated apps should keep business config separate from entrypoints.')
}

const sourceFiles = walk(join(root, 'src')).filter((path) => /\.(ts|tsx|js|jsx)$/.test(path))
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

if (problems.length > 0) {
  console.error('Generated app contract check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`Generated app contract check passed for ${root}`)
