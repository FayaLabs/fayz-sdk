import type { PluginAITool, PluginRegistryDef } from '../types/plugins'

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
    description: 'Lists team members for the current tenant with their roles and status.',
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
        name: `list${plural.replace(/\s+/g, '')}`,
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
