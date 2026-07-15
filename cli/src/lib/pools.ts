import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Industry-pool registry access for Runner v2. TWO sources, one shape:
//   Source A (default now): a static pools.config.json (this repo / shipped in
//     the published CLI). Loaded via `--pools-file` or the default path.
//   Source B (later): the platform Prisma Postgres registry, reached over
//     FAYZ_REGISTRY_URL / DATABASE_URL. Defined here as an interface + a stub
//     that refuses until provisioned — NO `pg` dependency is added yet, keeping
//     the CLI dependency-free. See createPostgresPoolRegistry.

export type PoolStatus = 'ACTIVE' | 'PROVISIONING' | 'DECOMMISSIONED'

export interface PoolFlags {
  /** Default fan-out canary — validated first before the rest of the wave. */
  canary?: boolean
  /** Holds real production data — apply requires BOTH --yes AND --allow-critical. */
  dataCritical?: boolean
  /** Carries bespoke tables that must be preserved across conversions (informational). */
  preserveBespoke?: boolean
}

export interface Pool {
  /** Industry slug, e.g. 'ecommerce', 'salon'. Unique per pool. */
  industry: string
  /** Cluster name, e.g. 'cluster-ecommerce-br-01'. */
  name: string
  /** Supabase project ref. */
  ref: string
  /** Supabase project URL. */
  url: string
  status: PoolStatus
  flags: PoolFlags
}

export interface PoolsConfig {
  version: number
  pools: Pool[]
}

/** Thrown for a malformed pools file or an unresolvable pool key. */
export class PoolsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PoolsError'
  }
}

// ---------------------------------------------------------------------------
// Source A — static pools.config.json
// ---------------------------------------------------------------------------

const VALID_STATUS: readonly PoolStatus[] = ['ACTIVE', 'PROVISIONING', 'DECOMMISSIONED']

/** Validate an arbitrary parsed object into a PoolsConfig (throws PoolsError otherwise). */
export function parsePoolsConfig(raw: unknown): PoolsConfig {
  if (!raw || typeof raw !== 'object') throw new PoolsError('pools config is not an object')
  const obj = raw as Record<string, unknown>
  const poolsRaw = obj.pools
  if (!Array.isArray(poolsRaw)) throw new PoolsError('pools config has no "pools" array')

  const pools: Pool[] = poolsRaw.map((p, i) => {
    const r = p as Record<string, unknown>
    for (const field of ['industry', 'name', 'ref', 'url', 'status'] as const) {
      if (typeof r[field] !== 'string' || !r[field]) {
        throw new PoolsError(`pool[${i}] is missing required string field "${field}"`)
      }
    }
    const status = r.status as PoolStatus
    if (!VALID_STATUS.includes(status)) {
      throw new PoolsError(`pool[${i}] "${String(r.industry)}" has invalid status "${String(status)}"`)
    }
    return {
      industry: r.industry as string,
      name: r.name as string,
      ref: r.ref as string,
      url: r.url as string,
      status,
      flags: (r.flags && typeof r.flags === 'object' ? r.flags : {}) as PoolFlags,
    }
  })

  const version = typeof obj.version === 'number' ? obj.version : 1
  return { version, pools }
}

/**
 * Resolve the default pools.config.json by walking up from this module's dir.
 * Works whether running from cli/dist/index.js, cli/dist/lib/pools.js, or an
 * installed node_modules/@fayz-ai/cli/dist — the first pools.config.json found
 * going up wins (cli/ before repo root).
 */
export function defaultPoolsFilePath(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (;;) {
    const candidate = join(dir, 'pools.config.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return resolve('pools.config.json')
}

/** Load + validate a pools.config.json from disk. */
export function loadPoolsFile(path?: string): PoolsConfig {
  const file = path ?? defaultPoolsFilePath()
  if (!existsSync(file)) {
    throw new PoolsError(
      `pools file not found: ${file}\n` +
        `  Pass --pools-file <path>, or run from a tree that ships cli/pools.config.json.`,
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    throw new PoolsError(`pools file ${file} is not valid JSON: ${(err as Error).message}`)
  }
  return parsePoolsConfig(parsed)
}

// ---------------------------------------------------------------------------
// Selection helpers (pure)
// ---------------------------------------------------------------------------

/** Find a pool by industry slug, cluster name, or project ref (in that order). */
export function findPool(config: PoolsConfig, keyOrName: string): Pool | undefined {
  return config.pools.find(
    (p) => p.industry === keyOrName || p.name === keyOrName || p.ref === keyOrName,
  )
}

/** Like findPool but throws a PoolsError listing valid keys when nothing matches. */
export function requirePool(config: PoolsConfig, keyOrName: string): Pool {
  const pool = findPool(config, keyOrName)
  if (!pool) {
    const keys = config.pools.map((p) => p.industry).join(', ')
    throw new PoolsError(`no pool matches "${keyOrName}". Known industries: ${keys}`)
  }
  return pool
}

/**
 * Pick the canary pool. An explicit key (--canary) wins; otherwise the single
 * pool flagged `canary: true`. Returns undefined if neither is present.
 */
export function selectCanary(config: PoolsConfig, override?: string): Pool | undefined {
  if (override) return requirePool(config, override)
  return config.pools.find((p) => p.flags.canary === true)
}

/** Data-critical gate: a dataCritical pool needs BOTH --yes AND --allow-critical. */
export function poolCriticalGate(
  pool: Pool,
  flags: { yes: boolean; allowCritical: boolean },
): { ok: boolean; error?: string } {
  if (!pool.flags.dataCritical) return { ok: true }
  if (flags.yes && flags.allowCritical) return { ok: true }
  return {
    ok: false,
    error:
      `pool '${pool.name}' is dataCritical — refusing without both --yes and --allow-critical. ` +
      `This pool holds real production data.`,
  }
}

export interface FanOutOrder {
  /** Applied first; may be undefined when no pool is flagged/named as canary. */
  canary?: Pool
  /** Remaining pools, applied after the canary succeeds, in config order. */
  rest: Pool[]
  /** Pools deliberately not applied, with the reason. */
  skipped: { pool: Pool; reason: string }[]
}

export interface PlanFanOutOptions {
  /** 'all' (default) or a specific industry slug. A specific slug is an EXPLICIT name. */
  industry?: string
  /** Explicit canary key (--canary). An explicit name. */
  canary?: string
}

/**
 * Compute the fan-out order from a pools config (pure — no network):
 *   • target set = all pools, or just the named industry.
 *   • canary first (flagged, or --canary override), then the rest in config order.
 *   • PROVISIONING pools are skipped UNLESS explicitly named (the industry slug
 *     filter or the --canary key).
 *   • DECOMMISSIONED pools are always skipped.
 */
export function planFanOut(config: PoolsConfig, options: PlanFanOutOptions = {}): FanOutOrder {
  const industry = options.industry ?? 'all'
  const explicit = new Set<string>()

  let candidates: Pool[]
  if (industry !== 'all') {
    const pool = requirePool(config, industry)
    explicit.add(pool.ref)
    candidates = [pool]
  } else {
    candidates = [...config.pools]
  }

  const canary = selectCanary(config, options.canary)
  if (canary) explicit.add(canary.ref)
  // The named canary must be inside the candidate set; if a specific industry was
  // chosen that excludes the flagged canary, drop it (rest-only wave).
  const canaryInScope = canary && candidates.some((p) => p.ref === canary.ref) ? canary : undefined

  const skipped: { pool: Pool; reason: string }[] = []
  const rest: Pool[] = []
  for (const pool of candidates) {
    if (canaryInScope && pool.ref === canaryInScope.ref) continue
    if (pool.status === 'DECOMMISSIONED') {
      skipped.push({ pool, reason: 'DECOMMISSIONED' })
      continue
    }
    if (pool.status === 'PROVISIONING' && !explicit.has(pool.ref)) {
      skipped.push({ pool, reason: 'PROVISIONING (not named explicitly)' })
      continue
    }
    rest.push(pool)
  }

  const order: FanOutOrder = { rest, skipped }
  if (canaryInScope) order.canary = canaryInScope
  return order
}

export type FanOutPoolStatus = 'applied' | 'skipped' | 'failed'

export interface FanOutPoolResult {
  pool: Pool
  status: FanOutPoolStatus
  detail?: string
  filesApplied?: number
  filesSkipped?: number
}

export interface FanOutRunResult {
  ok: boolean
  results: FanOutPoolResult[]
}

/** The per-pool apply, injected so the orchestrator is testable without network. */
export type ApplyToPool = (pool: Pool) => Promise<{ filesApplied: number; filesSkipped: number }>

/**
 * Run a fan-out order fail-fast: canary first; on any failure STOP and leave the
 * remaining pools un-attempted. Skipped pools are recorded as such. Returns a
 * per-pool summary (order preserved: canary, then rest, then skipped).
 */
export async function runFanOut(
  order: FanOutOrder,
  apply: ApplyToPool,
): Promise<FanOutRunResult> {
  const results: FanOutPoolResult[] = []
  const sequence: Pool[] = [...(order.canary ? [order.canary] : []), ...order.rest]

  let failed = false
  for (const pool of sequence) {
    if (failed) {
      results.push({ pool, status: 'skipped', detail: 'halted after earlier failure' })
      continue
    }
    try {
      const r = await apply(pool)
      results.push({ pool, status: 'applied', filesApplied: r.filesApplied, filesSkipped: r.filesSkipped })
    } catch (err) {
      failed = true
      results.push({ pool, status: 'failed', detail: (err as Error).message })
    }
  }

  for (const s of order.skipped) {
    results.push({ pool: s.pool, status: 'skipped', detail: s.reason })
  }

  return { ok: !failed, results }
}

// ---------------------------------------------------------------------------
// Source B — Postgres registry (interface + stub; no `pg` dependency yet)
// ---------------------------------------------------------------------------

/** The registry contract both sources satisfy. Source A is the file; Source B is Postgres. */
export interface PoolRegistry {
  list(): Promise<Pool[]>
  get(keyOrName: string): Promise<Pool | undefined>
}

/** Source A as a PoolRegistry — backed by an already-loaded config. */
export function createFilePoolRegistry(config: PoolsConfig): PoolRegistry {
  return {
    async list() {
      return config.pools
    },
    async get(keyOrName) {
      return findPool(config, keyOrName)
    },
  }
}

/**
 * Source B seam: the platform Prisma Postgres registry (models Industry /
 * IndustryPool / TenantPoolRoute), reached via FAYZ_REGISTRY_URL or DATABASE_URL.
 *
 * NOT YET WIRED. Implementing it means adding a Postgres client (`pg`) — which we
 * are deliberately NOT doing yet to keep the CLI dependency-free. The stub throws
 * so callers fall back to `--pools-file`. When provisioned, replace the throwing
 * body with a `pg` query over IndustryPool joined to Industry.
 */
export function createPostgresPoolRegistry(connectionUrl?: string): PoolRegistry {
  const url = connectionUrl ?? process.env.FAYZ_REGISTRY_URL ?? process.env.DATABASE_URL
  const fail = (): never => {
    throw new PoolsError(
      'registry not yet provisioned; use --pools-file' +
        (url ? ` (FAYZ_REGISTRY_URL/DATABASE_URL is set but the Postgres registry client is not wired)` : ''),
    )
  }
  return {
    async list() {
      return fail()
    },
    async get() {
      return fail()
    },
  }
}
