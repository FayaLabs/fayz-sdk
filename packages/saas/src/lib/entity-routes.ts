/**
 * Global entity route registry.
 *
 * Populated once during buildNavigation() with mappings from
 * "archetype:kind" (e.g. "person:staff") to the registered route path
 * (e.g. "/registry/staff"). Used by PersonLink, command palette, and
 * any component that needs to resolve an entity detail URL.
 *
 * An entry records whether the route can take an id: a CRUD page owns
 * `/path/:id`, a hand-built page (the agenda) only has its list.
 */

import { navigateTo } from '../app/routing'

export interface EntityRouteEntry {
  path: string
  /** The route renders `${path}/${id}` as a detail view. */
  detail: boolean
}

let routeMap = new Map<string, EntityRouteEntry>()

/** Replace the entity route map (called once at app init by buildNavigation).
 *  Accepts the legacy `Map<string, string>` shape (all detail-capable). */
export function setEntityRouteMap(map: Map<string, EntityRouteEntry | string>): void {
  const next = new Map<string, EntityRouteEntry>()
  for (const [key, value] of map) {
    next.set(key, typeof value === 'string' ? { path: value, detail: true } : value)
  }
  routeMap = next
}

function lookup(archetype?: string, kind?: string, entityKey?: string): EntityRouteEntry | null {
  if (archetype && kind) {
    const specific = routeMap.get(`${archetype}:${kind}`)
    if (specific) return specific
  }
  if (archetype) {
    const general = routeMap.get(archetype)
    if (general) return general
  }
  // The only route a non-archetype entity has — without it a plugin registry
  // is findable by search and unopenable.
  if (entityKey) {
    const byKey = routeMap.get(entityKey)
    if (byKey) return byKey
  }
  return null
}

/**
 * Resolve the route path for an entity given its archetype and kind.
 * Returns the registered path (e.g. "/registry/staff") or null if not found.
 *
 * Tries "archetype:kind", then "archetype", then the entity key.
 */
export function resolveEntityRoute(archetype?: string, kind?: string, entityKey?: string): string | null {
  return lookup(archetype, kind, entityKey)?.path ?? null
}

/** Whether the resolved route can show a single record, or only its list. */
export function entityRouteHasDetail(archetype?: string, kind?: string, entityKey?: string): boolean {
  return lookup(archetype, kind, entityKey)?.detail ?? false
}

/**
 * Build a full URL path for an entity detail page.
 * Returns e.g. "/registry/staff/uuid" or "/registry/staff/uuid/schedule".
 * Falls back to "/kind/uuid" if no route registered.
 *
 * A list-only route (a plugin page that shows these records but has no detail
 * view) returns the bare path — appending an id there is a dead end.
 */
export function resolveEntityHref(id: string, archetype?: string, kind?: string, tab?: string, entityKey?: string): string {
  const entry = lookup(archetype, kind, entityKey)
  if (entry && !entry.detail) return entry.path

  let href: string
  if (entry) {
    href = `${entry.path}/${id}`
  } else if (kind) {
    const plural = kind.endsWith('s') ? kind : kind + 's'
    href = `/${plural}/${id}`
  } else {
    href = `/${id}`
  }
  if (tab) href += `/${tab}`
  return href
}

/** The href form — hash-prefixed, because the admin is a hash router. Use this
 *  for links, `openEntity` for clicks. */
export function resolveEntityAnchor(
  id: string,
  archetype?: string,
  kind?: string,
  tab?: string,
  entityKey?: string,
): string {
  return `#${resolveEntityHref(id, archetype, kind, tab, entityKey)}`
}

/**
 * Resolve a record's URL and go there — the only way a surface should open one.
 * `resolveEntityHref` returns a plain admin path, and handing that to a generic
 * router adapter assigns `location.href`: a full page load to a URL the app does
 * not serve. The palette and the chat chips both got that wrong independently.
 */
export function openEntity(
  id: string,
  archetype?: string,
  kind?: string,
  tab?: string,
  entityKey?: string,
): void {
  navigateTo(resolveEntityHref(id, archetype, kind, tab, entityKey))
}
