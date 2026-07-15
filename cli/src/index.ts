import { create } from './commands/create.js'
import { createPlugin } from './commands/create-plugin.js'
import { db } from './commands/db.js'
import { doctor } from './commands/doctor.js'
import { extract } from './commands/extract.js'

const HELP = `fayz — Fayz SDK CLI

Usage:
  fayz create <storefront|admin|member> <name>   Scaffold a new repo-per-app project
  fayz create plugin <name>               Scaffold an app-local (incubator) plugin
  fayz doctor [dir] [--remote] [--full]   Validate deps, hygiene, manifest + architecture boundaries
  fayz extract [dir]                      Assisted code-config → manifest migration
  fayz db apply [dir] --dry-run           Plan the Supabase migration order (spine → drizzle → seed → plugins)
  fayz db apply [dir] [--yes]             Apply the plan via the Supabase Management API (prompts unless --yes)
  fayz db pool status                     Show each industry pool's migration ledger (Runner v2)
  fayz db pool apply <name> --app <dir>   Ledger-gated apply of an app's plan to one industry pool
  fayz db pool move-tenant --from <p> --to <p> --tenant <uuid> [--yes]  Move one tenant between pools (dry-run unless --yes)
  fayz db fan-out --app <dir>             Apply an app's plan across pools: canary first, then the rest
  fayz --help                             Show this help
  fayz --version                          Show version

fayz doctor flags:
  --remote           Opt into a network pass: check each @fayz-ai/* semver range
                     against the npm registry (default is offline). Unsatisfiable
                     range → error.
  --full             After the static checks pass with zero errors, run the app's
                     build (and test, if present); a failure is an error carrying
                     the last ~20 lines of output.
  Categories: deps (no file:/link:/workspace:/portal:/.tgz specs), hygiene
  (no tracked .env* secrets, env vars documented in .env.example, single lockfile),
  manifest structure, plugin references, locale coverage, architecture boundaries.
  Errors block (exit 1); warnings are visibility-only. Ends with "N error(s), M warning(s)".

fayz db apply flags:
  --dry-run          Print the ordered plan only; performs no network calls
  --yes, -y          Skip the confirmation prompt (required in non-interactive shells)
  --spine-only       Apply only the @fayz-ai/db spine
  --plugins-only     Apply only plugin + incubator migrations
  --only-plugins a,b Restrict the plugin step to the named plugin ids

fayz db pool / fan-out (industry pools — Runner v2):
  Applies are ALWAYS ledger-gated: an unchanged file is skipped; an already-applied
  file whose checksum changed is a HARD STOP (never edit an applied migration —
  author a new file). Pool refs come from cli/pools.config.json (--pools-file to
  override); the access token comes from SUPABASE_PAT / SUPABASE_ACCESS_TOKEN.
  --pools-file f     Use an alternate pools registry file
  --app <dir>        App whose installed packages determine the plugin set
  --industry all|<s> fan-out scope (default: all pools)
  --canary <pool>    Override the canary (default: the pool flagged canary:true)
  --allow-critical   Required (with --yes) to touch a dataCritical pool
  --from/--to/--tenant  move-tenant: source pool, target pool, tenant uuid
  PROVISIONING pools are skipped in fan-out unless named explicitly.
  move-tenant is dry-run by default; --yes backs up (JSON, before any write),
  inserts parents-first, verifies counts (HARD STOP leaves source untouched),
  then deletes children-first. Target must not be PROVISIONING.

fayz db apply env (required for a real apply; never for --dry-run):
  SUPABASE_PROJECT_REF   Project ref (alias: SUPABASE_REF) — dashboard → Project Settings → General
  SUPABASE_PAT           Access token (alias: SUPABASE_ACCESS_TOKEN) — dashboard → Account → Access Tokens
  Read from process env, then <app>/.env.local, then <app>/.env (files never override process env).
  (pool/fan-out need only the token; each pool's ref comes from the pools file.)

Docs: fayz-sdk/docs/architecture-boundaries.md
`

const VERSION = '0.3.0'

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv
  switch (cmd) {
    case 'create':
      if (rest[0] === 'plugin') return createPlugin(rest[1] ?? '')
      return create(rest[0] ?? '', rest[1] ?? '')
    case 'db':
      return db(rest[0], rest.slice(1))
    case 'doctor':
      return doctor(rest)
    case 'extract':
      return extract(rest[0])
    case '--version':
    case '-v':
      console.log(VERSION)
      return 0
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP)
      return 0
    default:
      console.error(`Unknown command "${cmd}".\n`)
      console.log(HELP)
      return 1
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(err)
    process.exit(1)
  },
)
