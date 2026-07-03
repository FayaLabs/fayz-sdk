import type {
  StorefrontConfig,
  StorefrontRouteDefinition,
} from './config'
import type { StorefrontComponents } from './component-contracts'
import type { StorefrontSection } from './sections'
import type { CreateStorefrontOptions } from './createStorefrontApp'

/**
 * Identity helpers for generated/custom storefronts.
 *
 * They do not add runtime behavior; they make the intended client-app shape
 * explicit and keep TypeScript inference tight across config, components, routes,
 * sections and app creation options.
 */
export function defineStorefrontConfig<const T extends StorefrontConfig>(config: T): T {
  return config
}

export function defineStorefrontComponents<const T extends StorefrontComponents>(components: T): T {
  return components
}

export function defineStorefrontRoutes<const T extends readonly StorefrontRouteDefinition[]>(routes: T): T {
  return routes
}

export function defineStorefrontSections<const T extends readonly StorefrontSection[]>(sections: T): T {
  return sections
}

export function defineStorefrontApp<const T extends CreateStorefrontOptions>(options: T): T {
  return options
}
