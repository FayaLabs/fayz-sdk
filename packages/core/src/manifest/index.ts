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

export interface BackendRef {
  provider: 'supabase' | 'mock'
  /** Supabase project ref / URL, when provider is 'supabase'. Secrets stay in env. */
  projectRef?: string
  url?: string
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
  /** Plugin id, resolved to an installed @fayz/plugin-* at build time. */
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
      `Manifest version ${version} is newer than this SDK supports (${CURRENT_MANIFEST_VERSION}). Upgrade @fayz/runtime.`,
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
  if (!m.id) problems.push('manifest.id is required')
  if (!m.name) problems.push('manifest.name is required')
  if (!m.surfaces || Object.keys(m.surfaces).length === 0)
    problems.push('manifest.surfaces must declare at least one surface')
  for (const [name, surface] of Object.entries(m.surfaces ?? {})) {
    if (!surface.scaffold) problems.push(`surface "${name}" is missing a scaffold id`)
    for (const page of surface.pages ?? []) {
      const kinds = [page.blocks, page.entity, page.component].filter((x) => x != null)
      if (kinds.length !== 1)
        problems.push(`surface "${name}" page "${page.path}" must set exactly one of blocks/entity/component`)
    }
  }
  return problems
}
