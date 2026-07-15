import { createInterface } from 'node:readline'
import { relative } from 'node:path'
import { buildMigrationPlan, MigrationPlanError, type MigrationPlan } from '../lib/migration-plan.js'
import {
  confirmationGate,
  createManagementClient,
  executeMigrationPlan,
  MigrationExecutionError,
  missingEnvMessage,
  resolveSupabaseEnv,
} from '../lib/supabase-management.js'
import { fanOut, pool } from './pool.js'

// `fayz db apply [dir]` — provision an app's Supabase database from its INSTALLED
// @fayz-ai/* packages. A3a shipped the pure planner + `--dry-run` (zero network).
// A3b (this milestone) adds the Management-API executor: `fayz db apply` reads
// the same MigrationPlan and applies it via the Supabase Management API. The only
// network surface is the injectable fetch inside the executor; credentials come
// from env vars (never defaulted) that unit tests never set.

const SOURCE_LABEL: Record<MigrationPlan['steps'][number]['source'], string> = {
  spine: 'spine    ',
  drizzle: 'drizzle  ',
  seed: 'seed     ',
  plugin: 'plugin   ',
  incubator: 'incubator',
}

/** Render a file path relative to the app dir; fall back to absolute. */
function displayPath(appDir: string, file: string): string {
  const rel = relative(appDir, file)
  // Files resolved from node_modules packages stay outside appDir → show the
  // node_modules-relative tail rather than a wall of ../../.
  if (rel.startsWith('..')) {
    const nm = file.lastIndexOf('/node_modules/')
    return nm >= 0 ? file.slice(nm + 1) : file
  }
  return rel
}

function printPlan(plan: MigrationPlan): void {
  console.log(`▸ Migration plan for ${plan.appDir}\n`)
  if (plan.steps.length === 0) {
    console.log('  (no migration steps resolved)')
  }
  for (const step of plan.steps) {
    const label = SOURCE_LABEL[step.source]
    if (step.files.length === 0) {
      console.log(`  ${String(step.order).padStart(2)}. [${label}] ${step.id}  — no files`)
      continue
    }
    console.log(`  ${String(step.order).padStart(2)}. [${label}] ${step.id}  (${step.files.length} file(s))`)
    for (const f of step.files) {
      console.log(`        ${displayPath(plan.appDir, f.path)}`)
    }
  }
  if (plan.notes.length > 0) {
    console.log('\n  Notes:')
    for (const n of plan.notes) console.log(`    ⚠ ${n}`)
  }
  console.log(
    `\n  Summary: ${plan.steps.length} step(s), ${plan.totalFiles} sql file(s). ` +
      `(dry-run — nothing was applied)`,
  )
}

interface DbApplyFlags {
  dryRun: boolean
  yes: boolean
  spineOnly: boolean
  pluginsOnly: boolean
  onlyPlugins?: string[]
  dir?: string
}

function parseFlags(args: string[]): DbApplyFlags {
  const flags: DbApplyFlags = { dryRun: false, yes: false, spineOnly: false, pluginsOnly: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') flags.dryRun = true
    else if (a === '--yes' || a === '-y') flags.yes = true
    else if (a === '--spine-only') flags.spineOnly = true
    else if (a === '--plugins-only') flags.pluginsOnly = true
    else if (a === '--only-plugins') {
      const val = args[++i] ?? ''
      flags.onlyPlugins = val.split(',').map((s) => s.trim()).filter(Boolean)
    } else if (a.startsWith('--only-plugins=')) {
      flags.onlyPlugins = a.slice('--only-plugins='.length).split(',').map((s) => s.trim()).filter(Boolean)
    } else if (!a.startsWith('-')) {
      flags.dir = a
    }
  }
  return flags
}

/** Interactive 'y' confirmation via readline. Only reached on a TTY. */
async function promptConfirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await new Promise<string>((res) => rl.question(question, res))
    return answer.trim().toLowerCase() === 'y'
  } finally {
    rl.close()
  }
}

export async function db(sub: string | undefined, args: string[]): Promise<number> {
  // Runner v2 pool orchestration lives in commands/pool.ts.
  if (sub === 'pool') return pool(args[0], args.slice(1))
  if (sub === 'fan-out') return fanOut(args)

  if (sub !== 'apply') {
    console.error(
      `✗ Unknown 'fayz db' subcommand "${sub ?? ''}". Try: apply [dir] --dry-run | pool status | fan-out --app <dir>`,
    )
    return 1
  }

  const flags = parseFlags(args)
  const dir = flags.dir ?? process.cwd()

  if (flags.spineOnly && flags.pluginsOnly) {
    console.error('✗ --spine-only and --plugins-only are mutually exclusive.')
    return 1
  }

  // --- Dry-run: pure planning, zero network (unchanged from A3a). ---
  if (flags.dryRun) {
    let plan: MigrationPlan
    try {
      plan = buildMigrationPlan(dir, {
        spineOnly: flags.spineOnly,
        pluginsOnly: flags.pluginsOnly,
        onlyPlugins: flags.onlyPlugins,
      })
    } catch (err) {
      if (err instanceof MigrationPlanError) {
        console.error(`✗ ${err.message}`)
        return 1
      }
      throw err
    }
    printPlan(plan)
    return 0
  }

  // --- Real apply: env contract → plan → confirm → execute. ---

  // ① Resolve credentials (process env → .env.local → .env; never defaulted).
  const env = resolveSupabaseEnv({ appDir: dir })
  if (env.missing.length > 0 || !env.projectRef || !env.accessToken) {
    console.error(`✗ ${missingEnvMessage(env.missing)}`)
    return 1
  }

  // ② Build the same plan the dry-run would.
  let plan: MigrationPlan
  try {
    plan = buildMigrationPlan(dir, {
      spineOnly: flags.spineOnly,
      pluginsOnly: flags.pluginsOnly,
      onlyPlugins: flags.onlyPlugins,
    })
  } catch (err) {
    if (err instanceof MigrationPlanError) {
      console.error(`✗ ${err.message}`)
      return 1
    }
    throw err
  }

  if (plan.totalFiles === 0) {
    console.log('▸ Nothing to apply — the plan resolved 0 SQL files.')
    if (plan.notes.length > 0) for (const n of plan.notes) console.log(`    ⚠ ${n}`)
    return 0
  }

  // ③ Confirm the target before touching the database.
  console.log(`▸ About to apply migrations to Supabase project '${env.projectRef}'`)
  console.log(`  ${plan.steps.length} step(s), ${plan.totalFiles} SQL file(s), then reload the PostgREST schema cache.`)
  if (plan.notes.length > 0) for (const n of plan.notes) console.log(`    ⚠ ${n}`)

  const gate = confirmationGate({ yes: flags.yes, isTTY: Boolean(process.stdin.isTTY) })
  if (gate.error) {
    console.error(`✗ ${gate.error}`)
    return 1
  }
  if (gate.needsPrompt) {
    const ok = await promptConfirm(`  Type 'y' to apply to '${env.projectRef}': `)
    if (!ok) {
      console.log('Aborted — nothing was applied.')
      return 1
    }
  }

  // ④ Execute. The client's fetch is the ONLY network surface.
  const client = createManagementClient({
    projectRef: env.projectRef,
    accessToken: env.accessToken,
  })
  try {
    await executeMigrationPlan(plan, client, { log: (m) => console.log(m) })
  } catch (err) {
    if (err instanceof MigrationExecutionError) {
      console.error(`✗ ${err.message}`)
      return 1
    }
    console.error(`✗ ${(err as Error).message}`)
    return 1
  }
  return 0
}
