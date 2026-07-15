import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkDeps, checkHygiene, checkFull } from '../dist/lib/app-checks.js'

// A throwaway app directory with the given files. `files` maps a relative path
// to its contents; parent dirs are created as needed.
function scaffold(files) {
  const dir = mkdtempSync(join(tmpdir(), 'fayz-doctor-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true })
}

function errors(findings) {
  return findings.filter((f) => f.level === 'error')
}
function warnings(findings) {
  return findings.filter((f) => f.level === 'warning')
}

// ---------------------------------------------------------------------------
// deps
// ---------------------------------------------------------------------------

test('deps: file: / link: / workspace: / portal: / .tgz specs are errors', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({
      dependencies: {
        '@fayz-ai/core': '^0.7.2',
        'local-pkg': 'file:../local-pkg',
        'linked-pkg': 'link:../linked',
        'ws-pkg': 'workspace:*',
      },
      devDependencies: {
        'portal-pkg': 'portal:../p',
        'tarball-pkg': '../vendor/tarball-pkg-1.0.0.tgz',
      },
    }),
  })
  try {
    const found = checkDeps(dir)
    const errs = errors(found)
    assert.equal(errs.length, 5, 'five local/tarball specs flagged')
    assert.ok(errs.every((e) => e.rule === 'deps.local'))
    assert.ok(errs.every((e) => /will not resolve remotely/.test(e.detail)))
    // The clean semver dep is not flagged.
    assert.ok(!found.some((f) => f.detail.includes('@fayz-ai/core')))
  } finally {
    cleanup(dir)
  }
})

test('deps: clean package.json produces no findings offline', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({
      dependencies: { '@fayz-ai/core': '^0.7.2', react: '^18.0.0' },
    }),
  })
  try {
    assert.equal(checkDeps(dir).length, 0)
  } finally {
    cleanup(dir)
  }
})

test('deps: without --remote, no npm view is invoked', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({ dependencies: { '@fayz-ai/core': '^99.0.0' } }),
  })
  try {
    let called = false
    const found = checkDeps(dir, {
      npmView: () => {
        called = true
        return { satisfiable: false }
      },
    })
    assert.equal(called, false, 'npmView must not run without --remote')
    assert.equal(found.length, 0)
  } finally {
    cleanup(dir)
  }
})

test('deps --remote: unsatisfiable @fayz-ai range is an error (mocked npm view)', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({
      dependencies: { '@fayz-ai/core': '^0.7.2', '@fayz-ai/ui': '^99.0.0', react: '^18.0.0' },
    }),
  })
  try {
    const seen = []
    const npmView = (name, range) => {
      seen.push(`${name}@${range}`)
      return { satisfiable: name === '@fayz-ai/core' }
    }
    const found = checkDeps(dir, { remote: true, npmView })
    // react is not @fayz-ai/* → never queried.
    assert.deepEqual(seen.sort(), ['@fayz-ai/core@^0.7.2', '@fayz-ai/ui@^99.0.0'])
    const errs = errors(found)
    assert.equal(errs.length, 1)
    assert.match(errs[0].detail, /@fayz-ai\/ui@\^99\.0\.0/)
    assert.match(errs[0].detail, /no published version satisfies/)
  } finally {
    cleanup(dir)
  }
})

test('deps --remote: a lookup error is a warning, not an error', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({ dependencies: { '@fayz-ai/core': '^0.7.2' } }),
  })
  try {
    const found = checkDeps(dir, {
      remote: true,
      npmView: () => ({ satisfiable: false, error: 'getaddrinfo ENOTFOUND registry.npmjs.org' }),
    })
    assert.equal(errors(found).length, 0)
    const warns = warnings(found)
    assert.equal(warns.length, 1)
    assert.match(warns[0].detail, /could not verify/)
  } finally {
    cleanup(dir)
  }
})

// ---------------------------------------------------------------------------
// hygiene
// ---------------------------------------------------------------------------

test('hygiene: tracked .env / .env.local / .env.production are errors, .env.example is not', () => {
  const dir = scaffold({ 'package.json': '{}' })
  try {
    const tracked = ['.env', '.env.local', '.env.production', '.env.example', 'src/app.tsx']
    const found = checkHygiene(dir, { gitLsFiles: () => tracked })
    const errs = errors(found)
    assert.equal(errs.length, 3, '.env, .env.local, .env.production flagged')
    assert.ok(errs.every((e) => e.rule === 'hygiene.env-tracked'))
    assert.ok(errs.every((e) => /git rm --cached/.test(e.detail)))
    assert.ok(!errs.some((e) => e.detail.includes('.env.example')))
  } finally {
    cleanup(dir)
  }
})

test('hygiene: key material in a tracked file is an error (publishable, secret, JWT)', () => {
  const dir = scaffold({
    'package.json': '{}',
    'src/config.ts': "const key = 'sb_publishable_v8rbvLDgnq5IbkVB5B6LxQ_D62mfPZX'",
    'supabase/client.ts': "const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWYiOiJhYmNkZWZnaGlqa2xtbm9wcXJzdCJ9.aaaaaaaaaaaaaaaaaaaa'",
    'server/env.ts': "const s = 'sb_secret_0oLwf9HQabcdefghij'",
  })
  try {
    const found = checkHygiene(dir, { gitLsFiles: () => ['src/config.ts', 'supabase/client.ts', 'server/env.ts'] })
    const errs = found.filter((f) => f.rule === 'hygiene.key-material')
    assert.equal(errs.length, 3)
    assert.ok(errs.every((e) => e.level === 'error'))
    assert.ok(errs.some((e) => /publishable/.test(e.detail)))
    assert.ok(errs.some((e) => /secret/.test(e.detail)))
    assert.ok(errs.some((e) => /JWT/.test(e.detail)))
  } finally {
    cleanup(dir)
  }
})

test('hygiene: key placeholders in .env.example do not trigger key-material', () => {
  const dir = scaffold({
    'package.json': '{}',
    '.env.example': 'VITE_SUPABASE_ANON_KEY=sb_publishable_<pegue no dashboard do pool>\nVITE_SUPABASE_URL=https://<pool-ref>.supabase.co\n',
  })
  try {
    const found = checkHygiene(dir, { gitLsFiles: () => ['.env.example'] })
    assert.ok(!found.some((f) => f.rule === 'hygiene.key-material'))
  } finally {
    cleanup(dir)
  }
})

test('hygiene: outside a git repo, git-dependent checks are skipped silently', () => {
  const dir = scaffold({ 'package.json': '{}' })
  try {
    const found = checkHygiene(dir, { gitLsFiles: () => null })
    assert.equal(found.length, 0)
  } finally {
    cleanup(dir)
  }
})

test('hygiene: env var used in src but missing from .env.example is a warning', () => {
  const dir = scaffold({
    'package.json': '{}',
    '.env.example': 'VITE_SUPABASE_URL=\n# comment\nexport VITE_ANON_KEY=abc\n',
    'src/config.ts': [
      'const url = import.meta.env.VITE_SUPABASE_URL',
      'const key = import.meta.env.VITE_ANON_KEY',
      'const missing = import.meta.env.VITE_SECRET_TOKEN',
      'const svc = process.env.SERVICE_ROLE',
      'const env = process.env.NODE_ENV', // builtin — ignored
    ].join('\n'),
  })
  try {
    const found = checkHygiene(dir, { gitLsFiles: () => [] })
    const warns = warnings(found).filter((w) => w.rule === 'hygiene.env-undocumented')
    const names = warns.map((w) => w.detail.match(/"([^"]+)"/)[1]).sort()
    assert.deepEqual(names, ['SERVICE_ROLE', 'VITE_SECRET_TOKEN'])
  } finally {
    cleanup(dir)
  }
})

test('hygiene: two lockfiles present is a lockfile-drift warning', () => {
  const dir = scaffold({
    'package.json': '{}',
    'package-lock.json': '{}',
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
  })
  try {
    const found = checkHygiene(dir, { gitLsFiles: () => [] })
    const warns = warnings(found).filter((w) => w.rule === 'hygiene.lockfile-drift')
    assert.equal(warns.length, 1)
    assert.match(warns[0].detail, /lockfile drift/)
  } finally {
    cleanup(dir)
  }
})

test('hygiene: single lockfile is fine', () => {
  const dir = scaffold({ 'package.json': '{}', 'package-lock.json': '{}' })
  try {
    const found = checkHygiene(dir, { gitLsFiles: () => [] })
    assert.equal(found.filter((f) => f.rule === 'hygiene.lockfile-drift').length, 0)
  } finally {
    cleanup(dir)
  }
})

// ---------------------------------------------------------------------------
// --full
// ---------------------------------------------------------------------------

test('full: a failing build is an error carrying the tail of the output', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({ scripts: { build: 'exit 1', test: 'exit 0' } }),
  })
  try {
    const calls = []
    const run = (cmd, args) => {
      calls.push([cmd, ...args].join(' '))
      if (args.includes('build')) return { code: 2, output: 'line1\nline2\nBUILD FAILED\n' }
      return { code: 0, output: 'ok' }
    }
    const found = checkFull(dir, { run })
    assert.deepEqual(calls, ['npm run build', 'npm test'])
    const errs = errors(found)
    assert.equal(errs.length, 1)
    assert.equal(errs[0].rule, 'full.build')
    assert.match(errs[0].detail, /BUILD FAILED/)
  } finally {
    cleanup(dir)
  }
})

test('full: build + test both pass → no findings', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({ scripts: { build: 'true', test: 'true' } }),
  })
  try {
    const found = checkFull(dir, { run: () => ({ code: 0, output: '' }) })
    assert.equal(found.length, 0)
  } finally {
    cleanup(dir)
  }
})

test('full: a failing test is an error', () => {
  const dir = scaffold({
    'package.json': JSON.stringify({ scripts: { build: 'true', test: 'false' } }),
  })
  try {
    const run = (cmd, args) =>
      args.includes('test') ? { code: 1, output: '1 failing\nAssertionError\n' } : { code: 0, output: '' }
    const found = checkFull(dir, { run })
    const errs = errors(found)
    assert.equal(errs.length, 1)
    assert.equal(errs[0].rule, 'full.test')
  } finally {
    cleanup(dir)
  }
})

test('full: no build script → a warning, and test still runs if present', () => {
  const dir = scaffold({ 'package.json': JSON.stringify({ scripts: { test: 'true' } }) })
  try {
    const calls = []
    const found = checkFull(dir, {
      run: (cmd, args) => {
        calls.push([cmd, ...args].join(' '))
        return { code: 0, output: '' }
      },
    })
    assert.deepEqual(calls, ['npm test'])
    const warns = warnings(found).filter((w) => w.rule === 'full.build')
    assert.equal(warns.length, 1)
    assert.match(warns[0].detail, /no "build" script/)
  } finally {
    cleanup(dir)
  }
})
