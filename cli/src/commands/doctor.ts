import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadManifest, validateManifestStructure, referencedPluginIds } from '../lib/manifest.js'
import { scanBoundaries } from '../lib/boundaries.js'

// `fayz doctor` — validate the app in the current directory: manifest structure,
// platform-bundled plugin references, locale completeness, and architecture
// boundaries (provider-access + supported-surface). Boundary issues are WARNINGS
// by design (soft enforcement — docs/ARCHITECTURE.md (boundary model)); only manifest
// structural problems exit non-zero.
export function doctor(dir = process.cwd()): number {
  // Boundary checks run even without a manifest (code-config apps still have a src/).
  const boundaryFindings = scanBoundaries(dir)

  const loaded = loadManifest(dir)
  if (!loaded) {
    // A missing app.manifest.json is NOT an error: code-config apps (defineSaas /
    // defineStorefront in src/) are a supported shape. Report boundaries and pass.
    const hasFayz = existsSync(join(dir, 'package.json'))
    if (!hasFayz) {
      console.error('✗ No package.json found in', dir, '— not a Fayz app directory')
      return 1
    }
    for (const f of boundaryFindings) console.warn(`⚠ ${f.rule}: ${f.detail}`)
    const w = boundaryFindings.length
    console.log(
      w === 0
        ? '✓ code-config app — no manifest, no boundary issues'
        : `\n0 error(s), ${w} warning(s) — code-config app (no app.manifest.json)`,
    )
    return 0
  }
  const { manifest } = loaded
  let errors = 0
  let warnings = 0

  const structural = validateManifestStructure(manifest)
  for (const p of structural) {
    console.error(`✗ manifest: ${p}`)
    errors++
  }

  for (const f of boundaryFindings) {
    console.warn(`⚠ ${f.rule}: ${f.detail}`)
    warnings++
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

  if (errors === 0 && warnings === 0) {
    console.log(`✓ ${manifest.name} — manifest valid, ${Object.keys(manifest.surfaces ?? {}).length} surface(s), no issues`)
  } else {
    console.log(`\n${errors} error(s), ${warnings} warning(s)`)
  }
  return errors > 0 ? 1 : 0
}
