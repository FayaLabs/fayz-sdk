/**
 * Global entity route registry.
 *
 * Populated once during buildNavigation() with mappings from
 * "archetype:kind" (e.g. "person:staff") to the registered route path
 * (e.g. "/registry/staff"). Used by PersonLink, command palette, and
 * any component that needs to resolve an entity detail URL.
 */

let routeMap = new Map<string, string>()

/** Replace the entity route map (called once at app init by buildNavigation). */
export function setEntityRouteMap(map: Map<string, string>): void {
  routeMap = map
}

/**
 * Resolve the route path for an entity given its archetype and kind.
 * Returns the registered path (e.g. "/registry/staff") or null if not found.
 *
 * Tries "archetype:kind" first, then "archetype" alone.
 */
export function resolveEntityRoute(archetype?: string, kind?: string): string | null {
  if (archetype && kind) {
    const specific = routeMap.get(`${archetype}:${kind}`)
    if (specific) return specific
  }
  if (archetype) {
    const general = routeMap.get(archetype)
    if (general) return general
  }
  return null
}

/**
 * Build a full URL path for an entity detail page.
 * Returns e.g. "/registry/staff/uuid" or "/registry/staff/uuid/schedule".
 * Falls back to "/kind/uuid" if no route registered.
 */
export function resolveEntityHref(id: string, archetype?: string, kind?: string, tab?: string): string {
  const route = resolveEntityRoute(archetype, kind)
  let href: string
  if (route) {
    href = `${route}/${id}`
  } else if (kind) {
    const plural = kind.endsWith('s') ? kind : kind + 's'
    href = `/${plural}/${id}`
  } else {
    href = `/${id}`
  }
  if (tab) href += `/${tab}`
  return href
}
