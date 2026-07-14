import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isSupportedPackage } from '../../../packages/sdk/src/supported-surface'

// Boundary diagnostics for `fayz doctor`. These are ALWAYS warnings — the
// architecture boundaries are enforced by visibility, not build-failures
// (see docs/ARCHITECTURE.md (boundary model)). Nothing here returns an error.

export interface BoundaryFinding {
  rule: string
  detail: string
}

/** Provider SDKs a generated app must not import directly (talk to Fayz, not the
 *  provider — docs/ARCHITECTURE.md (boundary model)). Server-side adapters live in
 *  supabase/functions, which this scan does not touch. */
const PROVIDER_SDKS = [
  '@supabase/supabase-js',
  'mercadopago',
  'mercado-pago',
  'stripe',
  '@stripe/stripe-js',
  'googleapis',
  'google-auth-library',
  'bling',
  'plugbank',
  'tecnospeed',
]

/** Opt-out marker for a sanctioned exception on the import's line. */
const ALLOW_MARKER = 'fayz-allow'

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.next', 'build', 'coverage'])

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

const IMPORT_RE = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g

function importsOf(content: string): { spec: string; line: string }[] {
  const lines = content.split('\n')
  const found: { spec: string; line: string }[] = []
  for (const line of lines) {
    IMPORT_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = IMPORT_RE.exec(line))) {
      const spec = m[1] ?? m[2]
      if (spec) found.push({ spec, line })
    }
  }
  return found
}

/** Package name of a bare specifier (handles @scope/name/subpath). */
function packageName(spec: string): string | null {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/')) return null
  const parts = spec.split('/')
  return spec.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

/** Warn on direct provider-SDK imports and off-surface @fayz-ai imports in app source. */
export function scanSourceImports(dir: string): BoundaryFinding[] {
  const findings: BoundaryFinding[] = []
  const srcRoot = existsSync(join(dir, 'src')) ? join(dir, 'src') : dir
  for (const file of listSourceFiles(srcRoot)) {
    let content: string
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const rel = file.slice(dir.length + 1)
    for (const { spec, line } of importsOf(content)) {
      if (line.includes(ALLOW_MARKER)) continue
      const pkg = packageName(spec)
      if (!pkg) continue
      if (PROVIDER_SDKS.includes(pkg)) {
        findings.push({
          rule: 'provider-import',
          detail: `${rel} imports provider SDK "${spec}" directly — go through a Fayz boundary (getSupabaseClientOptional / a connector). Add "// ${ALLOW_MARKER}: <reason>" for a sanctioned adapter.`,
        })
      } else if (pkg.startsWith('@fayz-ai/') && !isSupportedPackage(pkg)) {
        findings.push({
          rule: 'off-surface-import',
          detail: `${rel} imports "${spec}" which is not part of the supported public surface (see @fayz-ai/sdk/supported-surface).`,
        })
      }
    }
  }
  return findings
}

/** Warn on package.json dependencies outside the supported public surface. */
export function scanDependencySurface(dir: string): BoundaryFinding[] {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath)) return []
  let pkg: { dependencies?: Record<string, string> }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return []
  }
  const findings: BoundaryFinding[] = []
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    if (name.startsWith('@fayz-ai/') && !isSupportedPackage(name)) {
      findings.push({
        rule: 'off-surface-dependency',
        detail: `dependency "${name}" is not part of the supported public surface — it may be internal/unpublished.`,
      })
    }
  }
  return findings
}

/** All boundary findings for an app directory (always warnings). */
export function scanBoundaries(dir: string): BoundaryFinding[] {
  return [...scanDependencySurface(dir), ...scanSourceImports(dir)]
}
