import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MOVE_TABLES,
  assertIdent,
  sqlLiteral,
  qIdent,
  regclassQuery,
  columnsQuery,
  selectRowsQuery,
  columnIntersection,
  pickDollarTag,
  insertRowsQuery,
  verifyCountQuery,
  deleteQuery,
  createPoolGateway,
  planTenantMove,
  executeTenantMove,
  TenantMoveError,
  TenantMoveVerifyError,
} from '../dist/lib/move-tenant.js'

// ---------------------------------------------------------------------------
// Pure SQL helpers
// ---------------------------------------------------------------------------

test('MOVE_TABLES is parents-before-children with the fixed order', () => {
  const names = MOVE_TABLES.map((t) => t.table)
  assert.deepEqual(names, [
    'tenants',
    'people',
    'services',
    'schedules',
    'orders',
    'appointments',
    'appointment_items',
    'order_items',
    'transactions',
  ])
  // children join their parents
  const ai = MOVE_TABLES.find((t) => t.table === 'appointment_items')
  assert.deepEqual(ai.parent, { table: 'appointments', fk: 'booking_id' })
  const oi = MOVE_TABLES.find((t) => t.table === 'order_items')
  assert.deepEqual(oi.parent, { table: 'orders', fk: 'order_id' })
  // appointment_items comes AFTER appointments; order_items AFTER orders
  assert.ok(names.indexOf('appointment_items') > names.indexOf('appointments'))
  assert.ok(names.indexOf('order_items') > names.indexOf('orders'))
})

test('assertIdent rejects injection, accepts bare identifiers', () => {
  assert.equal(assertIdent('order_items'), 'order_items')
  assert.throws(() => assertIdent('foo; DROP TABLE bar'), /unsafe SQL identifier/)
  assert.throws(() => assertIdent('a b'), /unsafe SQL identifier/)
})

test('sqlLiteral escapes embedded single quotes', () => {
  assert.equal(sqlLiteral("O'Brien"), "'O''Brien'")
  assert.equal(qIdent('id'), '"id"')
})

test('selectRowsQuery: id filter for tenants, tenant_id filter, and parent-join fallback', () => {
  const idQ = selectRowsQuery({ table: 'tenants', isTenantsTable: true }, 't1', false)
  assert.match(idQ, /FROM public\.tenants t WHERE t\.id = 't1'/)

  const tidQ = selectRowsQuery({ table: 'people' }, 't1', true)
  assert.match(tidQ, /FROM public\.people t WHERE t\.tenant_id = 't1'/)

  const joinQ = selectRowsQuery(
    { table: 'order_items', parent: { table: 'orders', fk: 'order_id' } },
    't1',
    false,
  )
  assert.match(joinQ, /FROM public\.order_items c JOIN public\.orders p ON p\.id = c\.order_id/)
  assert.match(joinQ, /WHERE p\.tenant_id = 't1'/)
})

test('columnIntersection splits shared / source-only / target-only, preserving source order', () => {
  const r = columnIntersection(['id', 'tenant_id', 'name', 'legacy'], ['id', 'name', 'tenant_id', 'extra'])
  assert.deepEqual(r.shared, ['id', 'tenant_id', 'name'])
  assert.deepEqual(r.sourceOnly, ['legacy'])
  assert.deepEqual(r.targetOnly, ['extra'])
})

test('pickDollarTag guards against the tag occurring in the payload', () => {
  assert.equal(pickDollarTag('nothing special'), 'fayzjson')
  // payload already contains the default tag → bump
  assert.equal(pickDollarTag('has $fayzjson$ inside'), 'fayzjson1')
  assert.equal(pickDollarTag('has $fayzjson$ and $fayzjson1$'), 'fayzjson2')
})

test('insertRowsQuery: jsonb round-trip, explicit shared columns, ON CONFLICT DO NOTHING', () => {
  const rows = [
    { id: 'a', tenant_id: 't1', name: "O'Brien", meta: { nested: true, s: 'a$b' } },
    { id: 'b', tenant_id: 't1', name: 'x', meta: null },
  ]
  const sql = insertRowsQuery('people', ['id', 'tenant_id', 'name', 'meta'], rows)
  assert.match(sql, /INSERT INTO public\.people \("id", "tenant_id", "name", "meta"\)/)
  assert.match(sql, /jsonb_populate_recordset\(null::public\.people/)
  assert.match(sql, /ON CONFLICT \(id\) DO NOTHING;/)

  // Extract the dollar-quoted payload and confirm it parses back to the input.
  const m = sql.match(/\$(fayzjson\d*)\$([\s\S]*?)\$\1\$/)
  assert.ok(m, 'payload is dollar-quoted')
  assert.deepEqual(JSON.parse(m[2]), rows)
})

test('insertRowsQuery: empty rows → empty string; empty cols → throws', () => {
  assert.equal(insertRowsQuery('people', ['id'], []), '')
  assert.throws(() => insertRowsQuery('people', [], [{ id: 'a' }]), /no shared columns/)
})

test('verifyCountQuery / deleteQuery build id IN (...) lists', () => {
  assert.match(verifyCountQuery('people', ['a', 'b']), /SELECT count\(\*\)::int AS n FROM public\.people WHERE id IN \('a', 'b'\)/)
  assert.match(deleteQuery('people', ['a']), /DELETE FROM public\.people WHERE id IN \('a'\)/)
})

// ---------------------------------------------------------------------------
// Gateway over a mocked query executor
// ---------------------------------------------------------------------------

test('createPoolGateway maps runQuery results and emits the expected SQL', async () => {
  const sqls = []
  const scripted = {
    regclass: [{ reg: 'public.people' }],
    columns: [{ column_name: 'id' }, { column_name: 'tenant_id' }],
    select: [{ r: { id: 'a', tenant_id: 't1' } }],
    count: [{ n: 3 }],
  }
  const runQuery = async (sql) => {
    sqls.push(sql)
    if (sql.includes('to_regclass')) return scripted.regclass
    if (sql.includes('information_schema.columns')) return scripted.columns
    if (sql.includes('to_jsonb')) return scripted.select
    if (sql.startsWith('SELECT count')) return scripted.count
    return []
  }
  const gw = createPoolGateway(runQuery)

  assert.equal(await gw.regclass('people'), true)
  assert.deepEqual(await gw.columns('people'), ['id', 'tenant_id'])
  assert.deepEqual(await gw.selectRows({ table: 'people' }, 't1', true), [{ id: 'a', tenant_id: 't1' }])
  assert.equal(await gw.countByIds('people', ['a', 'b']), 3)

  // Empty id lists never hit the network (invalid `IN ()`).
  const before = sqls.length
  assert.equal(await gw.countByIds('people', []), 0)
  assert.equal(await gw.deleteByIds('people', []), 0)
  assert.equal(sqls.length, before, 'no query issued for empty id lists')

  // insertRows dollar-quotes the payload.
  await gw.insertRows('people', ['id', 'tenant_id'], [{ id: 'a', tenant_id: 't1' }])
  assert.match(sqls[sqls.length - 1], /jsonb_populate_recordset/)
})

// ---------------------------------------------------------------------------
// In-memory fake gateway for orchestrator tests
// ---------------------------------------------------------------------------

/**
 * Fake gateway backed by an in-memory store.
 *   tables: { name: { cols: [...], rows: [{ id, ... }] } }
 * `noInsert` makes insertRows a no-op (to simulate a failed/short target insert).
 */
function fakeGateway(tables, opts = {}) {
  const store = new Map(Object.entries(tables).map(([k, v]) => [k, { cols: v.cols, rows: [...v.rows] }]))
  const inserted = []
  const deleted = []
  return {
    _inserted: inserted,
    _deleted: deleted,
    _store: store,
    async regclass(t) {
      return store.has(t)
    },
    async columns(t) {
      return store.get(t)?.cols ?? []
    },
    async selectRows(spec) {
      return (store.get(spec.table)?.rows ?? []).map((r) => ({ ...r }))
    },
    async insertRows(table, cols, rows) {
      inserted.push(table)
      if (opts.noInsert) return
      const s = store.get(table)
      if (!s) return
      for (const r of rows) if (!s.rows.some((x) => String(x.id) === String(r.id))) s.rows.push({ ...r })
    },
    async countByIds(table, ids) {
      const s = store.get(table)
      if (!s) return 0
      return s.rows.filter((r) => ids.includes(String(r.id))).length
    },
    async deleteByIds(table, ids) {
      deleted.push(table)
      const s = store.get(table)
      if (s) s.rows = s.rows.filter((r) => !ids.includes(String(r.id)))
      return ids.length
    },
  }
}

test('planTenantMove: row counts, filters, target existence + conflicts', async () => {
  const source = fakeGateway({
    tenants: { cols: ['id', 'name'], rows: [{ id: 't1', name: 'Acme' }] },
    people: { cols: ['id', 'tenant_id'], rows: [{ id: 'p1', tenant_id: 't1' }, { id: 'p2', tenant_id: 't1' }] },
    orders: { cols: ['id', 'tenant_id'], rows: [{ id: 'o1', tenant_id: 't1' }] },
    order_items: { cols: ['id', 'order_id'], rows: [{ id: 'oi1', order_id: 'o1' }] }, // no tenant_id → parent-join
  })
  const target = fakeGateway({
    tenants: { cols: ['id', 'name'], rows: [] },
    people: { cols: ['id', 'tenant_id', 'extra'], rows: [{ id: 'p1', tenant_id: 't1' }] }, // p1 already present → 1 conflict
    order_items: { cols: ['id', 'order_id'], rows: [] },
    // NOTE: no `orders` table on target
  })
  const plan = await planTenantMove({ tenantId: 't1', source, target })
  const by = Object.fromEntries(plan.rows.map((r) => [r.table, r]))

  assert.equal(by.tenants.filter, 'id')
  assert.equal(by.tenants.rowCount, 1)
  assert.equal(by.people.filter, 'tenant_id')
  assert.equal(by.people.rowCount, 2)
  assert.equal(by.people.conflicts, 1)
  assert.deepEqual(by.people.targetOnly, ['extra'])
  assert.equal(by.order_items.filter, 'parent-join')
  assert.equal(by.orders.targetExists, false)
  // services/schedules/etc absent on source → skipped
  assert.equal(by.services.skipped, 'absent on source')
})

test('executeTenantMove: backup-before-write, parents-first insert, children-first delete', async () => {
  const source = fakeGateway({
    tenants: { cols: ['id'], rows: [{ id: 't1' }] },
    people: { cols: ['id', 'tenant_id'], rows: [{ id: 'p1', tenant_id: 't1' }] },
    appointments: { cols: ['id', 'tenant_id'], rows: [{ id: 'a1', tenant_id: 't1' }] },
    appointment_items: { cols: ['id', 'booking_id'], rows: [{ id: 'ai1', booking_id: 'a1' }] },
  })
  const target = fakeGateway({
    tenants: { cols: ['id'], rows: [] },
    people: { cols: ['id', 'tenant_id'], rows: [] },
    appointments: { cols: ['id', 'tenant_id'], rows: [] },
    appointment_items: { cols: ['id', 'booking_id'], rows: [] },
  })
  const plan = await planTenantMove({ tenantId: 't1', source, target })

  const backups = []
  const inserted = []
  const wrapTarget = {
    ...target,
    async insertRows(table, cols, rows) {
      inserted.push(table)
      return target.insertRows(table, cols, rows)
    },
  }
  const result = await executeTenantMove({
    plan,
    source,
    target: wrapTarget,
    writeBackup: (rel, contents) => backups.push({ rel, contents }),
  })

  // Backups written for all 4 tables BEFORE inserts (insert order recorded separately).
  assert.deepEqual(backups.map((b) => b.rel).sort(), [
    'appointment_items.json',
    'appointments.json',
    'people.json',
    'tenants.json',
  ])
  // Insert order is parents-first.
  assert.deepEqual(inserted, ['tenants', 'people', 'appointments', 'appointment_items'])
  // Delete order is children-first (reverse).
  assert.deepEqual(source._deleted, ['appointment_items', 'appointments', 'people', 'tenants'])
  // Source drained.
  assert.equal(source._store.get('people').rows.length, 0)
  assert.equal(source._store.get('appointment_items').rows.length, 0)
  // Result reported parents-first.
  assert.deepEqual(result.moved.map((m) => m.table), ['tenants', 'people', 'appointments', 'appointment_items'])
})

test('executeTenantMove: verify mismatch is a HARD STOP that leaves the source untouched', async () => {
  const source = fakeGateway({
    tenants: { cols: ['id'], rows: [{ id: 't1' }] },
    people: { cols: ['id', 'tenant_id'], rows: [{ id: 'p1', tenant_id: 't1' }, { id: 'p2', tenant_id: 't1' }] },
  })
  // Target refuses inserts → counts stay short → mismatch.
  const target = fakeGateway(
    {
      tenants: { cols: ['id'], rows: [] },
      people: { cols: ['id', 'tenant_id'], rows: [] },
    },
    { noInsert: true },
  )
  const plan = await planTenantMove({ tenantId: 't1', source, target })

  await assert.rejects(
    () =>
      executeTenantMove({
        plan,
        source,
        target,
        writeBackup: () => {},
      }),
    (err) => {
      assert.ok(err instanceof TenantMoveVerifyError)
      assert.ok(err.mismatches.some((m) => m.table === 'people' && m.expected === 2 && m.found === 0))
      return true
    },
  )
  // Source NOT deleted from.
  assert.equal(source._deleted.length, 0)
  assert.equal(source._store.get('people').rows.length, 2)
})

test('executeTenantMove: missing target table for a non-empty source table aborts before any write', async () => {
  const source = fakeGateway({
    tenants: { cols: ['id'], rows: [{ id: 't1' }] },
    people: { cols: ['id', 'tenant_id'], rows: [{ id: 'p1', tenant_id: 't1' }] },
  })
  const target = fakeGateway({
    tenants: { cols: ['id'], rows: [] },
    // no `people` on target
  })
  const plan = await planTenantMove({ tenantId: 't1', source, target })
  const backups = []
  await assert.rejects(
    () => executeTenantMove({ plan, source, target, writeBackup: (rel) => backups.push(rel) }),
    (err) => {
      assert.ok(err instanceof TenantMoveError)
      assert.match(err.message, /missing table public\.people/)
      return true
    },
  )
  // Nothing was backed up or deleted (aborted in pre-flight).
  assert.equal(backups.length, 0)
  assert.equal(source._deleted.length, 0)
})
