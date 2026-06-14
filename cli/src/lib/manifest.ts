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
  [key: string]: unknown
}

interface ManifestPage {
  path?: string
  blocks?: unknown
  entity?: unknown
  component?: unknown
}

export function loadManifest(dir: string): { manifest: ManifestLike; path: string } | null {
  const path = resolve(dir, 'app.manifest.json')
  if (!existsSync(path)) return null
  return { manifest: JSON.parse(readFileSync(path, 'utf8')) as ManifestLike, path }
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
  return problems
}

/** Plugin ids referenced by the manifest but not declared in package.json deps. */
export function missingPluginDeps(m: ManifestLike, dir: string): string[] {
  const pkgPath = resolve(dir, 'package.json')
  if (!existsSync(pkgPath)) return []
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { dependencies?: Record<string, string> }
  const deps = new Set(Object.keys(pkg.dependencies ?? {}))
  const missing: string[] = []
  for (const surface of Object.values(m.surfaces ?? {})) {
    for (const ref of surface.plugins ?? []) {
      const pkgName = `@fayz-ai/plugin-${ref.id}`
      if (!deps.has(pkgName)) missing.push(`${ref.id} (expected dependency ${pkgName})`)
    }
  }
  return missing
}
