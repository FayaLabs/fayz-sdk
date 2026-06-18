// ---------------------------------------------------------------------------
// Plugin contract assertions — the integrity half of the deploy gate.
// ---------------------------------------------------------------------------
// Framework-agnostic runtime checks (no test-runner dependency) that any
// plugin's *.test.ts calls to prove its manifest/connector conform to the
// platform contract BEFORE it can ship. A plugin that fails these would break
// the host app at mount time (missing route component, duplicate ids, malformed
// settings tab). Pair with a capability test (does the plugin do its job?) — see
// PLUGIN_PATTERNS.md → capability anatomy. These throw on the first violation.
import type { PluginManifest } from '../types/plugins'
import type { Connector } from '../integrations'

export class PluginContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PluginContractError'
  }
}

function fail(scope: string, msg: string): never {
  throw new PluginContractError(`[${scope}] ${msg}`)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Assert a PluginManifest is structurally sound enough to mount safely.
 * Checks identity, navigation/route wiring, settings tabs, declared features,
 * and id uniqueness. Throws PluginContractError on the first problem.
 */
export function assertPluginManifestContract(manifest: PluginManifest): void {
  const id = manifest?.id
  const scope = nonEmptyString(id) ? id : '<unknown plugin>'

  for (const field of ['id', 'name', 'icon', 'version'] as const) {
    if (!nonEmptyString(manifest?.[field])) fail(scope, `manifest.${field} must be a non-empty string`)
  }

  if (!Array.isArray(manifest.navigation)) fail(scope, 'manifest.navigation must be an array (use [] for settings-only plugins)')
  if (!Array.isArray(manifest.routes)) fail(scope, 'manifest.routes must be an array (use [] for settings-only plugins)')

  // Every nav entry must point at a route; every route needs a path + component.
  for (const [i, nav] of manifest.navigation.entries()) {
    if (!nonEmptyString((nav as any)?.route)) fail(scope, `navigation[${i}].route must be a non-empty string`)
  }
  const routePaths = new Set<string>()
  for (const [i, route] of manifest.routes.entries()) {
    if (!nonEmptyString((route as any)?.path)) fail(scope, `routes[${i}].path must be a non-empty string`)
    if (typeof (route as any)?.component !== 'function') fail(scope, `routes[${i}].component must be a component`)
    if (routePaths.has((route as any).path)) fail(scope, `duplicate route path "${(route as any).path}"`)
    routePaths.add((route as any).path)
  }
  // A nav entry that links to a route the plugin doesn't declare is dead UI.
  for (const [i, nav] of manifest.navigation.entries()) {
    const r = (nav as any).route
    if (routePaths.size > 0 && !routePaths.has(r)) {
      fail(scope, `navigation[${i}].route "${r}" has no matching route in manifest.routes`)
    }
  }

  // Settings tabs (the only UI surface integrations need) must be renderable.
  const settingIds = new Set<string>()
  for (const [i, tab] of (manifest.settings ?? []).entries()) {
    if (!nonEmptyString((tab as any)?.id)) fail(scope, `settings[${i}].id must be a non-empty string`)
    if (!nonEmptyString((tab as any)?.label)) fail(scope, `settings[${i}].label must be a non-empty string`)
    if (typeof (tab as any)?.component !== 'function') fail(scope, `settings[${i}].component must be a component`)
    if (settingIds.has((tab as any).id)) fail(scope, `duplicate settings tab id "${(tab as any).id}"`)
    settingIds.add((tab as any).id)
  }

  for (const [i, feat] of (manifest.declaredFeatures ?? []).entries()) {
    if (!nonEmptyString((feat as any)?.id)) fail(scope, `declaredFeatures[${i}].id must be a non-empty string`)
  }

  // A plugin that contributes nothing mountable is almost always a mistake.
  if (manifest.navigation.length === 0 && manifest.routes.length === 0 && (manifest.settings ?? []).length === 0) {
    fail(scope, 'plugin contributes no navigation, routes, or settings — it would mount but do nothing')
  }
}

const AUTH_KINDS = new Set(['oauth', 'api-key', 'mtls'])
const DIRECTIONS = new Set(['inbound', 'outbound', 'bidirectional'])
const TRIGGERS = new Set(['on-write', 'scheduled', 'manual', 'webhook'])

/**
 * Assert an integration Connector descriptor is well-formed: identity present,
 * a known auth kind, and at least one capability with a valid direction +
 * trigger set. This is the contract a connector must satisfy BEFORE its
 * data-plane (edge function) exists — the TDD anchor for an integration.
 */
export function assertConnectorContract(connector: Connector): void {
  const scope = nonEmptyString(connector?.id) ? `connector:${connector.id}` : '<unknown connector>'
  for (const field of ['id', 'provider', 'pluginId'] as const) {
    if (!nonEmptyString(connector?.[field])) fail(scope, `connector.${field} must be a non-empty string`)
  }
  if (!AUTH_KINDS.has(connector.authKind)) fail(scope, `connector.authKind "${connector.authKind}" is not one of ${[...AUTH_KINDS].join(', ')}`)
  if (!Array.isArray(connector.capabilities) || connector.capabilities.length === 0) {
    fail(scope, 'connector.capabilities must list at least one capability')
  }
  for (const [i, cap] of connector.capabilities.entries()) {
    if (!nonEmptyString(cap?.entity)) fail(scope, `capabilities[${i}].entity must be a non-empty string`)
    if (!DIRECTIONS.has(cap.direction)) fail(scope, `capabilities[${i}].direction "${cap.direction}" is invalid`)
    if (!Array.isArray(cap.triggers) || cap.triggers.length === 0) fail(scope, `capabilities[${i}].triggers must be non-empty`)
    for (const trig of cap.triggers) {
      if (!TRIGGERS.has(trig)) fail(scope, `capabilities[${i}] has unknown trigger "${trig}"`)
    }
  }
}
