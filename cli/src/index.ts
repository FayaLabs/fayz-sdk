import { create } from './commands/create.js'
import { createPlugin } from './commands/create-plugin.js'
import { db } from './commands/db.js'
import { doctor } from './commands/doctor.js'
import { extract } from './commands/extract.js'

const HELP = `fayz — Fayz SDK CLI

Usage:
  fayz create <storefront|admin|member> <name>   Scaffold a new repo-per-app project
  fayz create plugin <name>               Scaffold an app-local (incubator) plugin
  fayz doctor [dir]                       Validate manifest + architecture boundaries
  fayz extract [dir]                      Assisted code-config → manifest migration
  fayz db apply [dir] --dry-run           Plan the Supabase migration order (spine → drizzle → seed → plugins)
  fayz db apply [dir] [--yes]             Apply the plan via the Supabase Management API (prompts unless --yes)
  fayz --help                             Show this help
  fayz --version                          Show version

fayz db apply flags:
  --dry-run          Print the ordered plan only; performs no network calls
  --yes, -y          Skip the confirmation prompt (required in non-interactive shells)
  --spine-only       Apply only the @fayz-ai/db spine
  --plugins-only     Apply only plugin + incubator migrations
  --only-plugins a,b Restrict the plugin step to the named plugin ids

fayz db apply env (required for a real apply; never for --dry-run):
  SUPABASE_PROJECT_REF   Project ref (alias: SUPABASE_REF) — dashboard → Project Settings → General
  SUPABASE_PAT           Access token (alias: SUPABASE_ACCESS_TOKEN) — dashboard → Account → Access Tokens
  Read from process env, then <app>/.env.local, then <app>/.env (files never override process env).

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
      return doctor(rest[0])
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
