import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createPlatformClient,
  ApiError,
  DEFAULT_BASE_URL,
  chunk,
  resolvePublishUrl,
  isValidTokenFormat,
  maskToken,
  resolveToken,
  readCredentials,
  writeCredentials,
  removeCredentials,
  credentialsPath,
  defaultCredentialIo,
} from '../dist/lib/fayz-platform.js'

// A mocked fetch that records calls and returns a scripted response per call.
function mockFetch(responder) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    const scripted = responder(calls.length - 1, url, init)
    const { ok = true, status = 200, statusText = 'OK', body = '{}' } = scripted ?? {}
    return { ok, status, statusText, async text() { return body } }
  }
  return { fetchImpl, calls }
}

// ---------------------------------------------------------------------------
// Platform client — happy path (create → files-batching → publish order)
// ---------------------------------------------------------------------------

test('happy path: create → upload (batched) → publish, in order, with auth + base URL', async () => {
  const { fetchImpl, calls } = mockFetch((i) => {
    if (i === 0) return { body: JSON.stringify({ id: 'proj_123' }) }
    if (i === 1 || i === 2) return { body: '{"ok":true}' }
    return { body: JSON.stringify({ subdomain: 'my-shop' }) } // publish
  })
  const client = createPlatformClient({
    baseUrl: 'https://beta.fayz.ai/api',
    token: 'fayz_test_abc',
    fetchImpl,
    batchSize: 2,
  })

  const project = await client.createProject('my-shop')
  assert.equal(project.id, 'proj_123')

  const files = [
    { path: 'a.ts', content: '1' },
    { path: 'b.ts', content: '2' },
    { path: 'c.ts', content: '3' },
  ]
  const progress = []
  const up = await client.uploadFiles('proj_123', files, (p) => progress.push(p))
  assert.equal(up.filesUploaded, 3)
  assert.equal(up.batches, 2) // batchSize 2 → [2,1]
  assert.equal(progress.length, 2)
  assert.equal(progress[1].filesUploaded, 3)

  const published = await client.publishProject('proj_123')
  assert.equal(published.url, 'https://my-shop.live.fayz.ai')

  // 1 create + 2 file batches + 1 publish = 4 calls
  assert.equal(calls.length, 4)
  assert.equal(calls[0].url, 'https://beta.fayz.ai/api/projects')
  assert.equal(calls[1].url, 'https://beta.fayz.ai/api/projects/proj_123/files')
  assert.equal(calls[3].url, 'https://beta.fayz.ai/api/projects/proj_123/publish')
  for (const c of calls) {
    assert.equal(c.init.headers.Authorization, 'Bearer fayz_test_abc')
    assert.equal(c.init.headers['Content-Type'], 'application/json')
  }
  // First file batch carries exactly the first 2 files.
  const firstBatch = JSON.parse(calls[1].init.body).files
  assert.deepEqual(firstBatch.map((f) => f.path), ['a.ts', 'b.ts'])
})

test('base URL defaults to beta.fayz.ai/api and trims trailing slashes', () => {
  const c1 = createPlatformClient({ token: 'fayz_x', fetchImpl: async () => ({}) })
  assert.equal(c1.baseUrl, DEFAULT_BASE_URL)
  const c2 = createPlatformClient({ baseUrl: 'https://x.test/api/', token: 'fayz_x', fetchImpl: async () => ({}) })
  assert.equal(c2.baseUrl, 'https://x.test/api')
})

test('publish accepts { url } directly and constructs from { subdomain }', () => {
  assert.equal(resolvePublishUrl({ url: 'https://direct.example' }), 'https://direct.example')
  assert.equal(resolvePublishUrl({ subdomain: 'abc' }), 'https://abc.live.fayz.ai')
  assert.equal(resolvePublishUrl({ data: { subdomain: 'wrapped' } }), 'https://wrapped.live.fayz.ai')
  assert.equal(resolvePublishUrl({ url: 'https://u', subdomain: 'ignored' }), 'https://u') // url wins
  assert.equal(resolvePublishUrl({}), undefined)
})

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

test('non-2xx raises ApiError carrying status + body excerpt', async () => {
  const { fetchImpl } = mockFetch(() => ({ ok: false, status: 401, statusText: 'Unauthorized', body: 'no dual-auth yet' }))
  const client = createPlatformClient({ token: 'fayz_bad', fetchImpl })
  await assert.rejects(
    () => client.createProject('x'),
    (err) => {
      assert.ok(err instanceof ApiError)
      assert.equal(err.status, 401)
      assert.match(err.message, /401/)
      assert.match(err.message, /no dual-auth yet/)
      return true
    },
  )
})

test('createProject rejects a response missing an id', async () => {
  const { fetchImpl } = mockFetch(() => ({ body: '{"name":"x"}' }))
  const client = createPlatformClient({ token: 'fayz_x', fetchImpl })
  await assert.rejects(() => client.createProject('x'), /missing an "id"/)
})

test('publish rejects a response without url or subdomain', async () => {
  const { fetchImpl } = mockFetch(() => ({ body: '{"status":"queued"}' }))
  const client = createPlatformClient({ token: 'fayz_x', fetchImpl })
  await assert.rejects(() => client.publishProject('p'), /did not include a url or subdomain/)
})

// ---------------------------------------------------------------------------
// chunk / token format helpers
// ---------------------------------------------------------------------------

test('chunk splits into batches of at most size', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.deepEqual(chunk([], 3), [])
  assert.throws(() => chunk([1], 0))
})

test('isValidTokenFormat requires the fayz_ prefix + body', () => {
  assert.equal(isValidTokenFormat('fayz_abc123'), true)
  assert.equal(isValidTokenFormat('fayz_'), false) // no body
  assert.equal(isValidTokenFormat('sbp_abc'), false)
  assert.equal(isValidTokenFormat(''), false)
})

test('maskToken never reveals the full secret', () => {
  const masked = maskToken('fayz_supersecrettoken_xyz')
  assert.match(masked, /^fayz_/)
  assert.ok(!masked.includes('supersecrettoken'))
  assert.match(masked, /…/)
})

// ---------------------------------------------------------------------------
// Token resolution precedence — env over file
// ---------------------------------------------------------------------------

test('token resolution: env FAYZ_TOKEN wins over the stored file', () => {
  const res = resolveToken({
    processEnv: { FAYZ_TOKEN: 'fayz_from_env' },
    readStored: () => ({ token: 'fayz_from_file', baseUrl: 'https://file.api' }),
  })
  assert.equal(res.token, 'fayz_from_env')
  assert.equal(res.source, 'env')
})

test('token resolution: falls back to the stored file when env is unset', () => {
  const res = resolveToken({
    processEnv: {},
    readStored: () => ({ token: 'fayz_from_file', baseUrl: 'https://file.api' }),
  })
  assert.equal(res.token, 'fayz_from_file')
  assert.equal(res.source, 'file')
  assert.equal(res.baseUrl, 'https://file.api')
})

test('token resolution: env FAYZ_API_URL overrides the stored baseUrl', () => {
  const res = resolveToken({
    processEnv: { FAYZ_API_URL: 'https://env.api' },
    readStored: () => ({ token: 'fayz_from_file', baseUrl: 'https://file.api' }),
  })
  assert.equal(res.baseUrl, 'https://env.api')
})

test('token resolution: nothing set → no token', () => {
  const res = resolveToken({ processEnv: {}, readStored: () => null })
  assert.equal(res.token, undefined)
})

// ---------------------------------------------------------------------------
// Credential file — write mode 0600, read, remove
// ---------------------------------------------------------------------------

test('writeCredentials creates ~/.fayz/credentials.json at mode 0600', () => {
  const home = mkdtempSync(join(tmpdir(), 'p5-home-'))
  try {
    const path = credentialsPath(home)
    writeCredentials(path, { token: 'fayz_test_write' })
    const mode = statSync(path).mode & 0o777
    assert.equal(mode, 0o600, `expected 0600, got ${mode.toString(8)}`)
    const back = readCredentials(path)
    assert.equal(back.token, 'fayz_test_write')
    // Round-trip through the default IO too.
    assert.equal(defaultCredentialIo.exists(path), true)
    // Remove.
    assert.equal(removeCredentials(path), true)
    assert.equal(readCredentials(path), null)
    assert.equal(removeCredentials(path), false)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('readCredentials returns null for absent or malformed files', () => {
  const home = mkdtempSync(join(tmpdir(), 'p5-home-'))
  try {
    const path = credentialsPath(home)
    assert.equal(readCredentials(path), null) // absent
    writeCredentials(path, { token: 'fayz_ok' })
    // Overwrite with junk via the low-level IO to simulate corruption.
    defaultCredentialIo.writeSecure(path, 'not json')
    assert.equal(readCredentials(path), null)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
