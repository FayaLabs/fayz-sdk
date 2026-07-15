import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  collectDeployFiles,
  parseGitignore,
  isIgnored,
  MAX_FILE_BYTES,
  ALLOWED_EXTENSIONS,
} from '../dist/lib/deploy-files.js'

// Build a temp app tree from a { relPath: content } spec and return its root.
function fixture(spec) {
  const root = mkdtempSync(join(tmpdir(), 'p5-deploy-'))
  for (const [rel, content] of Object.entries(spec)) {
    const p = join(root, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, content)
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

function paths(result) {
  return result.files.map((f) => f.path)
}

// ---------------------------------------------------------------------------
// Collection: happy path + fixed excludes
// ---------------------------------------------------------------------------

test('collects source files and excludes node_modules/dist/.git/.next/.fayz', () => {
  const { root, cleanup } = fixture({
    'package.json': '{"name":"shop"}',
    'src/main.tsx': 'export const x = 1',
    'src/lib/util.ts': 'export const y = 2',
    'index.html': '<html></html>',
    'app.manifest.json': '{}',
    'node_modules/react/index.js': 'module.exports = {}',
    'dist/bundle.js': 'built',
    '.git/config': '[core]',
    '.next/cache': 'x',
    '.fayz/project.json': '{"projectId":"p"}',
  })
  try {
    const res = collectDeployFiles(root)
    const p = paths(res)
    assert.deepEqual(p, [
      'app.manifest.json',
      'index.html',
      'package.json',
      'src/lib/util.ts',
      'src/main.tsx',
    ])
    assert.ok(!p.some((x) => x.includes('node_modules')))
    assert.ok(!p.some((x) => x.startsWith('dist/')))
    assert.ok(!p.some((x) => x.startsWith('.git/')))
    assert.ok(!p.some((x) => x.startsWith('.next/')))
    assert.ok(!p.some((x) => x.startsWith('.fayz/')))
  } finally {
    cleanup()
  }
})

test('.env* are excluded except .env.example', () => {
  const { root, cleanup } = fixture({
    'src/a.ts': 'a',
    '.env': 'SECRET=1',
    '.env.local': 'SECRET=2',
    '.env.production': 'SECRET=3',
    '.env.example': 'SECRET=',
  })
  try {
    const p = paths(collectDeployFiles(root))
    assert.ok(p.includes('.env.example'))
    assert.ok(!p.includes('.env'))
    assert.ok(!p.includes('.env.local'))
    assert.ok(!p.includes('.env.production'))
  } finally {
    cleanup()
  }
})

// ---------------------------------------------------------------------------
// Extension allowlist + size cap
// ---------------------------------------------------------------------------

test('non-allowlisted extensions are skipped with reason "extension"', () => {
  const { root, cleanup } = fixture({
    'src/a.ts': 'a',
    'logo.jpg': 'binary-ish',
    'font.woff2': 'binary',
    'data.bin': 'binary',
    'icon.png': 'pngdata',
  })
  try {
    const res = collectDeployFiles(root)
    const p = paths(res)
    assert.ok(p.includes('src/a.ts'))
    assert.ok(p.includes('icon.png')) // png IS allowlisted
    assert.ok(!p.includes('logo.jpg'))
    const skippedPaths = res.skipped.map((s) => s.path)
    assert.ok(skippedPaths.includes('logo.jpg'))
    assert.ok(skippedPaths.includes('font.woff2'))
    assert.ok(skippedPaths.includes('data.bin'))
    for (const s of res.skipped) assert.equal(s.reason, 'extension')
  } finally {
    cleanup()
  }
})

test('files over the size cap are skipped with reason "size"', () => {
  const { root, cleanup } = fixture({
    'src/small.ts': 'ok',
    'src/big.json': 'x'.repeat(MAX_FILE_BYTES + 1),
  })
  try {
    const res = collectDeployFiles(root)
    const p = paths(res)
    assert.ok(p.includes('src/small.ts'))
    assert.ok(!p.includes('src/big.json'))
    const big = res.skipped.find((s) => s.path === 'src/big.json')
    assert.ok(big)
    assert.equal(big.reason, 'size')
    assert.ok(big.bytes > MAX_FILE_BYTES)
  } finally {
    cleanup()
  }
})

test('a custom maxBytes cap is honored', () => {
  const { root, cleanup } = fixture({ 'a.ts': 'x'.repeat(100) })
  try {
    const res = collectDeployFiles(root, { maxBytes: 50 })
    assert.equal(res.files.length, 0)
    assert.equal(res.skipped[0].reason, 'size')
  } finally {
    cleanup()
  }
})

test('png within cap is uploaded but oversized png is skipped', () => {
  assert.ok(ALLOWED_EXTENSIONS.has('.png'))
  const { root, cleanup } = fixture({
    'ok.png': 'small',
    'huge.png': 'x'.repeat(MAX_FILE_BYTES + 10),
  })
  try {
    const res = collectDeployFiles(root)
    assert.ok(paths(res).includes('ok.png'))
    assert.ok(res.skipped.find((s) => s.path === 'huge.png' && s.reason === 'size'))
  } finally {
    cleanup()
  }
})

// ---------------------------------------------------------------------------
// .gitignore subset
// ---------------------------------------------------------------------------

test('.gitignore excludes matching files and directories', () => {
  const { root, cleanup } = fixture({
    '.gitignore': '# comment\nsecret.ts\nbuild/\n*.log\n/root-only.ts\n',
    'keep.ts': 'a',
    'secret.ts': 'b',
    'nested/secret.ts': 'c', // unanchored basename → also ignored
    'build/out.js': 'd',
    'app.log': 'e',
    'root-only.ts': 'f',
    'sub/root-only.ts': 'g', // anchored → NOT ignored
  })
  try {
    const p = paths(collectDeployFiles(root))
    assert.ok(p.includes('keep.ts'))
    assert.ok(!p.includes('secret.ts'))
    assert.ok(!p.includes('nested/secret.ts'))
    assert.ok(!p.some((x) => x.startsWith('build/')))
    assert.ok(!p.includes('app.log'))
    assert.ok(!p.includes('root-only.ts')) // anchored to root
    assert.ok(p.includes('sub/root-only.ts')) // not at root → kept
  } finally {
    cleanup()
  }
})

test('parseGitignore skips negations and comments; dirOnly flag set for trailing slash', () => {
  const rules = parseGitignore(['# c', '', '!keep.ts', 'dist/', '*.tmp'].join('\n'))
  // negation + comment + blank dropped → 2 rules
  assert.equal(rules.length, 2)
  assert.equal(rules[0].dirOnly, true)
  assert.equal(rules[1].dirOnly, false)
})

test('isIgnored respects dirOnly (only matches directories)', () => {
  const rules = parseGitignore('cache/\n')
  assert.equal(isIgnored('cache', true, rules), true)
  assert.equal(isIgnored('cache', false, rules), false) // a FILE named cache is kept
})

// ---------------------------------------------------------------------------
// Purity: injectable IO, no real fs
// ---------------------------------------------------------------------------

test('collectDeployFiles runs entirely on injectable IO (no real fs)', () => {
  const tree = {
    '/app': [
      { name: 'src', isDirectory: true, isFile: false },
      { name: 'index.html', isDirectory: false, isFile: true },
      { name: 'huge.png', isDirectory: false, isFile: true },
    ],
    '/app/src': [{ name: 'main.ts', isDirectory: false, isFile: true }],
  }
  const sizes = { '/app/index.html': 10, '/app/src/main.ts': 20, '/app/huge.png': MAX_FILE_BYTES + 1 }
  const contents = { '/app/index.html': '<html>', '/app/src/main.ts': 'code' }
  const res = collectDeployFiles('/app', {
    readDir: (d) => tree[d] ?? [],
    readFile: (p) => contents[p] ?? '',
    fileSize: (p) => sizes[p] ?? 0,
    fileExists: () => false, // no .gitignore
  })
  assert.deepEqual(paths(res), ['index.html', 'src/main.ts'])
  assert.ok(res.skipped.find((s) => s.path === 'huge.png' && s.reason === 'size'))
  assert.equal(res.totalBytes, 30)
})
