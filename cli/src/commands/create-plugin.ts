import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

// `fayz create plugin <name>` — scaffold an app-local (incubator) plugin in the
// current app, following the same PluginManifest contract as official plugins.
// This is the sanctioned private/partner extension path (layer C) — see
// docs/CUSTOMIZATION.md and docs/ARCHITECTURE.md (boundary model).

function write(root: string, rel: string, content: string): void {
  const full = resolve(root, rel)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function pascal(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('')
}

function indexTs(name: string, P: string, Title: string): string {
  return `import React from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { createSafeDataProvider } from '@fayz-ai/core'
import type { ${P}DataProvider } from './data/types'
import { createMock${P}Provider } from './data/mock'
import { createSupabase${P}Provider } from './data/supabase'

// ---------------------------------------------------------------------------
// ${Title} — app-local incubator plugin (layer C).
// Owns its data + behaviour and extends the platform ONLY through the
// PluginManifest contract. It can do everything an official @fayz-ai/plugin-*
// can; promoting it is a packaging move, not a rewrite (see ./README.md).
// ---------------------------------------------------------------------------

export interface ${P}PluginOptions {
  /** Inject a real provider; falls back to mock when no backend is configured. */
  dataProvider?: ${P}DataProvider
  navPosition?: number
  scope?: PluginScope
  verticalId?: VerticalId
}

export function create${P}Plugin(options?: ${P}PluginOptions): PluginManifest {
  const provider =
    options?.dataProvider ??
    createSafeDataProvider(
      () => createSupabase${P}Provider(),
      () => createMock${P}Provider(),
    )
  void provider // wire into your views via a plugin context/provider seam

  const Page: React.ComponentType<unknown> = () =>
    React.createElement('div', { style: { padding: 24 } }, '${Title} — app-local plugin')
  Page.displayName = '${P}Home'

  return {
    id: '${name}',
    name: '${Title}',
    icon: 'Puzzle',
    version: '0.1.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    defaultEnabled: true,
    navigation: [
      { section: 'main', position: options?.navPosition ?? 50, label: '${Title}', route: '/${name}', icon: 'Puzzle' },
    ],
    routes: [{ path: '/${name}', component: Page }],
    // Other seams available as you grow: events, widgets, settings, aiTools,
    // serverActions, customFields, diagnostics, migrations, connectors.
    // See docs/PLUGIN-PATTERNS.md → "Extension seams".
  }
}
`
}

function typesTs(P: string): string {
  return `export interface ${P}Record {
  id: string
  name: string
}

/** The data contract every backend for this plugin implements. */
export interface ${P}DataProvider {
  list(): Promise<${P}Record[]>
}
`
}

function mockTs(P: string): string {
  return `import type { ${P}DataProvider, ${P}Record } from './types'

export function createMock${P}Provider(): ${P}DataProvider {
  const rows: ${P}Record[] = [{ id: '1', name: 'Example' }]
  return {
    async list() {
      return rows
    },
  }
}
`
}

function supabaseTs(name: string, P: string): string {
  return `import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import type { ${P}DataProvider, ${P}Record } from './types'

// Real provider. Note: we go through the Fayz boundary (getSupabaseClientOptional),
// never importing @supabase/supabase-js directly — see ARCHITECTURE.md (boundary model).
export function createSupabase${P}Provider(): ${P}DataProvider {
  function sb() {
    const client = getSupabaseClientOptional() as {
      from: (t: string) => {
        select: (c: string) => { eq: (k: string, v: unknown) => Promise<{ data: ${P}Record[] | null; error: unknown }> }
      }
    } | null
    if (!client) throw new Error('Supabase not initialized')
    return client
  }
  return {
    async list() {
      const { data, error } = await sb().from('${name}').select('*').eq('tenant_id', getActiveTenantId())
      if (error) throw error
      return data ?? []
    },
  }
}
`
}

function schemaTs(name: string): string {
  return `// App-local migrations for the ${name} plugin. Wire them into the manifest's
// \`migrations: [...]\` once you have real tables, e.g.:
//
//   migrations: [{ id: '${name}-0001', version: '0.1.0', sql: '<create table ...>' }]
//
// See docs/PLUGIN-PATTERNS.md → "Capability anatomy".
export const ${name.replace(/-/g, '_')}Migrations: { id: string; version: string; sql: string }[] = []
`
}

function readme(name: string, P: string, Title: string): string {
  return `# ${Title} (app-local plugin)

A client-owned plugin that follows the **exact** Fayz plugin contract. It extends
the platform through \`PluginManifest\` seams only — it never edits SDK or shared
plugin internals. This is the sanctioned private/partner extension path
(layer C — see \`docs/ARCHITECTURE.md\` and \`docs/CUSTOMIZATION.md\`).

## Wire it into your app
\`\`\`ts
import { create${P}Plugin } from './plugins/${name}'

// add to your defineSaas/defineStorefront config:
plugins: [
  // ...existing plugins
  create${P}Plugin(),
]
\`\`\`

## Provider-first
Ships on the bundled mock provider; drop in \`createSupabase${P}Provider\` (or your
own \`${P}DataProvider\`) for real data without touching the UI.

## Graduation checklist (private → official @fayz-ai/plugin-${name})
Promotion is a packaging move, not a rewrite. Before graduating:
- [ ] Manifest passes \`assertPluginManifestContract\` (\`@fayz-ai/core/testing\`)
- [ ] A capability test proves the data slice end-to-end on the mock provider
- [ ] Migrations live in \`schema/\` **and** are wired into \`migrations: [...]\`
- [ ] Permissions declared (deny-by-default in multi-tenant)
- [ ] i18n complete (en + pt-BR)
- [ ] No direct provider-SDK imports (\`fayz doctor\` clean)
- [ ] Move this folder to \`fayz-sdk/plugins/plugin-${name}/src/\` — manifest unchanged
`
}

export function createPlugin(name: string): number {
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    console.error('✗ Provide a kebab-case plugin name, e.g. fayz create plugin loyalty')
    return 1
  }
  const dir = resolve(process.cwd(), 'src', 'plugins', name)
  if (existsSync(dir)) {
    console.error(`✗ src/plugins/${name} already exists.`)
    return 1
  }
  const P = pascal(name)
  const Title = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

  write(dir, 'index.ts', indexTs(name, P, Title))
  write(dir, 'data/types.ts', typesTs(P))
  write(dir, 'data/mock.ts', mockTs(P))
  write(dir, 'data/supabase.ts', supabaseTs(name, P))
  write(dir, 'schema/index.ts', schemaTs(name))
  write(dir, 'README.md', readme(name, P, Title))

  console.log(`✓ Created app-local plugin "src/plugins/${name}"`)
  console.log(`\n  Add create${P}Plugin() to your app's plugins array (see src/plugins/${name}/README.md).`)
  console.log('  Run "fayz doctor" to check boundaries.')
  return 0
}
