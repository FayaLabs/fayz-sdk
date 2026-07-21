import { createInterface } from 'node:readline'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildMigrationPlan, MigrationPlanError, type MigrationPlan } from '../lib/migration-plan.js'
import {
  createPoolGateway,
  planTenantMove,
  executeTenantMove,
  TenantMoveError,
  TenantMoveVerifyError,
  type TenantMovePlan,
} from '../lib/move-tenant.js'
import {
  confirmationGate,
  createManagementClient,
  executeMigrationPlan,
  ManagementApiError,
  MigrationDriftError,
  MigrationExecutionError,
  resolveSupabaseEnv,
  type ManagementClient,
} from '../lib/supabase-management.js'
import { buildLedgerGate, readLedger } from '../lib/ledger.js'
import {
  loadPoolsFile,
  planFanOut,
  poolCriticalGate,
  requirePool,
  runFanOut,
  PoolsError,
  type Pool,
  type PoolsConfig,
} from '../lib/pools.js'

// `fayz db pool …` and `fayz db fan-out …` — Runner v2 pool orchestration.
// Each pool is a separate Supabase project (ref from the pools file); the access
// token comes from SUPABASE_PAT / SUPABASE_ACCESS_TOKEN in the environment.
// Applies are ALWAYS ledger-gated (skip-on-equal, hard-stop on drift).

// ---------------------------------------------------------------------------
// Flag parsing
// ---------------------------------------------------------------------------

interface PoolFlags {
  poolsFile?: string
  app?: string
  industry?: string
  canary?: string
  dryRun: boolean
  yes: boolean
  allowCritical: boolean
  spineOnly: boolean
  pluginsOnly: boolean
  /** apply: allow applying to a PROVISIONING pool (e.g. the dentist baseline post-wipe). */
  includeProvisioning: boolean
  onlyPlugins?: string[]
  /** move-tenant: source pool, target pool, tenant uuid. */
  from?: string
  to?: string
  tenant?: string
  /** First non-flag positional (e.g. the industry-or-pool-name for `pool apply`). */
  target?: string
}

function parseFlags(args: string[]): PoolFlags {
  const f: PoolFlags = {
    dryRun: false,
    yes: false,
    allowCritical: false,
    spineOnly: false,
    pluginsOnly: false,
    includeProvisioning: false,
  }
  const take = (i: number): [string, number] => {
    const inline = args[i]
    const eq = inline.indexOf('=')
    if (eq >= 0) return [inline.slice(eq + 1), i]
    return [args[i + 1] ?? '', i + 1]
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') f.dryRun = true
    else if (a === '--yes' || a === '-y') f.yes = true
    else if (a === '--allow-critical') f.allowCritical = true
    else if (a === '--spine-only') f.spineOnly = true
    else if (a === '--plugins-only') f.pluginsOnly = true
    else if (a === '--include-provisioning') f.includeProvisioning = true
    else if (a.startsWith('--pools-file')) { const [v, ni] = take(i); f.poolsFile = v; i = ni }
    else if (a.startsWith('--app')) { const [v, ni] = take(i); f.app = v; i = ni }
    else if (a.startsWith('--from')) { const [v, ni] = take(i); f.from = v; i = ni }
    else if (a.startsWith('--tenant')) { const [v, ni] = take(i); f.tenant = v; i = ni }
    else if (a.startsWith('--to')) { const [v, ni] = take(i); f.to = v; i = ni }
    else if (a.startsWith('--industry')) { const [v, ni] = take(i); f.industry = v; i = ni }
    else if (a.startsWith('--canary')) { const [v, ni] = take(i); f.canary = v; i = ni }
    else if (a.startsWith('--only-plugins')) {
      const [v, ni] = take(i)
      f.onlyPlugins = v.split(',').map((s) => s.trim()).filter(Boolean)
      i = ni
    } else if (!a.startsWith('-') && f.target === undefined) {
      f.target = a
    }
  }
  return f
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Resolve the Supabase access token (ref comes from the pool, not env). */
function resolveToken(appDir: string): { token?: string; error?: string } {
  const env = resolveSupabaseEnv({ appDir })
  if (!env.accessToken) {
    return {
      error:
        'Missing Supabase access token (SUPABASE_PAT or SUPABASE_ACCESS_TOKEN).\n' +
        '  Set it in your shell or in <app>/.env.local. The project ref comes from the pools file.',
    }
  }
  return { token: env.accessToken }
}

function loadPools(f: PoolFlags): PoolsConfig {
  return loadPoolsFile(f.poolsFile)
}

function buildPlanOrThrow(dir: string, f: PoolFlags): MigrationPlan {
  return buildMigrationPlan(dir, {
    spineOnly: f.spineOnly,
    pluginsOnly: f.pluginsOnly,
    onlyPlugins: f.onlyPlugins,
  })
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await new Promise<string>((res) => rl.question(question, res))
    return answer.trim().toLowerCase() === 'y'
  } finally {
    rl.close()
  }
}

/** Ledger-gated apply of `plan` to one pool. Returns applied/skipped counts. */
async function applyPlanToPool(
  plan: MigrationPlan,
  pool: Pool,
  token: string,
  opts: { log?: (m: string) => void } = {},
): Promise<{ filesApplied: number; filesSkipped: number }> {
  const client = createManagementClient({ projectRef: pool.ref, accessToken: token })
  const gate = await buildLedgerGate(client, { appliedBy: 'fayz-cli' })
  const result = await executeMigrationPlan(plan, client, { log: opts.log, ledger: gate })
  return { filesApplied: result.filesApplied, filesSkipped: result.filesSkipped }
}

// ---------------------------------------------------------------------------
// `fayz db pool status [--pools-file f] [--app dir]`
// ---------------------------------------------------------------------------

async function poolStatus(f: PoolFlags): Promise<number> {
  let config: PoolsConfig
  try {
    config = loadPools(f)
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }

  const { token, error } = resolveToken(f.app ?? process.cwd())
  if (!token) {
    console.error(`✗ ${error}`)
    return 1
  }

  // Optional: compare against a local plan when --app is supplied.
  let localByPlugin: Map<string, string> | undefined
  if (f.app) {
    try {
      const plan = buildPlanOrThrow(f.app, f)
      localByPlugin = new Map()
      for (const step of plan.steps) {
        if (step.files.length === 0) continue
        localByPlugin.set(step.id, basename(step.files[step.files.length - 1].path))
      }
    } catch (err) {
      console.error(`⚠ could not build a local plan from --app ${f.app}: ${(err as Error).message}`)
    }
  }

  console.log(`▸ Pool ledger status (${config.pools.length} pool(s))\n`)
  for (const pool of config.pools) {
    console.log(`  ${pool.industry.padEnd(11)} ${pool.name}  [${pool.status}]  ref=${pool.ref}`)
    if (pool.status === 'PROVISIONING') {
      console.log(`      (provisioning — ledger not queried)`)
      continue
    }
    const client = createManagementClient({ projectRef: pool.ref, accessToken: token })
    let rows
    try {
      rows = await readLedger(client)
    } catch (err) {
      if (err instanceof ManagementApiError) {
        console.log(`      NO LEDGER (public._migrations absent — never applied)`)
      } else {
        console.log(`      ✗ query failed: ${(err as Error).message}`)
      }
      continue
    }
    if (rows.length === 0) {
      console.log(`      ledger present, 0 rows (no migrations applied)`)
      continue
    }
    // Group by plugin_id → latest (max) file_name + its version.
    const latest = new Map<string, { file: string; version?: string | null }>()
    for (const r of rows) {
      const cur = latest.get(r.plugin_id)
      if (!cur || r.file_name > cur.file) latest.set(r.plugin_id, { file: r.file_name, version: r.plugin_version })
    }
    for (const [pluginId, info] of [...latest.entries()].sort()) {
      const local = localByPlugin?.get(pluginId)
      const drift = local && local !== info.file ? `  (local head: ${local})` : ''
      const ver = info.version ? ` v${info.version}` : ''
      console.log(`      ${pluginId.padEnd(20)} → ${info.file}${ver}${drift}`)
    }
  }
  return 0
}

// ---------------------------------------------------------------------------
// `fayz db pool apply <industry-or-pool-name> --app <dir> [flags]`
// ---------------------------------------------------------------------------

async function poolApply(f: PoolFlags): Promise<number> {
  if (!f.target) {
    console.error('✗ usage: fayz db pool apply <industry-or-pool-name> --app <dir> [flags]')
    return 1
  }
  if (f.spineOnly && f.pluginsOnly) {
    console.error('✗ --spine-only and --plugins-only are mutually exclusive.')
    return 1
  }

  let config: PoolsConfig
  let pool: Pool
  try {
    config = loadPools(f)
    pool = requirePool(config, f.target)
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }

  if (pool.status === 'PROVISIONING') {
    if (!f.includeProvisioning) {
      console.error(
        `✗ pool '${pool.name}' is PROVISIONING — not ready for apply.\n` +
          `  Pass --include-provisioning to baseline it anyway (e.g. the dentist pool post-wipe), ` +
          `then flip its status to ACTIVE in pools.config.json.`,
      )
      return 1
    }
    console.log(`⚠ pool '${pool.name}' is PROVISIONING — proceeding (--include-provisioning).`)
  }

  const critical = poolCriticalGate(pool, { yes: f.yes, allowCritical: f.allowCritical })
  if (!critical.ok) {
    console.error(`✗ ${critical.error}`)
    return 1
  }

  const appDir = f.app ?? process.cwd()

  // Build the plan from the app dir (the app determines the plugin set). For a
  // pool-level core-only run, point --app at a plain dir that has node_modules/
  // @fayz-ai/db installed and pass --spine-only.
  let plan: MigrationPlan
  try {
    plan = buildPlanOrThrow(appDir, f)
  } catch (err) {
    if (err instanceof MigrationPlanError) {
      console.error(`✗ ${err.message}`)
      return 1
    }
    throw err
  }

  if (f.dryRun) {
    console.log(`▸ [dry-run] would apply ${plan.totalFiles} file(s) to ${pool.name} (${pool.ref})`)
    for (const step of plan.steps) {
      console.log(`    [${step.source}] ${step.id} (${step.files.length} file(s))`)
    }
    return 0
  }

  const { token, error } = resolveToken(appDir)
  if (!token) {
    console.error(`✗ ${error}`)
    return 1
  }

  if (plan.totalFiles === 0) {
    console.log('▸ Nothing to apply — the plan resolved 0 SQL files.')
    return 0
  }

  console.log(`▸ About to apply ${plan.totalFiles} SQL file(s) to pool '${pool.name}' (${pool.ref})`)
  const gate = confirmationGate({ yes: f.yes, isTTY: Boolean(process.stdin.isTTY) })
  if (gate.error) {
    console.error(`✗ ${gate.error}`)
    return 1
  }
  if (gate.needsPrompt) {
    const ok = await promptConfirm(`  Type 'y' to apply to '${pool.name}': `)
    if (!ok) {
      console.log('Aborted — nothing was applied.')
      return 1
    }
  }

  try {
    await applyPlanToPool(plan, pool, token, { log: (m) => console.log(m) })
  } catch (err) {
    if (err instanceof MigrationDriftError || err instanceof MigrationExecutionError) {
      console.error(`✗ ${err.message}`)
      return 1
    }
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }
  return 0
}

// ---------------------------------------------------------------------------
// `fayz db pool move-tenant --from <pool> --to <pool> --tenant <uuid> [--yes]`
// ---------------------------------------------------------------------------

/** Print the read-only move plan as a per-table table. */
function printMovePlan(plan: TenantMovePlan): void {
  console.log(`\n▸ Move plan for tenant ${plan.tenantId}:`)
  console.log(
    `    ${'table'.padEnd(20)} ${'src'.padStart(5)} ${'filter'.padEnd(12)} ` +
      `${'target'.padEnd(8)} ${'conflict'.padStart(8)}  cols`,
  )
  for (const r of plan.rows) {
    if (r.skipped) {
      console.log(`    ${r.table.padEnd(20)} ${'—'.padStart(5)} skip: ${r.skipped}`)
      continue
    }
    const tgt = r.targetExists ? 'present' : 'MISSING'
    const colsWarn =
      (r.sourceOnly.length ? ` src-only:${r.sourceOnly.length}` : '') +
      (r.targetOnly.length ? ` tgt-only:${r.targetOnly.length}` : '')
    console.log(
      `    ${r.table.padEnd(20)} ${String(r.rowCount).padStart(5)} ${r.filter.padEnd(12)} ` +
        `${tgt.padEnd(8)} ${String(r.conflicts).padStart(8)} ${colsWarn}`,
    )
  }
}

async function poolMoveTenant(f: PoolFlags): Promise<number> {
  if (!f.from || !f.to || !f.tenant) {
    console.error(
      '✗ usage: fayz db pool move-tenant --from <pool> --to <pool> --tenant <uuid> [--yes]',
    )
    return 1
  }
  if (f.from === f.to) {
    console.error('✗ --from and --to must be different pools.')
    return 1
  }

  let config: PoolsConfig
  let source: Pool
  let target: Pool
  try {
    config = loadPools(f)
    source = requirePool(config, f.from)
    target = requirePool(config, f.to)
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }

  // Source must merely exist; the target must be ready to receive (not PROVISIONING).
  if (target.status === 'PROVISIONING') {
    console.error(`✗ target pool '${target.name}' is PROVISIONING — not ready to receive tenants.`)
    return 1
  }

  const { token, error } = resolveToken(f.app ?? process.cwd())
  if (!token) {
    console.error(`✗ ${error}`)
    return 1
  }

  const sourceClient = createManagementClient({ projectRef: source.ref, accessToken: token })
  const targetClient = createManagementClient({ projectRef: target.ref, accessToken: token })
  const sourceGw = createPoolGateway((sql) => sourceClient.runQuery(sql))
  const targetGw = createPoolGateway((sql) => targetClient.runQuery(sql))

  console.log(
    `▸ Move tenant ${f.tenant}\n    from ${source.name} (${source.ref})\n    to   ${target.name} (${target.ref})`,
  )

  let plan: TenantMovePlan
  try {
    plan = await planTenantMove({
      tenantId: f.tenant,
      source: sourceGw,
      target: targetGw,
      log: (m) => console.log(m),
    })
  } catch (err) {
    console.error(`✗ plan failed: ${(err as Error).message}`)
    return 1
  }
  printMovePlan(plan)

  const total = plan.rows.reduce((n, r) => n + r.rowCount, 0)
  if (!f.yes) {
    console.log(
      `\n▸ [dry-run] ${total} row(s) across ${plan.rows.filter((r) => r.rowCount > 0).length} table(s) would move. ` +
        `Re-run with --yes to execute (JSON backup written BEFORE any write).`,
    )
    return 0
  }
  if (total === 0) {
    console.log('\n▸ Nothing to move — the tenant has 0 rows on the source. Aborting.')
    return 0
  }

  // Execute: backups land under ~/dev/fayz-backups/tenant-moves/<date>-<tenant>/.
  const date = new Date().toISOString().slice(0, 10)
  const backupDir = join(homedir(), 'dev', 'fayz-backups', 'tenant-moves', `${date}-${f.tenant}`)
  try {
    mkdirSync(backupDir, { recursive: true })
  } catch (err) {
    console.error(`✗ could not create backup dir ${backupDir}: ${(err as Error).message}`)
    return 1
  }
  console.log(`\n▸ Executing — backups → ${backupDir}`)

  try {
    const result = await executeTenantMove({
      plan,
      source: sourceGw,
      target: targetGw,
      writeBackup: (rel, contents) => writeFileSync(join(backupDir, rel), contents),
      log: (m) => console.log(m),
    })
    console.log('\n▸ Move complete:')
    for (const m of result.moved) {
      console.log(`    ${m.table.padEnd(20)} moved ${m.rowCount}, deleted from source ${m.deleted}`)
    }
    console.log(
      `\n✋ Next: fetch the target pool's anon key and update TenantPoolRoute (platform Prisma DB) ` +
        `to point ${f.tenant} at ${target.name}.`,
    )
    return 0
  } catch (err) {
    if (err instanceof TenantMoveVerifyError || err instanceof TenantMoveError) {
      console.error(`\n✗ ${err.message}`)
      console.error(`  Source pool was NOT modified. Backups are at ${backupDir}.`)
      return 1
    }
    console.error(`\n✗ move failed: ${(err as Error).message}`)
    console.error(`  Inspect target manually before retrying. Backups are at ${backupDir}.`)
    return 1
  }
}

// ---------------------------------------------------------------------------
// `fayz db fan-out --app <dir> [--industry all|<slug>] [--canary <pool>] [--yes] [--allow-critical]`
// ---------------------------------------------------------------------------

export async function fanOut(args: string[]): Promise<number> {
  const f = parseFlags(args)
  if (f.spineOnly && f.pluginsOnly) {
    console.error('✗ --spine-only and --plugins-only are mutually exclusive.')
    return 1
  }

  let config: PoolsConfig
  try {
    config = loadPools(f)
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }

  const appDir = f.app ?? process.cwd()

  let plan: MigrationPlan
  try {
    plan = buildPlanOrThrow(appDir, f)
  } catch (err) {
    if (err instanceof MigrationPlanError || err instanceof PoolsError) {
      console.error(`✗ ${(err as Error).message}`)
      return 1
    }
    throw err
  }

  let order
  try {
    order = planFanOut(config, { industry: f.industry, canary: f.canary })
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }

  const wave = [...(order.canary ? [order.canary] : []), ...order.rest]
  if (wave.length === 0) {
    console.log('▸ No pools in scope for this fan-out.')
    for (const s of order.skipped) console.log(`    skip ${s.pool.name}: ${s.reason}`)
    return 0
  }

  // Critical gate: any dataCritical pool in the wave requires --yes + --allow-critical.
  for (const pool of wave) {
    const critical = poolCriticalGate(pool, { yes: f.yes, allowCritical: f.allowCritical })
    if (!critical.ok) {
      console.error(`✗ ${critical.error}`)
      return 1
    }
  }

  // Preview + confirm the whole wave.
  console.log(`▸ Fan-out plan (${plan.totalFiles} SQL file(s) per pool):`)
  if (order.canary) console.log(`    canary → ${order.canary.name} (${order.canary.ref})`)
  for (const p of order.rest) console.log(`    then   → ${p.name} (${p.ref})`)
  for (const s of order.skipped) console.log(`    skip   → ${s.pool.name}: ${s.reason}`)

  const gate = confirmationGate({ yes: f.yes, isTTY: Boolean(process.stdin.isTTY) })
  if (gate.error) {
    console.error(`✗ ${gate.error}`)
    return 1
  }
  if (gate.needsPrompt) {
    const ok = await promptConfirm(`  Type 'y' to fan-out to ${wave.length} pool(s): `)
    if (!ok) {
      console.log('Aborted — nothing was applied.')
      return 1
    }
  }

  if (f.dryRun) {
    console.log('▸ [dry-run] fan-out order shown above; nothing applied.')
    return 0
  }

  const { token, error } = resolveToken(appDir)
  if (!token) {
    console.error(`✗ ${error}`)
    return 1
  }

  const run = await runFanOut(order, async (pool) => {
    console.log(`\n=== pool: ${pool.name} (${pool.ref}) ===`)
    return applyPlanToPool(plan, pool, token, { log: (m) => console.log(m) })
  })

  // Per-pool summary.
  console.log('\n▸ Fan-out summary:')
  for (const r of run.results) {
    const tag =
      r.status === 'applied'
        ? `applied (${r.filesApplied} file(s)${r.filesSkipped ? `, ${r.filesSkipped} skipped` : ''})`
        : r.status === 'skipped'
          ? `skipped — ${r.detail}`
          : `FAILED — ${r.detail?.split('\n')[0]}`
    console.log(`    ${r.pool.name.padEnd(24)} ${tag}`)
  }
  return run.ok ? 0 : 1
}

// ---------------------------------------------------------------------------
// `fayz db pool <status|apply|move-tenant>` dispatcher
// ---------------------------------------------------------------------------

export async function pool(sub: string | undefined, args: string[]): Promise<number> {
  const f = parseFlags(args)
  switch (sub) {
    case 'status':
      return poolStatus(f)
    case 'apply':
      return poolApply(f)
    case 'move-tenant':
      return poolMoveTenant(f)
    default:
      console.error(
        `✗ Unknown 'fayz db pool' subcommand "${sub ?? ''}". Try: status | apply <name> --app <dir> | move-tenant`,
      )
      return 1
  }
}
