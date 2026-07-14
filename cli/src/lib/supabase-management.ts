import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { MigrationPlan, MigrationStep } from './migration-plan.js'

// Management-API executor for `fayz db apply` (milestone A3b). Consumes the
// ordered MigrationPlan produced by the pure planner (A3a) and applies each SQL
// file via the Supabase Management API, then reloads the PostgREST schema cache.
//
// Network access is ONLY ever reached through an injectable `fetchImpl`, so unit
// tests exercise the full loop against a mocked fetch and never touch a real
// project. The command path (commands/db.ts) constructs the client from env vars
// that tests never set; the lib itself defaults fetchImpl to globalThis.fetch
// but never invents credentials.

const MANAGEMENT_API_BASE = 'https://api.supabase.com'

/** Injectable fetch — matches the DOM/Node `fetch` shape used here. */
export type FetchImpl = typeof globalThis.fetch

export interface CreateManagementClientOptions {
  projectRef: string
  accessToken: string
  /** Injected so tests can mock the network entirely. Defaults to global fetch. */
  fetchImpl?: FetchImpl
}

export interface ManagementClient {
  readonly projectRef: string
  /** Run a single SQL statement/batch against the project's database. */
  runQuery(sql: string): Promise<unknown>
}

/** Thrown when the Management API responds with a non-2xx status. */
export class ManagementApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message)
    this.name = 'ManagementApiError'
  }
}

/**
 * Build a thin Management-API client. The only network surface is the injected
 * (or global) fetch — nothing else in this module reaches out.
 */
export function createManagementClient(options: CreateManagementClientOptions): ManagementClient {
  const { projectRef, accessToken } = options
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'no fetch implementation available — use Node >= 18, or pass fetchImpl to createManagementClient()',
    )
  }
  const url = `${MANAGEMENT_API_BASE}/v1/projects/${projectRef}/database/query`

  return {
    projectRef,
    async runQuery(sql: string): Promise<unknown> {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new ManagementApiError(
          `Supabase Management API returned ${res.status} ${res.statusText}: ${text.slice(0, 400)}`,
          res.status,
          text,
        )
      }
      // The query endpoint returns JSON rows; tolerate an empty/non-JSON body.
      try {
        return text ? JSON.parse(text) : null
      } catch {
        return text
      }
    },
  }
}

/** Thrown when a specific migration file fails to read or apply. */
export class MigrationExecutionError extends Error {
  constructor(
    readonly step: MigrationStep,
    readonly file: string,
    detail: string,
  ) {
    super(
      `migration failed at step ${step.order} [${step.source}] ${step.id}\n` +
        `  file: ${file}\n` +
        `  ${detail}`,
    )
    this.name = 'MigrationExecutionError'
  }
}

export interface ExecuteMigrationPlanOptions {
  /** Progress sink; defaults to a no-op so the lib stays silent unless asked. */
  log?: (message: string) => void
}

export interface ExecuteMigrationPlanResult {
  stepsApplied: number
  filesApplied: number
}

/**
 * Apply every step of `plan` in order via `client`, then issue the final
 * `NOTIFY pgrst, 'reload schema'` so PostgREST picks up new functions/views.
 *
 * On the first failure the loop stops immediately and throws a
 * MigrationExecutionError naming the offending step/file. Plugin/spine SQL is
 * authored idempotent (CREATE OR REPLACE / IF NOT EXISTS / guarded DO blocks),
 * so the recovery is simply to fix the cause and re-run — already-applied files
 * replay safely. The thrown error says exactly that.
 */
export async function executeMigrationPlan(
  plan: MigrationPlan,
  client: ManagementClient,
  options: ExecuteMigrationPlanOptions = {},
): Promise<ExecuteMigrationPlanResult> {
  const log = options.log ?? (() => {})
  let filesApplied = 0

  for (const step of plan.steps) {
    log(`▸ [${step.source}] ${step.id} (${step.files.length} file(s))`)
    for (const file of step.files) {
      let sql: string
      try {
        sql = readFileSync(file, 'utf8')
      } catch (err) {
        throw new MigrationExecutionError(
          step,
          file,
          `could not read SQL file: ${(err as Error).message}`,
        )
      }
      try {
        await client.runQuery(sql)
      } catch (err) {
        const detail = err instanceof ManagementApiError ? err.message : (err as Error).message
        throw new MigrationExecutionError(
          step,
          file,
          `${detail}\n` +
            `  Migrations are idempotent — fix the cause and re-run 'fayz db apply' to resume; ` +
            `already-applied files replay safely.`,
        )
      }
      filesApplied++
      log(`  ✓ ${file}`)
    }
  }

  // Final: refresh PostgREST's schema cache so new plugin RPCs/views are visible.
  await client.runQuery("NOTIFY pgrst, 'reload schema';")
  log(`✓ migration pipeline complete — ${filesApplied} file(s) applied, PostgREST schema reloaded`)

  return { stepsApplied: plan.steps.length, filesApplied }
}

// ---------------------------------------------------------------------------
// Environment contract
// ---------------------------------------------------------------------------

// Accepted aliases. First non-empty match wins; the first name in each list is
// the canonical/primary one used in error messages.
const PROJECT_REF_KEYS = ['SUPABASE_PROJECT_REF', 'SUPABASE_REF'] as const
const ACCESS_TOKEN_KEYS = ['SUPABASE_PAT', 'SUPABASE_ACCESS_TOKEN'] as const

/**
 * Parse `.env`-style content into a flat map. Dependency-free (no dotenv pkg).
 * Supports `KEY=value`, `export KEY=value`, `#` comments, blank lines, and
 * single/double-quoted values. Later lines override earlier ones.
 */
export function parseDotenv(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    let key = line.slice(0, eq).trim()
    if (key.startsWith('export ')) key = key.slice('export '.length).trim()
    if (!key) continue
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

export interface ResolveSupabaseEnvOptions {
  /** App directory whose .env.local / .env are consulted after process env. */
  appDir: string
  /** Defaults to process.env; injectable for tests. */
  processEnv?: Record<string, string | undefined>
  /** Injectable file reader; returns null when the file does not exist. */
  readFile?: (path: string) => string | null
}

export interface SupabaseEnvResolution {
  projectRef?: string
  accessToken?: string
  /** Human labels for any REQUIRED var that could not be resolved. */
  missing: string[]
}

function firstNonEmpty(source: Record<string, string>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const val = source[key]
    if (val != null && val !== '') return val
  }
  return undefined
}

function defaultReadFile(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

/**
 * Resolve the Supabase project ref + access token from, in precedence order:
 *   ① process env  (highest — files never override an already-set process var)
 *   ② <appDir>/.env.local
 *   ③ <appDir>/.env
 * Neither var is ever defaulted; a missing REQUIRED var is reported in `missing`.
 */
export function resolveSupabaseEnv(options: ResolveSupabaseEnvOptions): SupabaseEnvResolution {
  const processEnv = options.processEnv ?? process.env
  const readFile = options.readFile ?? defaultReadFile

  // Build from lowest precedence up: .env, then .env.local, then process env last
  // so that process env wins and files never clobber it.
  const merged: Record<string, string> = {}
  for (const name of ['.env', '.env.local']) {
    const content = readFile(join(options.appDir, name))
    if (content) Object.assign(merged, parseDotenv(content))
  }
  for (const [k, v] of Object.entries(processEnv)) {
    if (v != null && v !== '') merged[k] = v
  }

  const projectRef = firstNonEmpty(merged, PROJECT_REF_KEYS)
  const accessToken = firstNonEmpty(merged, ACCESS_TOKEN_KEYS)

  const missing: string[] = []
  if (!projectRef) missing.push('SUPABASE_PROJECT_REF (or SUPABASE_REF)')
  if (!accessToken) missing.push('SUPABASE_PAT (or SUPABASE_ACCESS_TOKEN)')

  const result: SupabaseEnvResolution = { missing }
  if (projectRef) result.projectRef = projectRef
  if (accessToken) result.accessToken = accessToken
  return result
}

/** Actionable message for a missing-env failure. Names both vars + where to get them. */
export function missingEnvMessage(missing: string[]): string {
  return (
    `Missing required Supabase credentials: ${missing.join(', ')}.\n` +
    `  Set them in your shell, or in <app>/.env.local (git-ignored), e.g.:\n` +
    `    SUPABASE_PROJECT_REF=your-project-ref\n` +
    `    SUPABASE_PAT=sbp_...\n` +
    `  • Access token (PAT): Supabase dashboard → Account → Access Tokens → Generate new token.\n` +
    `  • Project ref: Supabase dashboard → Project Settings → General (also the subdomain in the project URL).`
  )
}

// ---------------------------------------------------------------------------
// Confirmation gate
// ---------------------------------------------------------------------------

export interface ConfirmationGate {
  /** True → caller should interactively prompt for 'y'. */
  needsPrompt: boolean
  /** Set → caller must abort with this message (do NOT prompt). */
  error?: string
}

/**
 * Decide whether to proceed, prompt, or refuse — pure so it is unit-testable.
 * `--yes` proceeds without a prompt. Otherwise an interactive TTY is prompted;
 * a non-interactive shell is refused (never hangs waiting on stdin).
 */
export function confirmationGate(input: { yes: boolean; isTTY: boolean }): ConfirmationGate {
  if (input.yes) return { needsPrompt: false }
  if (!input.isTTY) {
    return {
      needsPrompt: false,
      error:
        'Refusing to apply migrations without confirmation in a non-interactive shell. ' +
        'Re-run with --yes to proceed.',
    }
  }
  return { needsPrompt: true }
}
