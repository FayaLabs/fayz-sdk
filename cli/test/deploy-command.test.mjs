import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deploy } from '../dist/commands/deploy.js'

// Build a temp app dir with a couple of source files + an isolated HOME so no
// real ~/.fayz credential can leak into these cases.
function scaffold(spec = { 'src/main.ts': 'export const x = 1', 'index.html': '<html></html>' }) {
  const root = mkdtempSync(join(tmpdir(), 'p5-deploycmd-'))
  const app = join(root, 'app')
  const home = join(root, 'home')
  mkdirSync(app, { recursive: true })
  mkdirSync(home, { recursive: true })
  for (const [rel, content] of Object.entries(spec)) {
    const p = join(app, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, content)
  }
  return { root, app, home, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

// Capture console output and run `fn` with a scrubbed env (isolated HOME, no
// FAYZ_TOKEN unless the case sets it). Restores everything afterwards.
async function withCapture(env, fn) {
  const logs = []
  const origLog = console.log
  const origErr = console.error
  const origEnv = { HOME: process.env.HOME, FAYZ_TOKEN: process.env.FAYZ_TOKEN, FAYZ_API_URL: process.env.FAYZ_API_URL }
  console.log = (...a) => logs.push(a.join(' '))
  console.error = (...a) => logs.push(a.join(' '))
  delete process.env.FAYZ_TOKEN
  delete process.env.FAYZ_API_URL
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    const code = await fn()
    return { code, out: logs.join('\n') }
  } finally {
    console.log = origLog
    console.error = origErr
    for (const [k, v] of Object.entries(origEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

// A client factory that FAILS the test if the network is ever touched.
function noNetworkClient() {
  return () => {
    throw new Error('network must not be reached')
  }
}

// ---------------------------------------------------------------------------
// --dry-run: lists files + target, zero network, exit 0
// ---------------------------------------------------------------------------

test('deploy --dry-run lists files + target and performs zero network', async () => {
  const fx = scaffold()
  try {
    const { code, out } = await withCapture({ HOME: fx.home }, () =>
      deploy([fx.app, '--dry-run'], { makeClient: noNetworkClient() }),
    )
    assert.equal(code, 0)
    assert.match(out, /Arquivos a enviar/)
    assert.match(out, /index\.html/)
    assert.match(out, /src\/main\.ts/)
    assert.match(out, /novo projeto 'app'/) // dir name fallback
    assert.match(out, /dry-run — nenhuma chamada de rede/)
  } finally {
    fx.cleanup()
  }
})

test('deploy --dry-run derives project name from package.json', async () => {
  const fx = scaffold({ 'src/a.ts': '1', 'package.json': '{"name":"minha-loja"}' })
  try {
    const { code, out } = await withCapture({ HOME: fx.home }, () =>
      deploy([fx.app, '--dry-run'], { makeClient: noNetworkClient() }),
    )
    assert.equal(code, 0)
    assert.match(out, /novo projeto 'minha-loja'/)
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// Missing token → exit 1 pointing at `fayz login`
// ---------------------------------------------------------------------------

test('deploy with no token exits 1 and names `fayz login` (no network)', async () => {
  const fx = scaffold()
  try {
    const { code, out } = await withCapture({ HOME: fx.home }, () =>
      deploy([fx.app, '--yes'], { makeClient: noNetworkClient() }),
    )
    assert.equal(code, 1)
    assert.match(out, /fayz login/)
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// Non-TTY without --yes → refuse fast (before any network)
// ---------------------------------------------------------------------------

test('deploy non-interactive without --yes refuses (token present, zero network)', async () => {
  const fx = scaffold()
  try {
    // node --test runs non-interactively → process.stdin.isTTY is falsy.
    assert.ok(!process.stdin.isTTY)
    const { code, out } = await withCapture({ HOME: fx.home, FAYZ_TOKEN: 'fayz_test_fake' }, () =>
      deploy([fx.app], { makeClient: noNetworkClient() }),
    )
    assert.equal(code, 1)
    assert.match(out, /--yes/)
    assert.doesNotMatch(out, /Deploy concluído|Publicando/)
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// Full flow with a mocked client: create → upload → publish, link persisted
// ---------------------------------------------------------------------------

test('deploy --yes runs create→upload→publish via the injected client and prints the URL', async () => {
  const fx = scaffold()
  try {
    const events = []
    const fakeClient = {
      baseUrl: 'https://beta.fayz.ai/api',
      async createProject(name) {
        events.push(`create:${name}`)
        return { id: 'proj_xyz' }
      },
      async uploadFiles(id, files) {
        events.push(`upload:${id}:${files.length}`)
        return { filesUploaded: files.length, batches: 1 }
      },
      async publishProject(id) {
        events.push(`publish:${id}`)
        return { url: 'https://app.live.fayz.ai', raw: {} }
      },
      async getProject(id) {
        return { id }
      },
    }
    const { code, out } = await withCapture({ HOME: fx.home, FAYZ_TOKEN: 'fayz_test_fake' }, () =>
      deploy([fx.app, '--yes'], { makeClient: () => fakeClient }),
    )
    assert.equal(code, 0)
    assert.equal(events[0], 'create:app')
    assert.match(events[1], /^upload:proj_xyz:/)
    assert.equal(events[2], 'publish:proj_xyz')
    assert.match(out, /https:\/\/app\.live\.fayz\.ai/)

    // Re-running reuses the persisted .fayz/project.json (no second create).
    const events2 = []
    const client2 = { ...fakeClient, async createProject(n) { events2.push(`create:${n}`); return { id: 'x' } }, async uploadFiles(i, f) { events2.push('upload'); return { filesUploaded: f.length, batches: 1 } }, async publishProject() { events2.push('publish'); return { url: 'https://app.live.fayz.ai', raw: {} } } }
    await withCapture({ HOME: fx.home, FAYZ_TOKEN: 'fayz_test_fake' }, () =>
      deploy([fx.app, '--yes'], { makeClient: () => client2 }),
    )
    assert.ok(!events2.some((e) => e.startsWith('create:')), 'existing link should skip project creation')
    assert.ok(events2.includes('upload') && events2.includes('publish'))
  } finally {
    fx.cleanup()
  }
})

// ---------------------------------------------------------------------------
// 401 → actionable rollout message
// ---------------------------------------------------------------------------

test('deploy surfaces a 401 as an actionable rollout message', async () => {
  const fx = scaffold()
  try {
    const { ApiError } = await import('../dist/lib/fayz-platform.js')
    const failing = {
      baseUrl: 'https://beta.fayz.ai/api',
      async createProject() {
        throw new ApiError('Fayz platform POST /projects returned 401 Unauthorized: nope', 401, 'nope')
      },
      async uploadFiles() { throw new Error('unreached') },
      async publishProject() { throw new Error('unreached') },
      async getProject() { return {} },
    }
    const { code, out } = await withCapture({ HOME: fx.home, FAYZ_TOKEN: 'fayz_test_fake' }, () =>
      deploy([fx.app, '--yes'], { makeClient: () => failing }),
    )
    assert.equal(code, 1)
    assert.match(out, /ainda não liberou acesso de CLI|token inválido/)
  } finally {
    fx.cleanup()
  }
})
