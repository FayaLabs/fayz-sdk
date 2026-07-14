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
  fayz --help                             Show this help
  fayz --version                          Show version

Docs: fayz-sdk/docs/architecture-boundaries.md
`

const VERSION = '0.1.0'

function main(argv: string[]): number {
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

process.exit(main(process.argv.slice(2)))
