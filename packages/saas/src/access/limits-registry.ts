import type { LimitDeclaration, RegisteredEntity } from '@fayz-ai/core'
import { invalidateCount } from '@fayz-ai/core'

/**
 * Module-level registry bridging React (the provider that knows the declarations)
 * and the plain `invalidateLimit(key)` function that create handlers call outside
 * any component. The AccessProvider publishes the merged declarations here on
 * mount; `useLimit`/`useLimitGuard` and `invalidateLimit` read from it.
 */

/**
 * Shell built-in limit declarations. Unlike plugin/app limits (contributed via
 * `PluginManifest.declaredLimits` / `billing.limitDeclarations`), these count
 * core tenant tables that have no owning plugin: seats (`tenant_members`) and
 * `locations`. Merged as the LOWEST-priority layer by the AccessProvider, so a
 * plugin or app may still override a key (e.g. add a `kindFilter`).
 */
export const CORE_LIMIT_DECLARATIONS: LimitDeclaration[] = [
  { key: 'users', label: 'Users', table: 'tenant_members' },
  { key: 'locations', label: 'Locations', table: 'locations' },
]

/**
 * Entity-derived layer of the limit merge: any registered CRUD entity carrying
 * `limitKey` yields a declaration for free from its own data mapping (table +
 * archetype kind) — a cap without a countable binding is a dead cap. Shared by
 * the AccessProvider (live registry) and the manifest derivation (agent
 * contract), so both resolve the identical layer.
 */
export function entityDerivedLimitDeclarations(entities: RegisteredEntity[]): LimitDeclaration[] {
  const out: LimitDeclaration[] = []
  for (const e of entities) {
    const def = e.entityDef
    if (def?.limitKey && def.data?.table) {
      out.push({
        key: def.limitKey,
        label: e.labelPlural,
        table: def.data.table,
        kindFilter: def.data.archetypeKind,
      })
    }
  }
  return out
}

let registry = new Map<string, LimitDeclaration>()

/** Called by AccessProvider whenever the merged limit declarations change. */
export function setLimitRegistry(declarations: LimitDeclaration[]): void {
  const next = new Map<string, LimitDeclaration>()
  for (const decl of declarations) next.set(decl.key, decl)
  registry = next
}

export function getLimitDeclaration(key: string): LimitDeclaration | undefined {
  return registry.get(key)
}

// --- Invalidation pub/sub -------------------------------------------------
// useLimit subscribes per key; invalidateLimit(key) drops the cached count for
// the declaration's table and notifies subscribers to re-fetch.

const listeners = new Map<string, Set<() => void>>()

export function subscribeLimit(key: string, cb: () => void): () => void {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(cb)
  return () => {
    set?.delete(cb)
    if (set && set.size === 0) listeners.delete(key)
  }
}

/**
 * Invalidate a limit after a create/delete so its next read is fresh, then wake
 * any mounted `useLimit(key)`. Safe to call from plain handlers (no React).
 */
export function invalidateLimit(key: string): void {
  const decl = registry.get(key)
  if (decl) invalidateCount(decl.table)
  listeners.get(key)?.forEach((cb) => cb())
}
