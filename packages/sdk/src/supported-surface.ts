import supportedSurface from './supported-surface.json'

export type FayzPackageTier = 'stable'

export interface FayzSupportedSurface {
  surfaceVersion: number
  supported: Record<string, FayzPackageTier>
  internal: string[]
}

const surface = supportedSurface as unknown as FayzSupportedSurface

/** Every package a generated Fayz app is allowed to depend on (the public surface). */
export function getSupportedPackages(): string[] {
  return Object.keys(surface.supported)
}

/** Packages that exist but are NOT part of the public surface (deprecated/internal). */
export function getInternalPackages(): string[] {
  return [...surface.internal]
}

/**
 * True when `packageName` is part of the supported public surface. Used by
 * `fayz doctor` to warn (never fail) when an app depends on something off-surface.
 * Non-Fayz packages (no `@fayz-ai/` prefix) are out of scope and return true.
 */
export function isSupportedPackage(packageName: string): boolean {
  if (!packageName.startsWith('@fayz-ai/')) return true
  return packageName in surface.supported
}

export { surface as fayzSupportedSurface }
