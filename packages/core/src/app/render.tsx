import * as React from 'react'
import { getScaffold } from '../registry'
import { migrateManifest, validateManifest, CURRENT_MANIFEST_VERSION } from '../manifest'
import type { AppManifest } from '../manifest'

// ---------------------------------------------------------------------------
// defineApp / renderApp — the entry points that turn an AppManifest into a
// running app. Scaffolds (admin, storefront, portal) self-register into the
// scaffold registry when their package is imported, so core never depends on
// them: a generated app imports the scaffold package(s) it needs, then calls
// renderApp(manifest). createSaasApp / createStorefrontApp become sugar that
// builds a manifest and hands it here.
// ---------------------------------------------------------------------------

const ManifestContext = React.createContext<AppManifest | null>(null)

/** Access the active app manifest from any component under renderApp. */
export function useManifest(): AppManifest | null {
  return React.useContext(ManifestContext)
}

/** Stamp + validate a manifest authored in code (the sugar path). */
export function defineApp(
  manifest: Omit<AppManifest, 'manifestVersion'> & { manifestVersion?: number },
): AppManifest {
  const full = {
    ...manifest,
    manifestVersion: manifest.manifestVersion ?? CURRENT_MANIFEST_VERSION,
  } as AppManifest
  const problems = validateManifest(full)
  if (problems.length) {
    throw new Error(`Invalid AppManifest:\n - ${problems.join('\n - ')}`)
  }
  return full
}

export interface RenderAppOptions {
  /** Which surface to mount; defaults to the first declared surface. */
  surface?: string
}

/** Resolve, migrate and validate a manifest, then mount the scaffold for the
 *  chosen surface. Accepts a raw object (e.g. parsed app.manifest.json). */
export function renderApp(
  input: AppManifest | Record<string, unknown>,
  opts: RenderAppOptions = {},
): React.ReactElement {
  const manifest = migrateManifest(input as Record<string, unknown>)
  const problems = validateManifest(manifest)
  if (problems.length) {
    throw new Error(`Invalid AppManifest:\n - ${problems.join('\n - ')}`)
  }
  const surfaceName = opts.surface ?? Object.keys(manifest.surfaces)[0]
  const surface = surfaceName ? manifest.surfaces[surfaceName] : undefined
  if (!surface) {
    throw new Error(`Surface "${surfaceName}" not found in manifest.`)
  }
  const Scaffold = getScaffold(surface.scaffold)
  if (!Scaffold) {
    throw new Error(
      `Scaffold "${surface.scaffold}" is not registered. Import the package that provides it (e.g. @fayz-ai/saas or @fayz-ai/shop) before calling renderApp.`,
    )
  }
  return React.createElement(
    ManifestContext.Provider,
    { value: manifest },
    React.createElement(Scaffold, { manifest, surface: surfaceName }),
  )
}
