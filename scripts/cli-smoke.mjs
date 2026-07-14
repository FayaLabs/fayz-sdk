#!/usr/bin/env node
// Smoke test the CLI: create a storefront app in a temp dir, doctor it, then
// exercise `fayz db apply` end-to-end short of any real network call.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const CLI = join(ROOT, 'cli/dist/index.js')
const dir = mkdtempSync(join(tmpdir(), 'fayz-cli-'))

// Run the CLI capturing status/stdout/stderr. Never throws on non-zero exit —
// these db-apply cases assert on the exit code themselves. `stdin: 'ignore'`
// keeps every run non-interactive (process.stdin.isTTY is falsy), which is what
// the confirmation gate keys off of.
function runCli(args, { env = {} } = {}) {
  const r = spawnSync('node', [CLI, ...args], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    // Strip any ambient Supabase creds so the env cases are deterministic,
    // then layer on whatever the case wants.
    env: cleanEnv(env),
  })
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

// process.env minus SUPABASE_* (so a developer's shell can't leak real creds
// into the "env unset" case), plus the per-case overrides.
function cleanEnv(overrides) {
  const out = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('SUPABASE_')) continue
    out[k] = v
  }
  return { ...out, ...overrides }
}

try {
  execFileSync('node', [CLI, 'create', 'storefront', 'smoke-shop'], { cwd: dir, stdio: 'inherit' })
  execFileSync('node', [CLI, 'doctor', 'smoke-shop'], { cwd: dir, stdio: 'inherit' })

  // --- fayz db apply -------------------------------------------------------
  // The scaffolded app has no node_modules, so link the local @fayz-ai/db into
  // it (same pattern as the A3a verification) — that gives the planner a real
  // spine to resolve without an `npm install` or any network.
  const app = join(dir, 'smoke-shop')
  mkdirSync(join(app, 'node_modules', '@fayz-ai'), { recursive: true })
  symlinkSync(join(ROOT, 'packages', 'db'), join(app, 'node_modules', '@fayz-ai', 'db'), 'dir')

  // ① --dry-run: exit 0, prints the ordered plan + dry-run summary. No env, no network.
  {
    const r = runCli(['db', 'apply', 'smoke-shop', '--dry-run'])
    assert.equal(r.status, 0, `db apply --dry-run should exit 0\n${r.stdout}\n${r.stderr}`)
    const out = r.stdout + r.stderr
    assert.match(out, /Migration plan for/, 'dry-run should print the plan header')
    assert.match(out, /\[spine\s*\]\s+@fayz-ai\/db/, 'dry-run should list the spine step')
    assert.match(out, /\(dry-run — nothing was applied\)/, 'dry-run should print the dry-run summary')
    console.log('✓ db apply --dry-run: plan printed, exit 0, no network')
  }

  // ② env unset: exit 1, names BOTH required vars (guides the developer).
  {
    const r = runCli(['db', 'apply', 'smoke-shop'])
    assert.equal(r.status, 1, `db apply with no creds should exit 1\n${r.stdout}\n${r.stderr}`)
    const out = r.stdout + r.stderr
    assert.match(out, /SUPABASE_PROJECT_REF/, 'missing-env error should name SUPABASE_PROJECT_REF')
    assert.match(out, /SUPABASE_PAT/, 'missing-env error should name SUPABASE_PAT')
    console.log('✓ db apply (env unset): exit 1, names both required vars')
  }

  // ③ creds present but non-interactive + no --yes: refuse promptly (never hang,
  //    never reach the network) and suggest --yes.
  {
    const r = runCli(['db', 'apply', 'smoke-shop'], {
      env: { SUPABASE_PROJECT_REF: 'fake', SUPABASE_PAT: 'sbp_fake' },
    })
    assert.equal(r.status, 1, `db apply non-interactive w/o --yes should exit 1\n${r.stdout}\n${r.stderr}`)
    const out = r.stdout + r.stderr
    assert.match(out, /--yes/, 'non-interactive refusal should suggest --yes')
    // Must have stopped at the confirmation gate — before any apply happened.
    assert.doesNotMatch(out, /schema reloaded|pipeline complete/, 'must not reach execution')
    console.log('✓ db apply (creds set, non-interactive, no --yes): refused with --yes hint, no network')
  }

  console.log('\n✓ CLI smoke passed')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
