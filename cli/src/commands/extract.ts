import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// `fayz extract` — assisted migration from a code-config App.tsx to an
// app.manifest.json skeleton. It detects the factory and the plugins in use and
// emits a starter manifest, flagging non-serializable config (closures,
// components) that must move to src/registry.tsx by hand. This is a starting
// point, not a complete codemod.
export function extract(dir = process.cwd()): number {
  const appPath = ['src/App.tsx', 'src/App.ts', 'src/app.tsx'].map((p) => resolve(dir, p)).find(existsSync)
  if (!appPath) {
    console.error('✗ No src/App.tsx found in', dir)
    return 1
  }
  const src = readFileSync(appPath, 'utf8')

  const isStorefront = /createStorefrontApp/.test(src)
  const isAdmin = /createSaasApp|createFayzApp/.test(src)
  if (!isStorefront && !isAdmin) {
    console.error('✗ Could not find createStorefrontApp / createSaasApp in', appPath)
    return 1
  }
  const kind = isStorefront ? 'storefront' : 'admin'

  // Detect plugin ids from create<Name>Plugin(...) calls.
  const plugins = Array.from(src.matchAll(/create([A-Z][a-zA-Z]+)Plugin\s*\(/g)).map((m) =>
    m[1].toLowerCase(),
  )
  // Detect non-serializable escape hatches that need manual registry.tsx wiring.
  const warnings: string[] = []
  if (/component\s*:/.test(src)) warnings.push('inline `component:` — register it and reference by componentId')
  if (/compute\s*:/.test(src)) warnings.push('metric `compute:` closures — move to registerMetric in registry.tsx')
  if (/renderCell\s*:/.test(src)) warnings.push('`renderCell:` — move to a registered renderer (renderCellId)')
  if (/window\.dispatchEvent|onBookingClick/.test(src)) warnings.push('imperative event wiring — use the event bus')

  const name = (src.match(/name:\s*['"]([^'"]+)['"]/)?.[1] ?? 'app').trim()
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'

  const manifest = {
    manifestVersion: 2,
    id,
    name,
    backend: { provider: 'supabase' as const },
    locale: { default: 'pt-BR', supported: ['pt-BR'], currency: 'BRL' },
    surfaces: {
      [kind]: {
        scaffold: kind,
        ...(kind === 'admin' ? { plugins: plugins.map((p) => ({ id: p })), pages: [] } : { options: {} }),
      },
    },
  }

  const outPath = resolve(dir, 'app.manifest.json')
  if (existsSync(outPath)) {
    console.error('✗ app.manifest.json already exists — refusing to overwrite.')
    return 1
  }
  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n')

  console.log(`✓ Wrote app.manifest.json (${kind}, ${plugins.length} plugin(s) detected: ${plugins.join(', ') || 'none'})`)
  if (warnings.length) {
    console.log('\n⚠ Manual migration needed (move to src/registry.tsx):')
    for (const w of warnings) console.log(`   - ${w}`)
  }
  console.log('\nNext: run `fayz doctor` and wire any custom code in src/registry.tsx.')
  return 0
}
