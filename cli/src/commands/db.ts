import { relative } from 'node:path'
import { buildMigrationPlan, MigrationPlanError, type MigrationPlan } from '../lib/migration-plan.js'

// `fayz db apply [dir] --dry-run` — provision an app's Supabase database from its
// INSTALLED @fayz-ai/* packages. This milestone (A3a) ships the pure planning
// layer + the dry-run path only; the Management-API executor lands in A3b and
// plugs in where noted below. Dry-run performs zero network / no execution.

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
      console.log(`        ${displayPath(plan.appDir, f)}`)
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
  spineOnly: boolean
  pluginsOnly: boolean
  onlyPlugins?: string[]
  dir?: string
}

function parseFlags(args: string[]): DbApplyFlags {
  const flags: DbApplyFlags = { dryRun: false, spineOnly: false, pluginsOnly: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') flags.dryRun = true
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

export function db(sub: string | undefined, args: string[]): number {
  if (sub !== 'apply') {
    console.error(`✗ Unknown 'fayz db' subcommand "${sub ?? ''}". Try: fayz db apply [dir] --dry-run`)
    return 1
  }

  const flags = parseFlags(args)
  const dir = flags.dir ?? process.cwd()

  if (flags.spineOnly && flags.pluginsOnly) {
    console.error('✗ --spine-only and --plugins-only are mutually exclusive.')
    return 1
  }

  // A3a ships planning only. Execution (Management API) lands in A3b.
  if (!flags.dryRun) {
    console.error('execution lands in the next CLI release; use --dry-run')
    return 1
  }

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
