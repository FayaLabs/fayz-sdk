import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateManifestStructure } from '../dist/lib/manifest.js'

// A minimal, structurally-valid manifest that we spread over per-case.
function baseManifest(overrides = {}) {
  return {
    manifestVersion: 2,
    id: 'fixture',
    name: 'Fixture',
    surfaces: {
      admin: { scaffold: 'shell', pages: [{ path: '/', component: 'Home' }] },
    },
    ...overrides,
  }
}

test('valid manifest with theme + backend passes', () => {
  const problems = validateManifestStructure(
    baseManifest({
      theme: { brand: 'violet', radius: 'lg', mode: 'system' },
      backend: { provider: 'supabase' },
    }),
  )
  assert.deepEqual(problems, [])
})

test('manifest with no theme/backend passes (optional fields)', () => {
  const problems = validateManifestStructure(baseManifest())
  assert.deepEqual(problems, [])
})

test('invalid theme.brand fails with a clear message', () => {
  const problems = validateManifestStructure(baseManifest({ theme: { brand: 'chartreuse' } }))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /theme\.brand "chartreuse" is not valid/)
  assert.match(problems[0], /blue, violet, green, orange, red, pink, teal/)
})

test('invalid theme.radius fails', () => {
  const problems = validateManifestStructure(baseManifest({ theme: { radius: 'chonky' } }))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /theme\.radius "chonky" is not valid/)
  assert.match(problems[0], /none, sm, md, lg, full/)
})

test('invalid theme.mode fails', () => {
  const problems = validateManifestStructure(baseManifest({ theme: { mode: 'twilight' } }))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /theme\.mode "twilight" is not valid/)
  assert.match(problems[0], /light, dark, system/)
})

test('invalid backend.provider fails', () => {
  const problems = validateManifestStructure(
    baseManifest({ backend: { provider: 'totally-invalid' } }),
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /backend\.provider "totally-invalid" is not valid/)
  assert.match(problems[0], /supabase, fayz-api, fayz-shop, mock, custom/)
})

test('all real backend providers are accepted', () => {
  for (const provider of ['supabase', 'fayz-api', 'fayz-shop', 'mock', 'custom']) {
    const problems = validateManifestStructure(baseManifest({ backend: { provider } }))
    assert.deepEqual(problems, [], `provider ${provider} should be valid`)
  }
})

test('theme present but with only unrelated keys passes', () => {
  const problems = validateManifestStructure(baseManifest({ theme: { accent: '#fff' } }))
  assert.deepEqual(problems, [])
})
