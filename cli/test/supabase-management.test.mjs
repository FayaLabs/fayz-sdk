import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  confirmationGate,
  createManagementClient,
  executeMigrationPlan,
  MigrationExecutionError,
  ManagementApiError,
  missingEnvMessage,
  parseDotenv,
  resolveSupabaseEnv,
} from '../dist/lib/supabase-management.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A mocked fetch that records calls and returns a scripted response per call. */
function mockFetch(responder) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    const scripted = responder(calls.length - 1, url, init)
    const { ok = true, status = 200, statusText = 'OK', body = '[]' } = scripted ?? {}
    return {
      ok,
      status,
      statusText,
      async text() {
        return body
      },
    }
  }
  return { fetchImpl, calls }
}

/** Write real SQL files on disk and return a MigrationPlan referencing them. */
function planWithFiles(spec) {
  const root = mkdtempSync(join(tmpdir(), 'a3b-exec-'))
  const steps = spec.map((s, i) => {
    const files = s.files.map((name) => {
      const p = join(root, name)
      mkdirSync(join(p, '..'), { recursive: true })
      writeFileSync(p, `-- ${name}\nSELECT 1;\n`)
      return p
    })
    return { order: i + 1, source: s.source, id: s.id, files }
  })
  const totalFiles = steps.reduce((n, s) => n + s.files.length, 0)
  return {
    plan: { appDir: root, steps, notes: [], totalFiles },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

// ---------------------------------------------------------------------------
// Executor — happy path
// ---------------------------------------------------------------------------

test('executor happy path: correct URL/auth/body per file, in order, + final NOTIFY', async () => {
  const { plan, cleanup } = planWithFiles([
    { source: 'spine', id: '@fayz-ai/db', files: ['a/001.sql', 'a/002.sql'] },
    { source: 'plugin', id: 'crm', files: ['b/001.sql'] },
  ])
  const { fetchImpl, calls } = mockFetch(() => ({ ok: true, body: '[]' }))
  try {
    const client = createManagementClient({
      projectRef: 'proj-ref-xyz',
      accessToken: 'sbp_test_token',
      fetchImpl,
    })
    const result = await executeMigrationPlan(plan, client)

    // 3 SQL files + 1 NOTIFY = 4 calls
    assert.equal(calls.length, 4)
    assert.equal(result.filesApplied, 3)
    assert.equal(result.stepsApplied, 2)

    for (const c of calls) {
      assert.equal(c.url, 'https://api.supabase.com/v1/projects/proj-ref-xyz/database/query')
      assert.equal(c.init.method, 'POST')
      assert.equal(c.init.headers.Authorization, 'Bearer sbp_test_token')
      assert.equal(c.init.headers['Content-Type'], 'application/json')
    }
    // ordering: file 001, 002, then plugin 001, then NOTIFY
    const queries = calls.map((c) => JSON.parse(c.init.body).query)
    assert.match(queries[0], /001\.sql/)
    assert.match(queries[1], /002\.sql/)
    assert.match(queries[2], /-- b\/001\.sql/)
    assert.equal(queries[3], "NOTIFY pgrst, 'reload schema';")
  } finally {
    cleanup()
  }
})

// ---------------------------------------------------------------------------
// Executor — failure mid-plan
// ---------------------------------------------------------------------------

test('executor stops at first failure, names the file, makes no further calls', async () => {
  const { plan, cleanup } = planWithFiles([
    { source: 'spine', id: '@fayz-ai/db', files: ['a/001.sql', 'a/002.sql'] },
    { source: 'plugin', id: 'crm', files: ['b/001.sql'] },
  ])
  // Fail on the 2nd call (a/002.sql).
  const { fetchImpl, calls } = mockFetch((i) =>
    i === 1 ? { ok: false, status: 400, statusText: 'Bad Request', body: 'syntax error near "FOO"' } : { ok: true },
  )
  try {
    const client = createManagementClient({ projectRef: 'r', accessToken: 't', fetchImpl })
    await assert.rejects(
      () => executeMigrationPlan(plan, client),
      (err) => {
        assert.ok(err instanceof MigrationExecutionError)
        assert.match(err.message, /002\.sql/)
        assert.match(err.message, /400/)
        assert.match(err.message, /idempotent/)
        assert.match(err.message, /re-run/)
        return true
      },
    )
    // Only 2 calls happened (001 ok, 002 fail); NO plugin call, NO NOTIFY.
    assert.equal(calls.length, 2)
  } finally {
    cleanup()
  }
})

test('ManagementApiError carries status + body; runQuery surfaces status', async () => {
  const { fetchImpl } = mockFetch(() => ({ ok: false, status: 401, statusText: 'Unauthorized', body: 'invalid token' }))
  const client = createManagementClient({ projectRef: 'r', accessToken: 'bad', fetchImpl })
  await assert.rejects(
    () => client.runQuery('SELECT 1;'),
    (err) => {
      assert.ok(err instanceof ManagementApiError)
      assert.equal(err.status, 401)
      assert.match(err.message, /401/)
      assert.match(err.message, /invalid token/)
      return true
    },
  )
})

test('executor reports an unreadable SQL file without a network call', async () => {
  const plan = {
    appDir: '/nope',
    steps: [{ order: 1, source: 'spine', id: '@fayz-ai/db', files: ['/nope/does-not-exist.sql'] }],
    notes: [],
    totalFiles: 1,
  }
  const { fetchImpl, calls } = mockFetch(() => ({ ok: true }))
  const client = createManagementClient({ projectRef: 'r', accessToken: 't', fetchImpl })
  await assert.rejects(
    () => executeMigrationPlan(plan, client),
    (err) => {
      assert.ok(err instanceof MigrationExecutionError)
      assert.match(err.message, /does-not-exist\.sql/)
      assert.match(err.message, /could not read/)
      return true
    },
  )
  assert.equal(calls.length, 0)
})

// ---------------------------------------------------------------------------
// Env contract
// ---------------------------------------------------------------------------

test('env contract: primary vars resolved from process env', () => {
  const res = resolveSupabaseEnv({
    appDir: '/nowhere',
    processEnv: { SUPABASE_PROJECT_REF: 'ref1', SUPABASE_PAT: 'pat1' },
    readFile: () => null,
  })
  assert.equal(res.projectRef, 'ref1')
  assert.equal(res.accessToken, 'pat1')
  assert.deepEqual(res.missing, [])
})

test('env contract: aliases accepted (SUPABASE_REF / SUPABASE_ACCESS_TOKEN)', () => {
  const res = resolveSupabaseEnv({
    appDir: '/nowhere',
    processEnv: { SUPABASE_REF: 'refAlias', SUPABASE_ACCESS_TOKEN: 'tokAlias' },
    readFile: () => null,
  })
  assert.equal(res.projectRef, 'refAlias')
  assert.equal(res.accessToken, 'tokAlias')
})

test('env contract: missing vars are reported by name', () => {
  const res = resolveSupabaseEnv({ appDir: '/nowhere', processEnv: {}, readFile: () => null })
  assert.equal(res.projectRef, undefined)
  assert.equal(res.accessToken, undefined)
  assert.equal(res.missing.length, 2)
  const msg = missingEnvMessage(res.missing)
  assert.match(msg, /SUPABASE_PROJECT_REF/)
  assert.match(msg, /SUPABASE_PAT/)
  assert.match(msg, /Access Tokens/)
})

test('env contract: .env.local is parsed and used when process env lacks the var', () => {
  const dir = mkdtempSync(join(tmpdir(), 'a3b-env-'))
  try {
    writeFileSync(join(dir, '.env.local'), '# creds\nSUPABASE_PROJECT_REF=from-local\nSUPABASE_PAT="sbp_local"\n')
    const res = resolveSupabaseEnv({ appDir: dir, processEnv: {} })
    assert.equal(res.projectRef, 'from-local')
    assert.equal(res.accessToken, 'sbp_local')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('env contract: process env is NOT overridden by .env files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'a3b-env-'))
  try {
    writeFileSync(join(dir, '.env.local'), 'SUPABASE_PROJECT_REF=from-file\nSUPABASE_PAT=from-file\n')
    const res = resolveSupabaseEnv({
      appDir: dir,
      processEnv: { SUPABASE_PROJECT_REF: 'from-process' },
    })
    // process value wins for ref; file supplies the missing PAT
    assert.equal(res.projectRef, 'from-process')
    assert.equal(res.accessToken, 'from-file')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('env contract: .env.local overrides .env (file precedence)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'a3b-env-'))
  try {
    writeFileSync(join(dir, '.env'), 'SUPABASE_PROJECT_REF=from-base\nSUPABASE_PAT=from-base\n')
    writeFileSync(join(dir, '.env.local'), 'SUPABASE_PROJECT_REF=from-local\n')
    const res = resolveSupabaseEnv({ appDir: dir, processEnv: {} })
    assert.equal(res.projectRef, 'from-local') // .env.local wins over .env
    assert.equal(res.accessToken, 'from-base') // only in .env
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('parseDotenv: comments, blanks, export prefix, quotes', () => {
  const parsed = parseDotenv(
    ['# comment', '', 'export FOO=bar', 'BAZ="quoted value"', "Q='single'", 'EMPTY=', 'nokeyline'].join('\n'),
  )
  assert.equal(parsed.FOO, 'bar')
  assert.equal(parsed.BAZ, 'quoted value')
  assert.equal(parsed.Q, 'single')
  assert.equal(parsed.EMPTY, '')
})

// ---------------------------------------------------------------------------
// Confirmation gate
// ---------------------------------------------------------------------------

test('confirmation gate: --yes proceeds without a prompt', () => {
  const g = confirmationGate({ yes: true, isTTY: false })
  assert.equal(g.needsPrompt, false)
  assert.equal(g.error, undefined)
})

test('confirmation gate: non-TTY without --yes fails safely (no prompt) suggesting --yes', () => {
  const g = confirmationGate({ yes: false, isTTY: false })
  assert.equal(g.needsPrompt, false)
  assert.match(g.error, /--yes/)
  assert.match(g.error, /non-interactive/)
})

test('confirmation gate: interactive TTY without --yes requests a prompt', () => {
  const g = confirmationGate({ yes: false, isTTY: true })
  assert.equal(g.needsPrompt, true)
  assert.equal(g.error, undefined)
})
