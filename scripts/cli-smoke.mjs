#!/usr/bin/env node
// Smoke test the CLI: create a storefront app in a temp dir, then doctor it.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI = join(process.cwd(), 'cli/dist/index.js')
const dir = mkdtempSync(join(tmpdir(), 'fayz-cli-'))
try {
  execFileSync('node', [CLI, 'create', 'storefront', 'smoke-shop'], { cwd: dir, stdio: 'inherit' })
  execFileSync('node', [CLI, 'doctor', 'smoke-shop'], { cwd: dir, stdio: 'inherit' })
  console.log('\n✓ CLI smoke passed')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
