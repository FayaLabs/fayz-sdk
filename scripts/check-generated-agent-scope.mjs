#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const staged = args.includes('--staged')
const json = args.includes('--json')
const baseIndex = args.indexOf('--base')
const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : undefined
const pathsIndex = args.indexOf('--paths')
const explicitPaths = pathsIndex >= 0
  ? (args[pathsIndex + 1] ?? '')
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
  : undefined
const valueIndexes = new Set([
  ...(baseIndex >= 0 ? [baseIndex + 1] : []),
  ...(pathsIndex >= 0 ? [pathsIndex + 1] : []),
])
const appPathArg = args.find((arg, index) =>
  !arg.startsWith('--') &&
  !valueIndexes.has(index)
)

if (!appPathArg || (baseIndex >= 0 && !baseRef) || (pathsIndex >= 0 && explicitPaths?.length === 0)) {
  console.error('Usage: pnpm check:generated-agent-scope <path-to-generated-app> [--base <git-ref>] [--staged] [--paths <comma-separated-paths>] [--json] [--strict]')
  process.exit(2)
}

const appRoot = resolve(process.cwd(), appPathArg)
if (!existsSync(appRoot)) {
  console.error(`Generated app path not found: ${appRoot}`)
  process.exit(2)
}

function git(args) {
  const run = spawnSync('git', ['-C', appRoot, ...args], {
    encoding: 'utf8',
  })
  if (run.status !== 0) {
    const output = [run.stdout, run.stderr].filter(Boolean).join('\n').trim()
    throw new Error(output || `git ${args.join(' ')} failed`)
  }
  return run.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function changedFiles() {
  if (explicitPaths) return Array.from(new Set(explicitPaths)).sort()
  if (staged) return git(['diff', '--name-only', '--cached', '--diff-filter=ACMRTUXB', '--'])
  if (baseRef) return git(['diff', '--name-only', '--diff-filter=ACMRTUXB', baseRef, '--'])

  const tracked = git(['diff', '--name-only', '--diff-filter=ACMRTUXB', '--'])
  const untracked = git(['ls-files', '--others', '--exclude-standard'])
  return Array.from(new Set([...tracked, ...untracked])).sort()
}

const appOwnedFiles = new Set([
  'app.manifest.json',
  'src/App.tsx',
  'src/main.tsx',
  'src/styles.css',
  'src/registry.tsx',
  'src/app.manifest.json',
])

const appOwnedPrefixes = [
  'src/config/',
  'src/custom/',
  'src/pages/',
  'src/components/',
  'src/types/',
  'src/data/',
  'src/i18n/',
  'src/assets/',
  'public/',
]

const reviewFiles = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'vite.config.ts',
  'vite.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'tailwind.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'playwright.config.ts',
])

const reviewPrefixes = [
  'docs/',
  'supabase/migrations/',
  'src/images.',
]

const blockedPrefixes = [
  'node_modules/',
  'dist/',
  'src/plugins/',
  'src/runtime/',
  'src/app-runtime/',
  'src/integrations/supabase/',
  'src/lib/supabase/',
  'src/api/supabase/',
]

const blockedFiles = new Set([
  '.npmrc',
])

function startsWithAny(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix))
}

function classify(file) {
  if (blockedFiles.has(file) || startsWithAny(file, blockedPrefixes)) {
    return 'blocked'
  }

  if (appOwnedFiles.has(file) || startsWithAny(file, appOwnedPrefixes)) {
    return 'app-owned'
  }

  if (reviewFiles.has(file) || startsWithAny(file, reviewPrefixes)) {
    return 'review'
  }

  return 'review'
}

let files
try {
  files = changedFiles()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}

const rows = files.map((file) => ({ file, scope: classify(file) }))
const blocked = rows.filter((row) => row.scope === 'blocked')
const review = rows.filter((row) => row.scope === 'review')
const failed = blocked.length > 0 || (strict && review.length > 0)

if (json) {
  console.log(JSON.stringify({
    status: failed ? 'fail' : 'pass',
    strict,
    files: rows,
    counts: {
      appOwned: rows.filter((row) => row.scope === 'app-owned').length,
      review: review.length,
      blocked: blocked.length,
    },
    blocked: blocked.map((row) => row.file),
    review: review.map((row) => row.file),
  }, null, 2))
} else {
  console.log('Generated app agent edit scope')
  console.log('')
  console.log('| Scope | File |')
  console.log('|---|---|')

  if (files.length === 0) {
    console.log('| clean | - |')
  } else {
    for (const row of rows) {
      console.log(`| ${row.scope} | ${row.file} |`)
    }
  }
}

if (failed) {
  console.error('')
  console.error('Generated app agent edit scope failed:')
  if (blocked.length > 0) {
    console.error('  - blocked files require SDK/internal work or explicit human approval:')
    for (const row of blocked) console.error(`    - ${row.file}`)
  }
  if (strict && review.length > 0) {
    console.error('  - review files require explicit approval in strict mode:')
    for (const row of review) console.error(`    - ${row.file}`)
  }
  process.exit(1)
}
