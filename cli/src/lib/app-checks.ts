import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

// App-level diagnostics for `fayz doctor` (deps / hygiene / --full). These run in
// the app directory, independent of the manifest, and follow the documented
// doctor semantics (Dev Center "Testar e debugar"): errors block (exit 1),
// warnings are visibility-only (soft enforcement). Findings share the same
// { level, rule, detail } shape the doctor already prints.

export interface CheckFinding {
  level: 'error' | 'warning'
  rule: string
  detail: string
}

interface PackageJsonLike {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function readPackageJson(dir: string): PackageJsonLike | null {
  const path = join(dir, 'package.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageJsonLike
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// deps
// ---------------------------------------------------------------------------

/** Specs that reference something on the build machine and cannot resolve from a
 *  clean remote install (the class of failure that broke today's PRs). */
const LOCAL_SPEC_PREFIXES = ['file:', 'link:', 'workspace:', 'portal:']

function isLocalOrTarballSpec(spec: string): boolean {
  if (LOCAL_SPEC_PREFIXES.some((p) => spec.startsWith(p))) return true
  // A bare path to a packed tarball (e.g. "../foo/bar-1.0.0.tgz" or "./x.tgz").
  if (spec.endsWith('.tgz')) return true
  return false
}

/** A `@fayz-ai/*` dependency whose spec is a plain semver range (not a tag, url,
 *  git, or local spec) — the only shape we can meaningfully resolve remotely. */
function isSemverRange(spec: string): boolean {
  const s = spec.trim()
  if (s === '' || s === '*' || s === 'latest') return false
  if (isLocalOrTarballSpec(s)) return false
  if (/^(https?:|git\+|git:|github:|npm:)/.test(s)) return false
  // Ranges start with a digit or a comparator/tilde/caret.
  return /^[\d~^><=v]/.test(s)
}

export interface NpmViewResult {
  /** true if at least one published version satisfies the range. */
  satisfiable: boolean
  /** set when the lookup itself failed (offline, unknown package, …). */
  error?: string
}

export type NpmView = (name: string, range: string) => NpmViewResult

/** Default remote resolver: `npm view <name>@<range> version --json`. Empty
 *  output means the registry has no version satisfying the range. */
const defaultNpmView: NpmView = (name, range) => {
  try {
    const out = execFileSync('npm', ['view', `${name}@${range}`, 'version', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    // npm prints `""`/`[]`/nothing for an unsatisfiable range on a known package.
    if (out === '' || out === '[]' || out === '""') return { satisfiable: false }
    return { satisfiable: true }
  } catch (e) {
    return { satisfiable: false, error: (e as Error).message }
  }
}

export interface DepsCheckOptions {
  /** Opt-in network pass (default false — doctor stays offline by default). */
  remote?: boolean
  /** Injectable registry resolver (tests mock this; production uses npm). */
  npmView?: NpmView
}

/** deps — flag dependency specs that won't survive a clean remote install, and
 *  (with --remote) `@fayz-ai/*` ranges the registry can't satisfy. */
export function checkDeps(dir: string, opts: DepsCheckOptions = {}): CheckFinding[] {
  const findings: CheckFinding[] = []
  const pkg = readPackageJson(dir)
  if (!pkg) return findings

  const deps: Record<string, string> = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }

  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string') continue
    if (isLocalOrTarballSpec(spec)) {
      findings.push({
        level: 'error',
        rule: 'deps.local',
        detail: `"${name}": "${spec}" — local/tarball dependency will not resolve remotely`,
      })
    }
  }

  if (opts.remote) {
    const view = opts.npmView ?? defaultNpmView
    for (const [name, spec] of Object.entries(deps)) {
      if (!name.startsWith('@fayz-ai/')) continue
      if (!isSemverRange(spec)) continue
      const res = view(name, spec)
      if (res.error) {
        findings.push({
          level: 'warning',
          rule: 'deps.remote',
          detail: `"${name}@${spec}" — could not verify against the registry (${res.error})`,
        })
      } else if (!res.satisfiable) {
        findings.push({
          level: 'error',
          rule: 'deps.remote',
          detail: `"${name}@${spec}" — no published version satisfies this range`,
        })
      }
    }
  }

  return findings
}

// ---------------------------------------------------------------------------
// hygiene
// ---------------------------------------------------------------------------

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.next', 'build', 'coverage'])

/** Runtime/tooling env vars that are never expected in a committed .env.example,
 *  so a src reference to them is not a "missing from example" signal. */
const BUILTIN_ENV = new Set(['NODE_ENV', 'PORT', 'CI', 'PWD', 'HOME', 'PATH', 'BASE_URL', 'MODE', 'DEV', 'PROD', 'SSR'])

function listSourceFiles(root: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    let entries: string[]
    try {
      entries = readdirSync(d)
    } catch {
      return
    }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue
      const full = join(d, name)
      let s
      try {
        s = statSync(full)
      } catch {
        continue
      }
      if (s.isDirectory()) walk(full)
      else if (SOURCE_EXT.has(name.slice(name.lastIndexOf('.')))) out.push(full)
    }
  }
  walk(root)
  return out
}

/** True for a tracked env file that carries injected secrets (everything except
 *  the committed template `.env.example`). */
function isSecretEnvFile(relPath: string): boolean {
  const base = relPath.split('/').pop() ?? relPath
  if (base === '.env.example') return false
  return base === '.env' || base.startsWith('.env.')
}

function parseEnvExampleKeys(dir: string): Set<string> | null {
  const path = join(dir, '.env.example')
  if (!existsSync(path)) return null
  const keys = new Set<string>()
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const withoutExport = line.replace(/^export\s+/, '')
    const eq = withoutExport.indexOf('=')
    const key = (eq === -1 ? withoutExport : withoutExport.slice(0, eq)).trim()
    if (key) keys.add(key)
  }
  return keys
}

/** Collect env var names referenced in app source: `import.meta.env.VITE_*` and
 *  `process.env.*`. */
function referencedEnvVars(dir: string): Set<string> {
  const src = join(dir, 'src')
  const root = existsSync(src) ? src : dir
  const vars = new Set<string>()
  const viteRe = /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g
  const procRe = /process\.env\.([A-Z0-9_]+)/g
  for (const file of listSourceFiles(root)) {
    let content: string
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    let m: RegExpExecArray | null
    viteRe.lastIndex = 0
    while ((m = viteRe.exec(content))) vars.add(m[1])
    procRe.lastIndex = 0
    while ((m = procRe.exec(content))) {
      if (!BUILTIN_ENV.has(m[1])) vars.add(m[1])
    }
  }
  return vars
}

const LOCKFILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']

export interface HygieneCheckOptions {
  /** Injectable `git ls-files` result (tests supply this). Returning null means
   *  "not a git repo" — git-dependent checks are skipped without error. */
  gitLsFiles?: (dir: string) => string[] | null
}

/** Default tracked-file lister: `git ls-files`. Returns null when the directory
 *  is not inside a git work tree. */
const defaultGitLsFiles = (dir: string): string[] | null => {
  try {
    const out = execFileSync('git', ['ls-files'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.split('\n').map((l) => l.trim()).filter(Boolean)
  } catch {
    return null
  }
}

/** hygiene — tracked secrets, undocumented env vars, lockfile drift. */
export function checkHygiene(dir: string, opts: HygieneCheckOptions = {}): CheckFinding[] {
  const findings: CheckFinding[] = []

  // 1. Tracked secret env files (git-dependent — skipped silently outside a repo).
  const lsFiles = (opts.gitLsFiles ?? defaultGitLsFiles)(dir)
  if (lsFiles) {
    for (const f of lsFiles) {
      if (isSecretEnvFile(f)) {
        findings.push({
          level: 'error',
          rule: 'hygiene.env-tracked',
          detail: `"${f}" is tracked in git — secrets are injected by the fayz editor; untrack with git rm --cached "${f}"`,
        })
      }
    }
  }

  // 2. Env vars used in src but absent from .env.example (warning). Only when an
  //    .env.example exists to compare against.
  const exampleKeys = parseEnvExampleKeys(dir)
  if (exampleKeys) {
    for (const v of referencedEnvVars(dir)) {
      if (!exampleKeys.has(v)) {
        findings.push({
          level: 'warning',
          rule: 'hygiene.env-undocumented',
          detail: `"${v}" is used in src but missing from .env.example`,
        })
      }
    }
  }

  // 3. Lockfile drift — more than one package-manager lockfile committed.
  const present = LOCKFILES.filter((f) => existsSync(join(dir, f)))
  if (present.length > 1) {
    findings.push({
      level: 'warning',
      rule: 'hygiene.lockfile-drift',
      detail: `multiple lockfiles present (${present.join(', ')}) — lockfile drift; keep one package manager`,
    })
  }

  return findings
}

// ---------------------------------------------------------------------------
// --full (build + test)
// ---------------------------------------------------------------------------

export interface RunResult {
  code: number
  output: string
}

export type CommandRunner = (cmd: string, args: string[], cwd: string) => RunResult

const defaultRunner: CommandRunner = (cmd, args, cwd) => {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`
  // A spawn failure (ENOENT etc.) has a null status — treat as non-zero.
  return { code: res.status ?? 1, output }
}

function lastLines(text: string, n: number): string {
  const lines = text.replace(/\s+$/, '').split('\n')
  return lines.slice(-n).join('\n')
}

export interface FullCheckOptions {
  /** Injectable command runner (tests mock this; production spawns npm). */
  run?: CommandRunner
}

/** --full — run the app's build (and test, if present). Only meant to run after
 *  the static checks pass with zero errors. A failing build/test is an ERROR
 *  carrying the last ~20 lines of output. */
export function checkFull(dir: string, opts: FullCheckOptions = {}): CheckFinding[] {
  const run = opts.run ?? defaultRunner
  const findings: CheckFinding[] = []
  const pkg = readPackageJson(dir)
  const scripts = pkg?.scripts ?? {}

  if (scripts.build) {
    const res = run('npm', ['run', 'build'], dir)
    if (res.code !== 0) {
      findings.push({
        level: 'error',
        rule: 'full.build',
        detail: `\`npm run build\` failed (exit ${res.code}):\n${lastLines(res.output, 20)}`,
      })
    }
  } else {
    findings.push({
      level: 'warning',
      rule: 'full.build',
      detail: 'no "build" script found in package.json — nothing to build',
    })
  }

  if (scripts.test) {
    const res = run('npm', ['test'], dir)
    if (res.code !== 0) {
      findings.push({
        level: 'error',
        rule: 'full.test',
        detail: `\`npm test\` failed (exit ${res.code}):\n${lastLines(res.output, 20)}`,
      })
    }
  }

  return findings
}
