import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadManifest, validateManifestStructure, referencedPluginIds } from '../lib/manifest.js'
import { scanBoundaries } from '../lib/boundaries.js'
import { checkDeps, checkHygiene, checkFull, type CheckFinding } from '../lib/app-checks.js'

// `fayz doctor` — validate the app in the current directory: dependency specs
// (deps), repo hygiene (hygiene), manifest structure, platform-bundled plugin
// references, locale completeness, and architecture boundaries (provider-access
// + supported-surface). Semantics match the Dev Center "Testar e debugar" page:
// errors block (exit 1); warnings are visibility-only (soft enforcement —
// docs/ARCHITECTURE.md (boundary model)); the run ends with `N error(s), M warning(s)`.
//
// deps stays offline by default; `--remote` opts into a network pass that checks
// each `@fayz-ai/*` range against the registry. `--full` runs the app build (and
// test) after the static checks pass with zero errors.

interface DoctorOptions {
  remote?: boolean
  full?: boolean
}

function parseArgs(argv: string[]): { dir: string; opts: DoctorOptions } {
  const opts: DoctorOptions = {}
  let dir: string | undefined
  for (const arg of argv) {
    if (arg === '--remote') opts.remote = true
    else if (arg === '--full') opts.full = true
    else if (!arg.startsWith('-') && dir === undefined) dir = arg
  }
  return { dir: dir ?? process.cwd(), opts }
}

function printFinding(f: CheckFinding): void {
  if (f.level === 'error') console.error(`✗ ${f.rule}: ${f.detail}`)
  else console.warn(`⚠ ${f.rule}: ${f.detail}`)
}

export function doctor(argv: string[] = []): number {
  const { dir, opts } = parseArgs(argv)

  // A directory without a package.json is not a Fayz app — hard stop before any
  // check runs (preserves the original doctor behaviour).
  if (!existsSync(join(dir, 'package.json'))) {
    console.error('✗ No package.json found in', dir, '— not a Fayz app directory')
    return 1
  }

  let errors = 0
  let warnings = 0
  const tally = (finding: CheckFinding) => {
    printFinding(finding)
    if (finding.level === 'error') errors++
    else warnings++
  }

  // deps + hygiene run regardless of app shape (manifest or code-config).
  for (const f of checkDeps(dir, { remote: opts.remote })) tally(f)
  for (const f of checkHygiene(dir)) tally(f)

  // Boundary checks run even without a manifest (code-config apps still have src/).
  const boundaryFindings = scanBoundaries(dir)
  for (const f of boundaryFindings) {
    console.warn(`⚠ ${f.rule}: ${f.detail}`)
    warnings++
  }

  const loaded = loadManifest(dir)
  if (loaded) {
    const { manifest } = loaded

    for (const p of validateManifestStructure(manifest)) {
      console.error(`✗ manifest: ${p}`)
      errors++
    }

    const pluginIds = referencedPluginIds(manifest)
    if (pluginIds.length > 0) {
      console.warn(
        `⚠ manifest references plugin(s) [${pluginIds.join(', ')}] — each id must resolve to an installed @fayz-ai/plugin-* factory wired in src/plugins.generated.ts or src/config/app.tsx`,
      )
      warnings++
    }

    // Locale coverage: every supported locale should have a translations block if any do.
    const locale = manifest.locale
    if (locale?.supported && locale.supported.length > 1) {
      const translations = (manifest as { locale?: { translations?: Record<string, unknown> } }).locale?.translations
      if (translations) {
        for (const loc of locale.supported) {
          if (!translations[loc]) {
            console.warn(`⚠ locale "${loc}" is declared as supported but has no translations`)
            warnings++
          }
        }
      }
    }
  }

  // --full: only after the static checks pass cleanly (zero errors). A build/test
  // failure is an error and flips the exit code.
  if (opts.full) {
    if (errors > 0) {
      console.warn('⚠ full: skipping build/test — resolve the errors above first')
      warnings++
    } else {
      console.log('… running build/test (--full)')
      for (const f of checkFull(dir)) tally(f)
    }
  }

  if (errors === 0 && warnings === 0) {
    if (loaded) {
      console.log(
        `✓ ${loaded.manifest.name} — manifest valid, ${Object.keys(loaded.manifest.surfaces ?? {}).length} surface(s), no issues`,
      )
    } else {
      console.log('✓ code-config app — no manifest, no issues')
    }
  } else {
    console.log(`\n${errors} error(s), ${warnings} warning(s)`)
  }
  return errors > 0 ? 1 : 0
}
