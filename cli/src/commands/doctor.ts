import { loadManifest, validateManifestStructure, missingPluginDeps } from '../lib/manifest.js'

// `fayz doctor` — validate the app in the current directory: manifest structure,
// plugin dependency coverage, and locale completeness. Exit non-zero on errors.
export function doctor(dir = process.cwd()): number {
  const loaded = loadManifest(dir)
  if (!loaded) {
    console.error('✗ No app.manifest.json found in', dir)
    return 1
  }
  const { manifest } = loaded
  let errors = 0
  let warnings = 0

  const structural = validateManifestStructure(manifest)
  for (const p of structural) {
    console.error(`✗ manifest: ${p}`)
    errors++
  }

  const missing = missingPluginDeps(manifest, dir)
  for (const m of missing) {
    console.error(`✗ plugin not installed: ${m}`)
    errors++
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
