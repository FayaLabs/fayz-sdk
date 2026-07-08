import { create, type CreateOptions } from './commands/create.js'
import { createPlugin } from './commands/create-plugin.js'
import { doctor } from './commands/doctor.js'
import { extract } from './commands/extract.js'
import type { FayzPackageChannel } from './lib/package-versions.js'

const HELP = `fayz — Fayz SDK CLI

Usage:
  fayz create <storefront|admin|member> <name>   Scaffold a real repo-per-app project
      --dir <path>       Parent directory to create the app in (default: cwd)
      --install          Run npm install after scaffolding
      --channel <c>      @fayz-ai version channel: stable | latest | preview
  fayz create plugin <name>               Scaffold an app-local (incubator) plugin
  fayz doctor [dir]                       Validate manifest + architecture boundaries
  fayz extract [dir]                      Assisted code-config → manifest migration
  fayz --help                             Show this help
  fayz --version                          Show version

Generated apps boot on mock providers (no env needed) and ship a CLAUDE.md
with the personalization checklist + contract rules.

Docs: fayz-sdk/docs/ARCHITECTURE.md
`

const VERSION = '0.2.0'

const CHANNELS: FayzPackageChannel[] = ['stable', 'latest', 'preview']

interface ParsedArgs {
  positionals: string[]
  flags: Record<string, string | boolean>
}

// Minimal flag extractor (no runtime deps): supports --flag, --flag value and
// --flag=value. Every non-flag token stays a positional.
function parseArgs(argv: string[], valueFlags: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      positionals.push(arg)
      continue
    }
    const eq = arg.indexOf('=')
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1)
      continue
    }
    const flag = arg.slice(2)
    if (valueFlags.includes(flag) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      flags[flag] = argv[++i]
    } else {
      flags[flag] = true
    }
  }
  return { positionals, flags }
}

function main(argv: string[]): number {
  const [cmd, ...rest] = argv
  switch (cmd) {
    case 'create': {
      const { positionals, flags } = parseArgs(rest, ['dir', 'channel'])
      if (positionals[0] === 'plugin') return createPlugin(positionals[1] ?? '')
      const channel = flags['channel']
      if (channel !== undefined && !CHANNELS.includes(channel as FayzPackageChannel)) {
        console.error(`✗ Unknown channel "${channel}". Use: ${CHANNELS.join(' | ')}`)
        return 1
      }
      const options: CreateOptions = {
        dir: typeof flags['dir'] === 'string' ? flags['dir'] : undefined,
        install: flags['install'] === true,
        channel: channel as FayzPackageChannel | undefined,
      }
      return create(positionals[0] ?? '', positionals[1] ?? '', options)
    }
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
