import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Minimal, dependency-free manifest checks for the CLI. The published JSON
// Schema (@fayz-ai/core app-manifest.schema.json) is the source of truth; these
// mirror @fayz-ai/core's validateManifest for fast local feedback without pulling
// the browser runtime into a Node CLI.

export interface ManifestLike {
  manifestVersion?: number
  id?: string
  name?: string
  surfaces?: Record<string, { scaffold?: string; plugins?: { id: string }[]; pages?: ManifestPage[] }>
  locale?: { default?: string; supported?: string[] }
  theme?: { brand?: unknown; radius?: unknown; mode?: unknown; [key: string]: unknown }
  backend?: { provider?: unknown; [key: string]: unknown }
  [key: string]: unknown
}

// Enum values mirror @fayz-ai/core: ThemeBrand/ThemeRadius/ThemeMode
// (packages/core/src/types/theme.ts) and BackendProvider
// (packages/core/src/manifest/index.ts). Kept in sync manually so the CLI stays
// dependency-free.
const THEME_BRANDS = ['blue', 'violet', 'green', 'orange', 'red', 'pink', 'teal']
const THEME_RADII = ['none', 'sm', 'md', 'lg', 'full']
const THEME_MODES = ['light', 'dark', 'system']
const BACKEND_PROVIDERS = ['supabase', 'fayz-api', 'fayz-shop', 'mock', 'custom']

interface ManifestPage {
  path?: string
  blocks?: unknown
  entity?: unknown
  component?: unknown
}

export function loadManifest(dir: string): { manifest: ManifestLike; path: string } | null {
  // app.manifest.json lives at the repo root or under src/ depending on the template.
  for (const candidate of ['app.manifest.json', 'src/app.manifest.json']) {
    const path = resolve(dir, candidate)
    if (existsSync(path)) {
      return { manifest: JSON.parse(readFileSync(path, 'utf8')) as ManifestLike, path }
    }
  }
  return null
}

export function validateManifestStructure(m: ManifestLike): string[] {
  const problems: string[] = []
  if (!m.id) problems.push('id is required')
  else if (!/^[a-z0-9][a-z0-9-]*$/.test(m.id)) problems.push(`id "${m.id}" must be kebab-case`)
  if (!m.name) problems.push('name is required')
  if (typeof m.manifestVersion !== 'number') problems.push('manifestVersion must be a number')
  const surfaces = m.surfaces ?? {}
  if (Object.keys(surfaces).length === 0) problems.push('surfaces must declare at least one surface')
  for (const [name, surface] of Object.entries(surfaces)) {
    if (!surface.scaffold) problems.push(`surface "${name}" is missing a scaffold id`)
    for (const page of surface.pages ?? []) {
      if (!page.path) problems.push(`surface "${name}" has a page with no path`)
      const kinds = [page.blocks, page.entity, page.component].filter((x) => x != null)
      if (kinds.length !== 1)
        problems.push(`surface "${name}" page "${page.path ?? '?'}" must set exactly one of blocks/entity/component`)
    }
  }
  // Theme + backend enum checks. These fields are optional, but when present
  // they must be one of the values @fayz-ai/core actually supports.
  const theme = m.theme
  if (theme != null && typeof theme === 'object') {
    checkEnum(theme.brand, THEME_BRANDS, 'theme.brand', problems)
    checkEnum(theme.radius, THEME_RADII, 'theme.radius', problems)
    checkEnum(theme.mode, THEME_MODES, 'theme.mode', problems)
  }
  const backend = m.backend
  if (backend != null && typeof backend === 'object') {
    checkEnum(backend.provider, BACKEND_PROVIDERS, 'backend.provider', problems)
  }
  return problems
}

function checkEnum(value: unknown, allowed: string[], field: string, problems: string[]): void {
  if (value == null) return // absent/undefined is fine (optional field)
  if (typeof value !== 'string' || !allowed.includes(value)) {
    problems.push(`${field} "${String(value)}" is not valid (expected one of: ${allowed.join(', ')})`)
  }
}

export function referencedPluginIds(m: ManifestLike): string[] {
  const pluginIds = new Set<string>()
  for (const surface of Object.values(m.surfaces ?? {})) {
    for (const ref of surface.plugins ?? []) {
      pluginIds.add(ref.id)
    }
  }
  return [...pluginIds]
}
