#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const json = args.includes('--json')
const appPathArg = args.find((arg, index) => {
  if (arg.startsWith('--')) return false
  const previous = args[index - 1]
  return previous !== '--base' && previous !== '--paths'
})

if (!appPathArg) {
  console.error('Usage: pnpm check:generated-agent-readiness <path-to-generated-app> [--base <git-ref>] [--staged] [--paths <comma-separated-paths>] [--json]')
  process.exit(2)
}

const appRoot = resolve(process.cwd(), appPathArg)
if (!existsSync(appRoot)) {
  console.error(`Generated app path not found: ${appRoot}`)
  process.exit(2)
}

function runGate(name, commandArgs) {
  const run = spawnSync('node', commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return {
    name,
    status: run.status === 0 ? 'pass' : 'fail',
    exitCode: run.status,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
  }
}

const passthroughArgs = args.filter((arg, index) => {
  if (arg === '--json') return false
  if (arg === appPathArg && index === args.indexOf(appPathArg)) return false
  return true
})

const contract = runGate('contract', [
  './scripts/check-generated-app-contract.mjs',
  appRoot,
  '--strict',
])

const scope = runGate('scope', [
  './scripts/check-generated-agent-scope.mjs',
  appRoot,
  ...passthroughArgs,
  '--strict',
  '--json',
])

const failed = contract.status !== 'pass' || scope.status !== 'pass'

if (json) {
  let scopePayload = null
  try {
    scopePayload = scope.stdout ? JSON.parse(scope.stdout) : null
  } catch {
    scopePayload = null
  }

  console.log(JSON.stringify({
    status: failed ? 'fail' : 'pass',
    appPath: appRoot,
    gates: {
      contract: {
        status: contract.status,
        stdout: contract.stdout,
        stderr: contract.stderr,
      },
      scope: {
        status: scope.status,
        payload: scopePayload,
        stdout: scopePayload ? undefined : scope.stdout,
        stderr: scope.stderr,
      },
    },
  }, null, 2))
} else {
  console.log(`Resultado: generated-agent readiness ${failed ? 'failed' : 'passed'} for ${appRoot}.`)
  console.log(`Impacto: ${failed ? 'Agent edits are blocked until contract/scope issues are fixed.' : 'Agent can proceed with constrained app-owned edits.'}`)
  console.log(`Risco: ${failed ? 'Contract or scope gate rejected this app/change set.' : 'No contract or strict scope drift detected.'}`)
  console.log('Proximo: Run the requested app edit only after this gate stays green.')
}

if (failed) {
  console.error('')
  console.error('Generated agent readiness failed:')
  for (const gate of [contract, scope]) {
    if (gate.status === 'pass') continue
    console.error(`\n[${gate.name}]`)
    if (gate.stdout) console.error(gate.stdout)
    if (gate.stderr) console.error(gate.stderr)
  }
  process.exit(1)
}
