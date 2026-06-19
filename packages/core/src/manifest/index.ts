import type { EntityDef } from '../types/crud'
import type { LocaleConfig } from '../types/i18n'
import type { PermissionsConfig } from '../types/permissions'
import type { BillingConfig } from '../types/billing'
import type { BlockNode } from '../blocks'

// ---------------------------------------------------------------------------
// AppManifest — THE app, as data.
//
// This is the canonical artifact every generated repo commits as
// `app.manifest.json` and that `fayz upgrade` migrates across the fleet. It is
// strictly JSON-serializable: no functions, no components — only ids resolved
// against the registries (see ../registry). `createSaasApp`/`createStorefrontApp`
// become thin sugar that builds a manifest of this shape.
//
// Versioning: bump CURRENT_MANIFEST_VERSION and register a migration whenever
// the shape changes. The single biggest fleet-maintenance lever — getting it
// right is why W1 is the "point of no return".
// ---------------------------------------------------------------------------

export const CURRENT_MANIFEST_VERSION = 2

export type BackendProvider = 'supabase' | 'fayz-api' | 'fayz-shop' | 'mock' | 'custom'

export interface BackendRef {
  provider: BackendProvider
  /** Provider project ref / URL. Secrets stay in env/platform storage. */
  projectRef?: string
  url?: string
  /** Registered adapter id when provider is 'custom'. */
  adapterId?: string
  /** Public, JSON-safe provider options. Never store secrets here. */
  options?: Record<string, unknown>
}

/** How a manifest page produces its body — exactly one of blocks/entity/component. */
export interface PageManifest {
  path: string
  label?: string
  icon?: string
  section?: 'main' | 'secondary' | 'settings'
  /** A block tree (pure data). */
  blocks?: BlockNode[]
  /** An entity key → rendered as a CRUD page by the scaffold. */
  entity?: string
  /** A registered page-component id, e.g. 'custom:HarvestBoard'. */
  component?: string
  /** Optional permission gate: feature + action. */
  permission?: { feature: string; action: string }
}

export interface PluginRef {
  /** Plugin id, resolved to an installed @fayz-ai/plugin-* at build time. */
  id: string
  /** Pure-data config passed to the plugin (labels, kinds, module flags…). */
  config?: Record<string, unknown>
  enabled?: boolean
}

export interface SurfaceManifest {
  /** Registered scaffold id: 'admin' | 'storefront' | 'portal' | custom. */
  scaffold: string
  plugins?: PluginRef[]
  pages?: PageManifest[]
  /** Surface-specific declarative options (announcement, footer, nav, shipping,
   *  catalog seed, onboarding, …) — kept open so scaffolds evolve without a
   *  manifest-version bump for additive fields. */
  options?: Record<string, unknown>
}

export interface AppManifest {
  manifestVersion: number
  id: string
  name: string
  backend?: BackendRef
  locale?: LocaleConfig
  /** Theme tokens — SaasTheme or StorefrontTheme depending on surface; kept
   *  loose at the core layer to avoid coupling core to surface packages. */
  theme?: Record<string, unknown>
  /** Keyed by surface name ('admin', 'storefront', …). At least one required. */
  surfaces: Record<string, SurfaceManifest>
  /** App-defined entity extensions (vertical-specific tables/fields). */
  entities?: EntityDef[]
  permissions?: PermissionsConfig
  billing?: BillingConfig
}

// ---------------------------------------------------------------------------
// Migration runner — applies sequential migrations from a manifest's version
// up to CURRENT. Each migration is keyed by the version it upgrades FROM.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyManifest = Record<string, any>
export type ManifestMigration = (m: AnyManifest) => AnyManifest

const migrations = new Map<number, ManifestMigration>()
const supportedBackendProviders: BackendProvider[] = ['supabase', 'fayz-api', 'fayz-shop', 'mock', 'custom']
const supportedPageSections = new Set(['main', 'secondary', 'settings'])
const allowedManifestKeys = new Set([
  'manifestVersion',
  'id',
  'name',
  'backend',
  'locale',
  'theme',
  'permissions',
  'billing',
  'entities',
  'surfaces',
])
const allowedBackendKeys = new Set(['provider', 'projectRef', 'url', 'adapterId', 'options'])
const allowedSurfaceKeys = new Set(['scaffold', 'options', 'plugins', 'pages'])
const allowedPluginRefKeys = new Set(['id', 'config', 'enabled'])
const allowedPageKeys = new Set(['path', 'label', 'icon', 'section', 'blocks', 'entity', 'component', 'permission'])
const allowedPermissionKeys = new Set(['feature', 'action'])
const allowedBlockKeys = new Set(['type', 'id', 'props', 'children'])
const manifestIdPattern = /^[a-z0-9][a-z0-9-]*$/

/** Register a migration that upgrades a manifest FROM `fromVersion` to fromVersion+1. */
export function registerManifestMigration(fromVersion: number, fn: ManifestMigration): void {
  migrations.set(fromVersion, fn)
}

/** Bring any manifest up to CURRENT_MANIFEST_VERSION, or throw if it was built
 *  for a newer SDK than this runtime understands. */
export function migrateManifest(input: AnyManifest): AppManifest {
  let m = { ...input }
  let version = typeof m.manifestVersion === 'number' ? m.manifestVersion : 1
  if (version > CURRENT_MANIFEST_VERSION) {
    throw new Error(
      `Manifest version ${version} is newer than this SDK supports (${CURRENT_MANIFEST_VERSION}). Upgrade @fayz-ai/core.`,
    )
  }
  while (version < CURRENT_MANIFEST_VERSION) {
    const migrate = migrations.get(version)
    if (!migrate) {
      throw new Error(`No manifest migration registered from version ${version}.`)
    }
    m = migrate(m)
    version += 1
    m.manifestVersion = version
  }
  return m as AppManifest
}

/** Validate the structural invariants the JSON Schema can't fully express.
 *  Returns a list of human-readable problems (empty = valid). */
export function validateManifest(m: AppManifest): string[] {
  const problems: string[] = []
  const manifest = m as unknown as Record<string, unknown>

  addUnsupportedKeys(manifest, allowedManifestKeys, 'manifest', problems)

  if (!Number.isInteger(manifest.manifestVersion)) {
    problems.push('manifest.manifestVersion must be an integer')
  } else if (manifest.manifestVersion !== CURRENT_MANIFEST_VERSION) {
    problems.push(`manifest.manifestVersion must be ${CURRENT_MANIFEST_VERSION}`)
  }
  if (typeof manifest.id !== 'string' || !manifest.id.trim()) problems.push('manifest.id is required')
  else if (!manifestIdPattern.test(manifest.id.trim())) {
    problems.push('manifest.id must match /^[a-z0-9][a-z0-9-]*$/')
  }
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) problems.push('manifest.name is required')

  validateLooseObject(manifest.locale, 'manifest.locale', problems)
  validateLooseObject(manifest.theme, 'manifest.theme', problems)
  validateLooseObject(manifest.permissions, 'manifest.permissions', problems)
  validateLooseObject(manifest.billing, 'manifest.billing', problems)
  if (manifest.entities !== undefined) {
    if (!Array.isArray(manifest.entities)) {
      problems.push('manifest.entities must be an array')
    } else {
      manifest.entities.forEach((entity, index) => {
        if (!isRecord(entity)) problems.push(`manifest.entities[${index}] must be an object`)
      })
    }
  }

  if (manifest.backend !== undefined) {
    if (!isRecord(manifest.backend)) {
      problems.push('manifest.backend must be an object')
    } else {
      addUnsupportedKeys(manifest.backend, allowedBackendKeys, 'manifest.backend', problems)
      const provider = manifest.backend.provider
      if (typeof provider !== 'string' || !supportedBackendProviders.includes(provider as BackendProvider)) {
        problems.push(`manifest.backend.provider "${String(provider)}" is not supported`)
      }
      validateOptionalNonEmptyString(manifest.backend.projectRef, 'manifest.backend.projectRef', problems)
      validateOptionalNonEmptyString(manifest.backend.url, 'manifest.backend.url', problems)
      if (provider === 'custom' && !isNonEmptyString(manifest.backend.adapterId)) {
        problems.push('manifest.backend.adapterId is required when provider is "custom"')
      } else if (provider !== 'custom') {
        validateOptionalNonEmptyString(manifest.backend.adapterId, 'manifest.backend.adapterId', problems)
      }
      validateLooseObject(manifest.backend.options, 'manifest.backend.options', problems)
    }
  }

  if (!isRecord(manifest.surfaces) || Object.keys(manifest.surfaces).length === 0) {
    problems.push('manifest.surfaces must declare at least one surface')
  } else {
    for (const [name, surface] of Object.entries(manifest.surfaces)) {
      validateSurfaceManifest(name, surface, problems)
    }
  }

  return problems
}

function validateSurfaceManifest(name: string, surface: unknown, problems: string[]): void {
  if (!isRecord(surface)) {
    problems.push(`surface "${name}" must be an object`)
    return
  }

  addUnsupportedKeys(surface, allowedSurfaceKeys, `surface "${name}"`, problems)
  if (!isNonEmptyString(surface.scaffold)) problems.push(`surface "${name}" is missing a scaffold id`)
  validateLooseObject(surface.options, `surface "${name}".options`, problems)

  if (surface.pages !== undefined) {
    if (!Array.isArray(surface.pages)) {
      problems.push(`surface "${name}".pages must be an array`)
    } else {
      const pagePaths = new Set<string>()
      for (const [index, page] of surface.pages.entries()) {
        validatePageManifest(name, index, page, pagePaths, problems)
      }
    }
  }

  if (surface.plugins !== undefined) {
    if (!Array.isArray(surface.plugins)) {
      problems.push(`surface "${name}".plugins must be an array`)
    } else {
      const pluginIds = new Set<string>()
      for (const [index, plugin] of surface.plugins.entries()) {
        validatePluginRef(name, index, plugin, pluginIds, problems)
      }
    }
  }
}

function validatePageManifest(
  surfaceName: string,
  index: number,
  page: unknown,
  pagePaths: Set<string>,
  problems: string[],
): void {
  const pageLabel = `surface "${surfaceName}" page #${index + 1}`
  if (!isRecord(page)) {
    problems.push(`${pageLabel} must be an object`)
    return
  }

  addUnsupportedKeys(page, allowedPageKeys, pageLabel, problems)

  if (!isNonEmptyString(page.path)) {
    problems.push(`${pageLabel} has an empty path`)
  } else {
    const normalizedPath = page.path.trim()
    if (pagePaths.has(normalizedPath)) {
      problems.push(`surface "${surfaceName}" declares duplicate page path "${normalizedPath}"`)
    } else {
      pagePaths.add(normalizedPath)
    }
  }

  if (page.label !== undefined && typeof page.label !== 'string') problems.push(`${pageLabel}.label must be a string`)
  if (page.icon !== undefined && typeof page.icon !== 'string') problems.push(`${pageLabel}.icon must be a string`)
  if (page.section !== undefined && (typeof page.section !== 'string' || !supportedPageSections.has(page.section))) {
    problems.push(`${pageLabel}.section must be one of main, secondary, settings`)
  }
  if (page.entity !== undefined && !isNonEmptyString(page.entity)) problems.push(`${pageLabel}.entity must be a non-empty string`)
  if (page.component !== undefined && !isNonEmptyString(page.component)) {
    problems.push(`${pageLabel}.component must be a non-empty string`)
  }

  const kinds = [page.blocks, page.entity, page.component].filter((x) => x != null)
  if (kinds.length !== 1) {
    problems.push(`${pageLabel} must set exactly one of blocks/entity/component`)
  }

  if (page.permission !== undefined) {
    validatePermission(page.permission, `${pageLabel}.permission`, problems)
  }

  if (page.blocks !== undefined) {
    if (!Array.isArray(page.blocks)) {
      problems.push(`${pageLabel}.blocks must be an array`)
    } else {
      page.blocks.forEach((block, blockIndex) => {
        validateBlockManifest(block, `${pageLabel}.blocks[${blockIndex}]`, problems)
      })
    }
  }
}

function validatePluginRef(
  surfaceName: string,
  index: number,
  plugin: unknown,
  pluginIds: Set<string>,
  problems: string[],
): void {
  const pluginLabel = `surface "${surfaceName}" plugin #${index + 1}`
  if (!isRecord(plugin)) {
    problems.push(`${pluginLabel} must be an object`)
    return
  }

  addUnsupportedKeys(plugin, allowedPluginRefKeys, pluginLabel, problems)

  if (!isNonEmptyString(plugin.id)) {
    problems.push(`${pluginLabel} has an empty id`)
  } else {
    const normalizedId = plugin.id.trim()
    if (pluginIds.has(normalizedId)) {
      problems.push(`surface "${surfaceName}" declares duplicate plugin id "${normalizedId}"`)
    } else {
      pluginIds.add(normalizedId)
    }
  }

  validateLooseObject(plugin.config, `${pluginLabel}.config`, problems)
  if (plugin.enabled !== undefined && typeof plugin.enabled !== 'boolean') {
    problems.push(`${pluginLabel}.enabled must be a boolean`)
  }
}

function validatePermission(permission: unknown, path: string, problems: string[]): void {
  if (!isRecord(permission)) {
    problems.push(`${path} must be an object`)
    return
  }

  addUnsupportedKeys(permission, allowedPermissionKeys, path, problems)
  if (!isNonEmptyString(permission.feature)) problems.push(`${path}.feature is required`)
  if (!isNonEmptyString(permission.action)) problems.push(`${path}.action is required`)
}

function validateBlockManifest(block: unknown, path: string, problems: string[]): void {
  if (!isRecord(block)) {
    problems.push(`${path} must be an object`)
    return
  }

  addUnsupportedKeys(block, allowedBlockKeys, path, problems)
  if (!isNonEmptyString(block.type)) problems.push(`${path}.type is required`)
  validateLooseObject(block.props, `${path}.props`, problems)
  if (block.id !== undefined && typeof block.id !== 'string') problems.push(`${path}.id must be a string`)

  if (block.children !== undefined) {
    if (!Array.isArray(block.children)) {
      problems.push(`${path}.children must be an array`)
    } else {
      block.children.forEach((child, index) => validateBlockManifest(child, `${path}.children[${index}]`, problems))
    }
  }
}

function addUnsupportedKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  path: string,
  problems: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      problems.push(`${path}.${key} is not part of AppManifest v2`)
    }
  }
}

function validateLooseObject(value: unknown, path: string, problems: string[]): void {
  if (value !== undefined && !isRecord(value)) {
    problems.push(`${path} must be an object`)
  }
}

function validateOptionalNonEmptyString(value: unknown, path: string, problems: string[]): void {
  if (value !== undefined && !isNonEmptyString(value)) {
    problems.push(`${path} must be a non-empty string`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
