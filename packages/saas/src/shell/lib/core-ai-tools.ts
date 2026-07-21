import type { PluginAITool, PluginRegistryDef } from '../types/plugins'
import { getAllEntities, type RegisteredEntity } from '@fayz-ai/core'

/**
 * Core SaaS-level AI tools — always available, no plugin required.
 */
export const coreAITools: PluginAITool[] = [
  {
    id: 'core.business-summary',
    name: 'getBusinessSummary',
    description: 'Returns a summary of the current business: name, plan, vertical, team size, and key metrics.',
    icon: 'Building2',
    mode: 'read',
    parameters: { type: 'object', properties: {}, required: [] },
    category: 'Core',
    suggestions: [
      { label: "How's my business doing today?" },
    ],
  },
  {
    id: 'core.team-members',
    name: 'getTeamMembers',
    description: 'Lists the WORKSPACE USERS (people with a login) and their roles. This is NOT the professionals/staff registry — for professionals, stylists or other staff the business manages as records, use the staff/people search tools instead.',
    icon: 'Users',
    mode: 'read',
    parameters: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'Filter by role: owner, admin, manager, staff, viewer' },
      },
    },
    permission: { feature: 'team', action: 'read' },
    category: 'Core',
    suggestions: [
      { label: 'Who is on my team?' },
    ],
  },
  {
    id: 'core.navigate',
    name: 'navigateTo',
    description: 'Helps the user find and navigate to a specific page or feature in the app.',
    icon: 'Compass',
    mode: 'read',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'string', description: 'Page name or feature the user is looking for' },
      },
      required: ['page'],
    },
    category: 'Core',
  },
]

/**
 * Builds the LLM-facing function name for a registry tool.
 *
 * Derived from the registry id, never from the entity's display label: the
 * label is translated, so a pt-BR app would mint `listCategoriasdeServiço` —
 * which both violates the provider's `^[a-zA-Z0-9_-]+$` function-name rule and
 * renames the tool whenever the user switches locale. The id is a stable ASCII
 * slug. The human plural still drives the description, which is what the model
 * actually reads to decide when to call it.
 */
function pascalCase(value: string): string {
  // Transliterate diacritics BEFORE splitting: splitting on [^a-zA-Z0-9]
  // treated an accent as a word boundary and dropped it mid-word — "Serviço"
  // became "ServiO" and "Preço de Serviço" became "PreODeServiO", which both
  // renames tools per locale and can trip the broker's ^[a-zA-Z0-9_-]+$ rule.
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

export function registryToolName(pluginId: string, registryId: string): string {
  // Namespaced by plugin because registry ids only need to be unique within
  // their own plugin — `crm` and `inventory` can both ship a `tags` registry,
  // and two tools sharing a function name is ambiguous to the model.
  return `list${pascalCase(pluginId)}${pascalCase(registryId)}`
}

/**
 * Auto-generates read tools from plugin registry definitions.
 * Each registry gets a basic "list" tool so plugins get AI capabilities for free.
 */
export function generateRegistryTools(pluginId: string, registries: PluginRegistryDef[]): PluginAITool[] {
  return registries
    .filter((r) => !r.readOnly)
    .map((registry) => {
      const plural = registry.entity.namePlural ?? `${registry.entity.name}s`
      return {
        id: `${pluginId}.list-${registry.id}`,
        name: registryToolName(pluginId, registry.id),
        description: `Lists all ${plural.toLowerCase()} for the current business.`,
        icon: registry.icon ?? registry.entity.icon,
        mode: 'read' as const,
        parameters: {
          type: 'object' as const,
          properties: {
            search: { type: 'string' as const, description: 'Search text' },
          },
        },
        category: pluginId.charAt(0).toUpperCase() + pluginId.slice(1),
      }
    })
}

/**
 * Formats a tool as a function signature: e.g. "getRevenue(period?)"
 */
export function formatToolSignature(tool: PluginAITool): string {
  const params = tool.parameters?.properties
    ? Object.entries(tool.parameters.properties)
        .map(([key]) => tool.parameters?.required?.includes(key) ? key : `${key}?`)
        .join(', ')
    : ''
  return `${tool.name}(${params})`
}

export function entityToolName(entityKey: string): string {
  return `search${pascalCase(entityKey)}`
}

/**
 * Auto-generates a search tool for every entity the app exposes as a CRUD page.
 *
 * Registries cover a plugin's auxiliary tables; these are the entities the
 * business actually talks about — clients, appointments, services. Deriving
 * them from the entity registry is what makes the agent useful in a new vertical
 * without anyone hand-writing tools: whatever the app declares, the agent can
 * read.
 */
export function generateEntityTools(entities: RegisteredEntity[] = getAllEntities()): PluginAITool[] {
  return entities
    .filter((e) => !!e.entityDef)
    .map((entity) => ({
      id: `entity.${entity.entityKey}`,
      name: entityToolName(entity.entityKey),
      description: `Searches ${entity.labelPlural.toLowerCase()} and returns matching records with their fields. Use this to answer questions about a specific ${entity.label.toLowerCase()} or to count them.`,
      icon: entity.icon,
      mode: 'read' as const,
      parameters: {
        type: 'object' as const,
        properties: {
          search: {
            type: 'string' as const,
            description: `Name or text to match. Omit to list recent ${entity.labelPlural.toLowerCase()}.`,
          },
        },
      },
      category: 'Data',
    }))
}
