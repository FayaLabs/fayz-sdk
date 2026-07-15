import type { AppTemplate, Kind } from './shared.js'
import { storefrontTemplate } from './storefront.js'
import { adminTemplate } from './admin.js'
import { memberTemplate } from './member.js'

export type { AppTemplate, Kind } from './shared.js'
export { titleCase } from './shared.js'

export const KINDS: Kind[] = ['storefront', 'admin', 'member']

export const TEMPLATES: Record<Kind, AppTemplate> = {
  storefront: storefrontTemplate,
  admin: adminTemplate,
  member: memberTemplate,
}
