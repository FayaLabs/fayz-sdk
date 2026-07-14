import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { loadManifest, type ManifestLike } from './manifest.js'
import { checksumFile } from './ledger.js'

// Pure planning layer for `fayz db apply`. Produces an ordered migration plan by
// resolving SQL from the app's INSTALLED packages (never a ../../fayz-sdk
// checkout), so external developers with only published @fayz-ai/* deps can
// provision their Supabase database. This module performs fs reads only — no
// network, no execution. The Management-API executor (milestone A3b) consumes
// the plan this builds; see seam notes at the bottom of the file.

export type MigrationSource = 'spine' | 'drizzle' | 'seed' | 'plugin' | 'incubator'

/** A single SQL file in the plan, with its content checksum precomputed (Runner v2). */
export interface MigrationFile {
  /** Absolute path to the .sql file. */
  path: string
  /** sha256 hex of the file's bytes — the value the ledger compares against. */
  checksum: string
}

export interface MigrationStep {
  /** 1-based position in the final (post-filter) plan. */
  order: number
  source: MigrationSource
  /** Human-facing step id, e.g. '@fayz-ai/db', 'drizzle', plugin id, incubator dir.
   * Also the `plugin_id` recorded in the ledger for this step's files. */
  id: string
  /** The .sql files this step applies, in apply order, each with its checksum. */
  files: MigrationFile[]
}

export interface BuildMigrationPlanOptions {
  /** Keep only the spine step (①); drop drizzle/seed/plugins/incubator. */
  spineOnly?: boolean
  /** Keep only plugin (④) + incubator (⑤) steps; drop spine/drizzle/seed. */
  pluginsOnly?: boolean
  /** Restrict the plugin step to these plugin ids (manifest ids, not package names). */
  onlyPlugins?: string[]
}

export interface MigrationPlan {
  /** App directory the plan was built for (absolute). */
  appDir: string
  /** Ordered steps, each with a resolved file list (post-filter, re-numbered). */
  steps: MigrationStep[]
  /** Non-fatal observations: empty spine, skipped plugins, no manifest, etc. */
  notes: string[]
  /** Total .sql files across all steps. */
  totalFiles: number
}

/** Thrown when the app is missing a hard dependency needed to plan (e.g. @fayz-ai/db). */
export class MigrationPlanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MigrationPlanError'
  }
}

/**
 * Locate an installed package's root directory by walking node_modules upward
 * from `fromDir`. Used instead of `require.resolve('<pkg>/package.json')`
 * because @fayz-ai packages define an `exports` map that does NOT expose
 * `./package.json` (require.resolve throws ERR_PACKAGE_PATH_NOT_EXPORTED even
 * when the package is installed). A direct fs walk sidesteps the exports map.
 */
function resolvePackageDir(pkgName: string, fromDir: string): string | null {
  const segments = pkgName.split('/')
  let dir = resolve(fromDir)
  for (;;) {
    const candidate = join(dir, 'node_modules', ...segments)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function sqlFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(dir, f))
}

/** Attach each file's content checksum so the plan carries what the ledger compares. */
function toFiles(paths: string[]): MigrationFile[] {
  return paths.map((path) => ({ path, checksum: checksumFile(path) }))
}

/**
 * Plugin ids whose companion migrations ship in a package that does NOT follow
 * the `@fayz-ai/plugin-<id>` convention. shop + courses are first-class SDK
 * packages (@fayz-ai/shop, @fayz-ai/courses) with root-level migrations/.
 */
const PLUGIN_PACKAGE_OVERRIDES: Record<string, string> = {
  shop: '@fayz-ai/shop',
  courses: '@fayz-ai/courses',
}

/**
 * Map a manifest plugin id (e.g. 'crm') to its published package name.
 * The SDK convention is a stable `@fayz-ai/plugin-<id>` mapping, overridden for
 * the handful of first-class packages (shop, courses) that predate it.
 */
export function pluginPackageName(id: string): string {
  return PLUGIN_PACKAGE_OVERRIDES[id] ?? `@fayz-ai/plugin-${id}`
}

/**
 * Resolve a package's companion migration .sql files. Convention plugins keep
 * them under `src/migrations/`; the first-class packages (@fayz-ai/shop,
 * @fayz-ai/courses) keep them at the package root under `migrations/`. Check
 * both so either layout is provisioned.
 */
function pluginMigrationFiles(pluginDir: string): string[] {
  const srcFiles = sqlFilesIn(join(pluginDir, 'src', 'migrations'))
  if (srcFiles.length > 0) return srcFiles
  return sqlFilesIn(join(pluginDir, 'migrations'))
}

/**
 * Enabled plugin ids in manifest declaration order, de-duplicated across
 * surfaces (first occurrence wins). A plugin ref is enabled unless it sets
 * `enabled: false`.
 */
function enabledPluginIds(manifest: ManifestLike): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const surface of Object.values(manifest.surfaces ?? {})) {
    for (const ref of surface.plugins ?? []) {
      const id = ref?.id
      if (!id || seen.has(id)) continue
      if ((ref as { enabled?: boolean }).enabled === false) continue
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

/**
 * Build an ordered migration plan for an app from its INSTALLED packages.
 *
 * Resolution order (all relative to the app, never a sibling SDK checkout):
 *   ① spine     — @fayz-ai/db migrations/*.sql
 *   ② drizzle   — app drizzle/*.sql
 *   ③ seed      — app supabase/seed-saas-core.sql
 *   ④ plugin    — each enabled plugin's src/migrations/*.sql (manifest order)
 *   ⑤ incubator — app src/plugins/<name>/migrations/*.sql
 */
export function buildMigrationPlan(appDir: string, options: BuildMigrationPlanOptions = {}): MigrationPlan {
  const root = resolve(appDir)
  const notes: string[] = []

  const { spineOnly = false, pluginsOnly = false, onlyPlugins } = options
  // Three inclusion gates. Default (no flags) includes everything.
  //   --spine-only   → just the @fayz-ai/db spine (①)
  //   --plugins-only → just plugin (④) + incubator (⑤)
  const wantSpine = !pluginsOnly
  const wantDrizzleSeed = !spineOnly && !pluginsOnly
  const wantPlugins = !spineOnly

  const steps: MigrationStep[] = []

  // ① Spine — @fayz-ai/db. Resolving the package is REQUIRED (a clear install
  // hint otherwise); an installed-but-migration-less tarball (published 0.1.2)
  // is tolerated with a note so the rest of the plan still builds.
  if (wantSpine) {
    const dbDir = resolvePackageDir('@fayz-ai/db', root)
    if (!dbDir) {
      throw new MigrationPlanError(
        `@fayz-ai/db is not installed in ${root}.\n` +
          `  The migration spine ships with @fayz-ai/db. Install it:\n` +
          `    npm install @fayz-ai/db\n` +
          `  then re-run 'fayz db apply'.`,
      )
    }
    const spineFiles = sqlFilesIn(join(dbDir, 'migrations'))
    if (spineFiles.length === 0) {
      notes.push(
        'installed @fayz-ai/db ships no migrations/ — the spine step is empty ' +
          '(upgrade to @fayz-ai/db >= 0.1.3 once published)',
      )
    }
    steps.push({ order: 0, source: 'spine', id: '@fayz-ai/db', files: toFiles(spineFiles) })
  }

  // ② Drizzle-generated table migrations (app-owned).
  if (wantDrizzleSeed) {
    const drizzleFiles = sqlFilesIn(join(root, 'drizzle'))
    if (drizzleFiles.length > 0) {
      steps.push({ order: 0, source: 'drizzle', id: 'drizzle', files: toFiles(drizzleFiles) })
    }
  }

  // ③ core catalog seed (app-owned, depends on spine + drizzle tables).
  if (wantDrizzleSeed) {
    const seed = join(root, 'supabase', 'seed-saas-core.sql')
    if (existsSync(seed)) {
      steps.push({ order: 0, source: 'seed', id: 'supabase/seed-saas-core.sql', files: toFiles([seed]) })
    }
  }

  // ④ Enabled plugins in manifest order → each plugin's companion SQL.
  if (wantPlugins) {
    const loaded = loadManifest(root)
    if (!loaded) {
      notes.push(
        'no app.manifest.json (code-config app) — plugin migrations cannot be ' +
          'enumerated from a manifest; skipping the plugin step',
      )
    } else {
      let ids = enabledPluginIds(loaded.manifest)
      if (onlyPlugins && onlyPlugins.length > 0) {
        const wanted = new Set(onlyPlugins)
        const missing = onlyPlugins.filter((id) => !ids.includes(id))
        for (const id of missing) {
          notes.push(`--only-plugins '${id}' is not an enabled plugin in the manifest — ignored`)
        }
        ids = ids.filter((id) => wanted.has(id))
      }
      for (const id of ids) {
        const pkg = pluginPackageName(id)
        const pluginDir = resolvePackageDir(pkg, root)
        if (!pluginDir) {
          notes.push(
            `plugin '${id}': ${pkg} not resolvable from the app ` +
              `(platform-bundled or not installed) — skipped`,
          )
          continue
        }
        const files = pluginMigrationFiles(pluginDir)
        if (files.length === 0) {
          notes.push(`plugin '${id}': ${pkg} ships no migrations — skipped`)
          continue
        }
        steps.push({ order: 0, source: 'plugin', id, files: toFiles(files) })
      }
    }
  }

  // ⑤ Incubator plugins: app-local src/plugins/<name>/migrations/*.sql.
  if (wantPlugins) {
    const incubatorRoot = join(root, 'src', 'plugins')
    if (existsSync(incubatorRoot)) {
      const dirs = readdirSync(incubatorRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
      for (const name of dirs) {
        const files = sqlFilesIn(join(incubatorRoot, name, 'migrations'))
        if (files.length === 0) continue
        steps.push({ order: 0, source: 'incubator', id: name, files: toFiles(files) })
      }
    }
  }

  // Re-number sequentially after filtering so output is always 1..N.
  steps.forEach((step, i) => {
    step.order = i + 1
  })

  const totalFiles = steps.reduce((n, s) => n + s.files.length, 0)
  return { appDir: root, steps, notes, totalFiles }
}
