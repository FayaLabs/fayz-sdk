import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parsePoolsConfig,
  loadPoolsFile,
  findPool,
  requirePool,
  selectCanary,
  poolCriticalGate,
  planFanOut,
  runFanOut,
  createFilePoolRegistry,
  createPostgresPoolRegistry,
  PoolsError,
} from '../dist/lib/pools.js'

// A deterministic in-test config mirroring the shipped shape.
function cfg() {
  return parsePoolsConfig({
    version: 1,
    pools: [
      { industry: 'ecommerce', name: 'cluster-ecommerce-br-01', ref: 'ref-eco', url: 'u', status: 'ACTIVE', flags: {} },
      { industry: 'creators', name: 'cluster-creators-br-01', ref: 'ref-cre', url: 'u', status: 'ACTIVE', flags: { canary: true } },
      { industry: 'dentist', name: 'cluster-dentist-br-01', ref: 'ref-den', url: 'u', status: 'PROVISIONING', flags: {} },
      { industry: 'salon', name: 'cluster-salon-br-01', ref: 'ref-sal', url: 'u', status: 'ACTIVE', flags: { dataCritical: true } },
      { industry: 'restaurant', name: 'cluster-restaurant-br-01', ref: 'ref-res', url: 'u', status: 'ACTIVE', flags: {} },
    ],
  })
}

// ---------------------------------------------------------------------------
// Config load + validation
// ---------------------------------------------------------------------------

test('shipped pools.config.json loads: 8 pools, expected refs + flags', () => {
  const config = loadPoolsFile() // default path resolution
  assert.equal(config.pools.length, 8)
  assert.equal(findPool(config, 'ecommerce').ref, 'yfxutrkyhydgltakbqle')
  assert.equal(findPool(config, 'creators').flags.canary, true)
  assert.equal(findPool(config, 'dentist').status, 'ACTIVE') // baselined + flipped during M3
  assert.equal(findPool(config, 'salon').flags.dataCritical, true)
  assert.equal(findPool(config, 'school').flags.preserveBespoke, true)
})

test('parsePoolsConfig rejects malformed input', () => {
  assert.throws(() => parsePoolsConfig({}), PoolsError)
  assert.throws(() => parsePoolsConfig({ pools: [{ industry: 'x' }] }), PoolsError)
  assert.throws(
    () => parsePoolsConfig({ pools: [{ industry: 'x', name: 'n', ref: 'r', url: 'u', status: 'BOGUS' }] }),
    PoolsError,
  )
})

test('findPool matches by industry, name, or ref; requirePool throws on miss', () => {
  const config = cfg()
  assert.equal(findPool(config, 'salon').ref, 'ref-sal')
  assert.equal(findPool(config, 'cluster-salon-br-01').industry, 'salon')
  assert.equal(findPool(config, 'ref-sal').industry, 'salon')
  assert.equal(findPool(config, 'nope'), undefined)
  assert.throws(() => requirePool(config, 'nope'), PoolsError)
})

// ---------------------------------------------------------------------------
// Canary selection
// ---------------------------------------------------------------------------

test('selectCanary: default picks the flagged pool; override wins', () => {
  const config = cfg()
  assert.equal(selectCanary(config).industry, 'creators')
  assert.equal(selectCanary(config, 'restaurant').industry, 'restaurant')
  assert.throws(() => selectCanary(config, 'ghost'), PoolsError)
})

// ---------------------------------------------------------------------------
// Critical gate
// ---------------------------------------------------------------------------

test('poolCriticalGate: dataCritical requires BOTH --yes and --allow-critical', () => {
  const config = cfg()
  const salon = findPool(config, 'salon')
  const eco = findPool(config, 'ecommerce')

  assert.equal(poolCriticalGate(eco, { yes: false, allowCritical: false }).ok, true)
  assert.equal(poolCriticalGate(salon, { yes: true, allowCritical: false }).ok, false)
  assert.equal(poolCriticalGate(salon, { yes: false, allowCritical: true }).ok, false)
  assert.equal(poolCriticalGate(salon, { yes: true, allowCritical: true }).ok, true)
  assert.match(poolCriticalGate(salon, { yes: true, allowCritical: false }).error, /dataCritical/)
})

// ---------------------------------------------------------------------------
// Fan-out ordering
// ---------------------------------------------------------------------------

test('planFanOut: canary first, PROVISIONING skipped unless named', () => {
  const config = cfg()
  const order = planFanOut(config)
  assert.equal(order.canary.industry, 'creators')
  // dentist (PROVISIONING) is skipped, not in rest
  assert.ok(!order.rest.some((p) => p.industry === 'dentist'))
  assert.ok(order.skipped.some((s) => s.pool.industry === 'dentist' && /PROVISIONING/.test(s.reason)))
  // rest excludes canary + skipped; keeps config order
  assert.deepEqual(order.rest.map((p) => p.industry), ['ecommerce', 'salon', 'restaurant'])
})

test('planFanOut: naming a PROVISIONING industry includes it', () => {
  const config = cfg()
  const order = planFanOut(config, { industry: 'dentist' })
  // single-industry wave; dentist explicitly named → not skipped
  assert.equal(order.skipped.length, 0)
  const wave = [...(order.canary ? [order.canary] : []), ...order.rest]
  assert.deepEqual(wave.map((p) => p.industry), ['dentist'])
})

test('planFanOut: --canary override selects the first pool', () => {
  const config = cfg()
  const order = planFanOut(config, { canary: 'restaurant' })
  assert.equal(order.canary.industry, 'restaurant')
  assert.ok(!order.rest.some((p) => p.industry === 'restaurant'))
})

// ---------------------------------------------------------------------------
// Fan-out orchestration (runFanOut)
// ---------------------------------------------------------------------------

test('runFanOut: canary applied first, then rest in order; summary includes skipped', async () => {
  const config = cfg()
  const order = planFanOut(config)
  const seen = []
  const run = await runFanOut(order, async (pool) => {
    seen.push(pool.industry)
    return { filesApplied: 3, filesSkipped: 0 }
  })
  // canary first
  assert.equal(seen[0], 'creators')
  assert.deepEqual(seen, ['creators', 'ecommerce', 'salon', 'restaurant'])
  assert.equal(run.ok, true)
  // summary shape: one result per applied + skipped pool
  const applied = run.results.filter((r) => r.status === 'applied')
  assert.equal(applied.length, 4)
  assert.ok(run.results.some((r) => r.status === 'skipped' && r.pool.industry === 'dentist'))
  assert.equal(applied[0].filesApplied, 3)
})

test('runFanOut: fail-fast — a failure halts the remaining pools', async () => {
  const config = cfg()
  const order = planFanOut(config)
  const attempted = []
  const run = await runFanOut(order, async (pool) => {
    attempted.push(pool.industry)
    if (pool.industry === 'ecommerce') throw new Error('boom on ecommerce')
    return { filesApplied: 1, filesSkipped: 0 }
  })
  // creators (canary) ok, ecommerce fails → salon + restaurant NOT attempted
  assert.deepEqual(attempted, ['creators', 'ecommerce'])
  assert.equal(run.ok, false)
  const failed = run.results.find((r) => r.status === 'failed')
  assert.equal(failed.pool.industry, 'ecommerce')
  assert.match(failed.detail, /boom on ecommerce/)
  // salon + restaurant recorded as skipped (halted)
  const halted = run.results.filter((r) => r.status === 'skipped' && /halted/.test(r.detail ?? ''))
  assert.deepEqual(halted.map((r) => r.pool.industry).sort(), ['restaurant', 'salon'])
})

test('runFanOut: canary failure halts the entire rest of the wave', async () => {
  const config = cfg()
  const order = planFanOut(config)
  const attempted = []
  const run = await runFanOut(order, async (pool) => {
    attempted.push(pool.industry)
    if (pool.industry === 'creators') throw new Error('canary failed')
    return { filesApplied: 1, filesSkipped: 0 }
  })
  assert.deepEqual(attempted, ['creators'])
  assert.equal(run.ok, false)
})

// ---------------------------------------------------------------------------
// Registry sources
// ---------------------------------------------------------------------------

test('createFilePoolRegistry lists + gets from a loaded config', async () => {
  const config = cfg()
  const reg = createFilePoolRegistry(config)
  assert.equal((await reg.list()).length, 5)
  assert.equal((await reg.get('salon')).ref, 'ref-sal')
})

test('createPostgresPoolRegistry stub refuses with the documented message', async () => {
  const reg = createPostgresPoolRegistry()
  await assert.rejects(() => reg.list(), (err) => {
    assert.ok(err instanceof PoolsError)
    assert.match(err.message, /registry not yet provisioned; use --pools-file/)
    return true
  })
})
