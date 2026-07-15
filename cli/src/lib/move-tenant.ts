// Tenant move between industry pools (Runner v2, milestone M3).
//
// Moves ONE tenant's rows from a source pool (Supabase project) to a target pool,
// parents-before-children, with a JSON backup taken BEFORE any write, a per-table
// verify that hard-stops before the source is ever touched, and a children-first
// delete only after verification passes.
//
// Network is reached only through an injected `runQuery` (wrapped as a
// PoolGateway), so the whole orchestrator is unit-testable against a fake gateway
// or a mocked query executor and never touches a real project.
//
// SQL values round-trip through jsonb: rows are read as `to_jsonb(t)` and written
// with `jsonb_populate_recordset(null::public.<table>, $tag$…$tag$::jsonb)`, which
// preserves types (including jsonb columns) and avoids per-column escaping. The
// dollar-quote tag is guarded against occurring inside the payload.

// ---------------------------------------------------------------------------
// Table order — parents before children (children deleted in reverse).
// ---------------------------------------------------------------------------

export interface MoveTableSpec {
  table: string
  /** The tenants table itself keys on `id`, not `tenant_id`. */
  isTenantsTable?: boolean
  /** Fallback join used when the table has no `tenant_id` column of its own. */
  parent?: { table: string; fk: string }
}

/** Fixed apply order: tenants first, then children by FK depth. */
export const MOVE_TABLES: MoveTableSpec[] = [
  { table: 'tenants', isTenantsTable: true },
  { table: 'people' },
  { table: 'services' },
  { table: 'schedules' },
  { table: 'orders' },
  { table: 'appointments' },
  // NB: the FK kept its pre-rename name — 004_archetypes creates booking_id too
  { table: 'appointment_items', parent: { table: 'appointments', fk: 'booking_id' } },
  { table: 'order_items', parent: { table: 'orders', fk: 'order_id' } },
  { table: 'transactions' },
]

// ---------------------------------------------------------------------------
// Pure SQL helpers
// ---------------------------------------------------------------------------

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Reject anything that is not a bare SQL identifier (defence-in-depth). */
export function assertIdent(name: string): string {
  if (!IDENT_RE.test(name)) throw new Error(`unsafe SQL identifier: ${JSON.stringify(name)}`)
  return name
}

/** Escape a value for a single-quoted SQL literal. */
export function sqlLiteral(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`
}

/** Double-quote an identifier for use in a column/table position. */
export function qIdent(name: string): string {
  return `"${assertIdent(name)}"`
}

export function regclassQuery(table: string): string {
  return `SELECT to_regclass(${sqlLiteral(`public.${assertIdent(table)}`)})::text AS reg;`
}

export function columnsQuery(table: string): string {
  return (
    `SELECT column_name FROM information_schema.columns ` +
    `WHERE table_schema = 'public' AND table_name = ${sqlLiteral(assertIdent(table))} ` +
    `ORDER BY ordinal_position;`
  )
}

/** Select this tenant's rows as jsonb (`{ r: {...} }` per row). */
export function selectRowsQuery(spec: MoveTableSpec, tenantId: string, hasTenantId: boolean): string {
  const t = assertIdent(spec.table)
  if (spec.isTenantsTable) {
    return `SELECT to_jsonb(t) AS r FROM public.${t} t WHERE t.id = ${sqlLiteral(tenantId)};`
  }
  if (hasTenantId) {
    return `SELECT to_jsonb(t) AS r FROM public.${t} t WHERE t.tenant_id = ${sqlLiteral(tenantId)};`
  }
  if (spec.parent) {
    const p = assertIdent(spec.parent.table)
    const fk = assertIdent(spec.parent.fk)
    return (
      `SELECT to_jsonb(c) AS r FROM public.${t} c ` +
      `JOIN public.${p} p ON p.id = c.${fk} ` +
      `WHERE p.tenant_id = ${sqlLiteral(tenantId)};`
    )
  }
  throw new Error(`table ${spec.table} has no tenant_id column and no parent join defined`)
}

export interface ColumnIntersection {
  /** Columns present in BOTH source and target (source order preserved). */
  shared: string[]
  /** Source columns with no target counterpart — data left behind (warn). */
  sourceOnly: string[]
  /** Target columns with no source counterpart — defaulted/NULL on insert (warn). */
  targetOnly: string[]
}

export function columnIntersection(sourceCols: string[], targetCols: string[]): ColumnIntersection {
  const targetSet = new Set(targetCols)
  const sourceSet = new Set(sourceCols)
  return {
    shared: sourceCols.filter((c) => targetSet.has(c)),
    sourceOnly: sourceCols.filter((c) => !targetSet.has(c)),
    targetOnly: targetCols.filter((c) => !sourceSet.has(c)),
  }
}

/** Pick a `$tag$` dollar-quote tag that does NOT occur inside `payload`. */
export function pickDollarTag(payload: string, base = 'fayzjson'): string {
  let tag = base
  let i = 0
  while (payload.includes(`$${tag}$`)) {
    i += 1
    tag = `${base}${i}`
  }
  return tag
}

/**
 * Build a multi-row insert from a JSON payload via jsonb_populate_recordset.
 * `cols` is the source∩target intersection; the recordset is typed as the TARGET
 * row so types (incl. jsonb) round-trip. Returns '' when there is nothing to insert.
 */
export function insertRowsQuery(table: string, cols: string[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  if (cols.length === 0) throw new Error(`no shared columns to insert into ${table}`)
  const t = assertIdent(table)
  const payload = JSON.stringify(rows)
  const tag = pickDollarTag(payload)
  const colList = cols.map(qIdent).join(', ')
  return (
    `INSERT INTO public.${t} (${colList})\n` +
    `SELECT ${colList}\n` +
    `FROM jsonb_populate_recordset(null::public.${t}, $${tag}$${payload}$${tag}$::jsonb)\n` +
    `ON CONFLICT (id) DO NOTHING;`
  )
}

export function verifyCountQuery(table: string, ids: string[]): string {
  const inList = ids.map(sqlLiteral).join(', ')
  return `SELECT count(*)::int AS n FROM public.${assertIdent(table)} WHERE id IN (${inList});`
}

export function deleteQuery(table: string, ids: string[]): string {
  const inList = ids.map(sqlLiteral).join(', ')
  return `DELETE FROM public.${assertIdent(table)} WHERE id IN (${inList});`
}

// ---------------------------------------------------------------------------
// PoolGateway — thin typed wrapper over an injected runQuery.
// ---------------------------------------------------------------------------

export type RunQuery = (sql: string) => Promise<unknown>

export interface PoolGateway {
  regclass(table: string): Promise<boolean>
  columns(table: string): Promise<string[]>
  selectRows(spec: MoveTableSpec, tenantId: string, hasTenantId: boolean): Promise<Record<string, unknown>[]>
  insertRows(table: string, cols: string[], rows: Record<string, unknown>[]): Promise<void>
  countByIds(table: string, ids: string[]): Promise<number>
  deleteByIds(table: string, ids: string[]): Promise<number>
}

function asRows(res: unknown): Record<string, unknown>[] {
  return Array.isArray(res) ? (res as Record<string, unknown>[]) : []
}

export function createPoolGateway(runQuery: RunQuery): PoolGateway {
  return {
    async regclass(table) {
      const rows = asRows(await runQuery(regclassQuery(table)))
      return rows.length > 0 && rows[0].reg != null
    },
    async columns(table) {
      const rows = asRows(await runQuery(columnsQuery(table)))
      return rows.map((r) => String(r.column_name))
    },
    async selectRows(spec, tenantId, hasTenantId) {
      const rows = asRows(await runQuery(selectRowsQuery(spec, tenantId, hasTenantId)))
      return rows.map((r) => r.r as Record<string, unknown>)
    },
    async insertRows(table, cols, rows) {
      const sql = insertRowsQuery(table, cols, rows)
      if (sql) await runQuery(sql)
    },
    async countByIds(table, ids) {
      if (ids.length === 0) return 0
      const rows = asRows(await runQuery(verifyCountQuery(table, ids)))
      return rows.length > 0 ? Number(rows[0].n) : 0
    },
    async deleteByIds(table, ids) {
      if (ids.length === 0) return 0
      await runQuery(deleteQuery(table, ids))
      return ids.length
    },
  }
}

// ---------------------------------------------------------------------------
// Plan (reads only)
// ---------------------------------------------------------------------------

export type MoveFilter = 'id' | 'tenant_id' | 'parent-join'

export interface TenantMovePlanRow {
  table: string
  /** Set when the table was not selected (with the reason). */
  skipped?: string
  sourceExists: boolean
  targetExists: boolean
  filter: MoveFilter
  rowCount: number
  ids: string[]
  /** The selected rows (carried so execute can back up + insert without re-reading). */
  data: Record<string, unknown>[]
  sourceCols: string[]
  targetCols: string[]
  shared: string[]
  sourceOnly: string[]
  targetOnly: string[]
  /** Target rows already carrying one of `ids` — reported as PK conflicts in dry-run. */
  conflicts: number
}

export interface TenantMovePlan {
  tenantId: string
  rows: TenantMovePlanRow[]
}

function emptyRow(table: string, over: Partial<TenantMovePlanRow>): TenantMovePlanRow {
  return {
    table,
    sourceExists: false,
    targetExists: false,
    filter: 'tenant_id',
    rowCount: 0,
    ids: [],
    data: [],
    sourceCols: [],
    targetCols: [],
    shared: [],
    sourceOnly: [],
    targetOnly: [],
    conflicts: 0,
    ...over,
  }
}

/**
 * Read-only plan: for each table (fixed order), resolve existence on both pools,
 * the selection filter (id / tenant_id / parent-join), the tenant's rows, the
 * column intersection, and any PK conflicts already on the target.
 */
export async function planTenantMove(opts: {
  tenantId: string
  source: PoolGateway
  target: PoolGateway
  log?: (message: string) => void
}): Promise<TenantMovePlan> {
  const log = opts.log ?? (() => {})
  const rows: TenantMovePlanRow[] = []

  for (const spec of MOVE_TABLES) {
    const sourceExists = await opts.source.regclass(spec.table)
    if (!sourceExists) {
      log(`  ⤍ skip ${spec.table} — not present on source`)
      rows.push(emptyRow(spec.table, { skipped: 'absent on source' }))
      continue
    }

    const sourceCols = await opts.source.columns(spec.table)
    let filter: MoveFilter
    let hasTenantId = false
    if (spec.isTenantsTable) {
      filter = 'id'
    } else if (sourceCols.includes('tenant_id')) {
      filter = 'tenant_id'
      hasTenantId = true
    } else if (spec.parent) {
      filter = 'parent-join'
    } else {
      log(`  ⤍ skip ${spec.table} — no tenant_id column and no parent join`)
      rows.push(emptyRow(spec.table, { skipped: 'no tenant_id / no parent join', sourceExists: true, sourceCols }))
      continue
    }

    const data = await opts.source.selectRows(spec, opts.tenantId, hasTenantId)
    const ids = data.map((r) => String(r.id))
    const targetExists = await opts.target.regclass(spec.table)
    const targetCols = targetExists ? await opts.target.columns(spec.table) : []
    const inter = columnIntersection(sourceCols, targetCols)
    const conflicts = targetExists ? await opts.target.countByIds(spec.table, ids) : 0

    rows.push({
      table: spec.table,
      sourceExists: true,
      targetExists,
      filter,
      rowCount: data.length,
      ids,
      data,
      sourceCols,
      targetCols,
      shared: inter.shared,
      sourceOnly: inter.sourceOnly,
      targetOnly: inter.targetOnly,
      conflicts,
    })
  }

  return { tenantId: opts.tenantId, rows }
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

export class TenantMoveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantMoveError'
  }
}

export interface CountMismatch {
  table: string
  expected: number
  found: number
}

export class TenantMoveVerifyError extends Error {
  constructor(readonly mismatches: CountMismatch[]) {
    super(
      `HARD STOP — target row counts do not match source after insert; source left UNTOUCHED:\n` +
        mismatches.map((m) => `  ${m.table}: expected ${m.expected}, found ${m.found}`).join('\n'),
    )
    this.name = 'TenantMoveVerifyError'
  }
}

async function collectMismatches(
  rows: TenantMovePlanRow[],
  target: PoolGateway,
): Promise<CountMismatch[]> {
  const out: CountMismatch[] = []
  for (const r of rows) {
    const found = await target.countByIds(r.table, r.ids)
    if (found !== r.ids.length) out.push({ table: r.table, expected: r.ids.length, found })
  }
  return out
}

export interface TenantMoveExecResult {
  moved: { table: string; rowCount: number; deleted: number }[]
}

/**
 * Execute a planned move: (a) back up EVERY selected table BEFORE any write;
 * (b) INSERT parents-first (ON CONFLICT DO NOTHING); (c) VERIFY per-table counts,
 * HARD STOP on any mismatch with the source still untouched; (d) re-verify as a
 * sanity check, then DELETE children-first from the source.
 */
export async function executeTenantMove(opts: {
  plan: TenantMovePlan
  source: PoolGateway
  target: PoolGateway
  /** Persist a backup file (path is relative to the caller's backup dir). */
  writeBackup: (relativePath: string, contents: string) => void
  log?: (message: string) => void
}): Promise<TenantMoveExecResult> {
  const log = opts.log ?? (() => {})
  const active = opts.plan.rows.filter((r) => !r.skipped && r.rowCount > 0)

  // Pre-flight — refuse before any write if a non-empty table cannot land on target.
  for (const r of active) {
    if (!r.targetExists) {
      throw new TenantMoveError(
        `target is missing table public.${r.table} but source has ${r.rowCount} row(s) to move — aborting before any write.`,
      )
    }
    if (!r.shared.includes('id')) {
      throw new TenantMoveError(
        `table ${r.table} has no shared 'id' column between source and target — aborting before any write.`,
      )
    }
    if (r.sourceOnly.length > 0) log(`  ⚠ ${r.table}: source-only columns NOT carried: ${r.sourceOnly.join(', ')}`)
    if (r.targetOnly.length > 0) log(`  ⚠ ${r.table}: target-only columns defaulted: ${r.targetOnly.join(', ')}`)
  }

  // (a) BACKUP everything first.
  for (const r of active) {
    opts.writeBackup(`${r.table}.json`, JSON.stringify(r.data, null, 2))
    log(`  ✓ backup ${r.table}.json (${r.rowCount} row(s))`)
  }

  // (b) INSERT parents-first.
  for (const r of active) {
    await opts.target.insertRows(r.table, r.shared, r.data)
    log(`  ✓ inserted → target ${r.table} (${r.rowCount})`)
  }

  // (c) VERIFY — hard stop leaves the source untouched.
  const mismatches = await collectMismatches(active, opts.target)
  if (mismatches.length > 0) throw new TenantMoveVerifyError(mismatches)

  // (d) Re-verify immediately before deleting, then DELETE children-first.
  const preDelete = await collectMismatches(active, opts.target)
  if (preDelete.length > 0) throw new TenantMoveVerifyError(preDelete)

  const moved: TenantMoveExecResult['moved'] = []
  for (const r of [...active].reverse()) {
    const deleted = await opts.source.deleteByIds(r.table, r.ids)
    moved.push({ table: r.table, rowCount: r.rowCount, deleted })
    log(`  ✓ deleted ← source ${r.table} (${deleted})`)
  }
  moved.reverse() // report parents-first

  return { moved }
}
