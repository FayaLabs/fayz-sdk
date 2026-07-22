import type { PluginAITool, PluginRegistryDef } from '../types/plugins'
import type { EntityDef } from '@fayz-ai/core'
import { getAllEntities, type RegisteredEntity } from '@fayz-ai/core'
import { CORE_QUERY_ENTITIES } from '../../app/core-entities'

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
/**
 * The TWO generic data primitives that replace the per-entity/per-registry
 * generated tools (43 searches → 2 tools): the model picks the TARGET as a
 * parameter (closed enum), and the executor checks the target entity's OWN
 * read permission at call time — one tool, per-user access preserved.
 */
/**
 * Sentences describing entities that ATTACH to another record instead of
 * standing alone. Appended to createRecord's description so the relationship is
 * stated once, up front, rather than discovered through a failed write.
 * Only entities actually present in this app's catalog are mentioned.
 */
function attachedRecordGuidance(writableKeys: string[]): string {
  const hints = CORE_QUERY_ENTITIES
    .filter((q) => q.agentHint && writableKeys.includes(q.key))
    .map((q) => q.agentHint as string)
  return hints.length ? ` Records that attach to another record: ${hints.join(' ')}` : ''
}

export function buildDataPrimitiveTools(input: {
  entities: RegisteredEntity[]
  registries: Map<string, PluginRegistryDef[]>
  queryEntities?: Array<{ key: string; entity: EntityDef; writable?: boolean }>
}): PluginAITool[] {
  const options: Array<{ key: string; label: string }> = []
  for (const e of input.entities) {
    if (e.entityDef && !e.entityDef.agentHidden) options.push({ key: e.entityKey, label: e.labelPlural })
  }
  for (const [pluginId, defs] of input.registries) {
    for (const registry of defs) {
      if (registry.readOnly) continue
      options.push({
        key: `${pluginId}:${registry.id}`,
        label: registry.entity.namePlural ?? registry.entity.name,
      })
    }
  }
  // Read-models are readable; base-table ones may opt into writes.
  const writableKeys = options.map((o) => o.key)
  // CORE_QUERY_ENTITIES is merged HERE, not at each call site: the primitives
  // are built from three different places (deriveAgentContract, useAITools and
  // the conversational e2e harness), and a spine entity added to only some of
  // them is a catalog that disagrees with itself.
  for (const q of [...(input.queryEntities ?? []), ...CORE_QUERY_ENTITIES]) {
    options.push({ key: q.key, label: q.entity.namePlural ?? q.entity.name })
    if (q.writable) writableKeys.push(q.key)
  }
  if (!options.length) return []
  const keys = options.map((o) => o.key)
  const catalogLine = options.map((o) => `${o.key} (${o.label.toLowerCase()})`).join(', ')

  return [
    {
      id: 'data.find-anything',
      name: 'findAnything',
      description:
        'Global search (like the app command center): looks a name/text up across ALL record types the user may see at once and returns grouped matches. Use this FIRST whenever you do not know what kind of record a name refers to ("quem é X?", "o que é Y?") — then drill down with searchRecords.' +
        ' It matches TEXT INSIDE each record, so records attached to a person are never returned by that person\'s name — reaching them takes a second searchRecords call filtered by owner_id.' +
        attachedRecordGuidance(keys),
      icon: 'Command',
      mode: 'read',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Name or text to look up everywhere.' },
        },
        required: ['search'],
      },
      category: 'Data',
      suggestions: [{ label: 'Quem é …?' }],
    },
    ...(writableKeys.length
      ? [
          {
            id: 'data.create-record',
            name: 'createRecord',
            description:
              'Creates ONE new record of an entity (client, service, supplier, …). ALWAYS search first to avoid duplicates. Field keys and required fields come from the entity — on a field error the response lists the valid fields; fix and retry. The user will confirm before anything is written.' +
              attachedRecordGuidance(writableKeys),
            icon: 'Plus',
            mode: 'persist' as const,
            // The handler orchestrates its own guard chain (permission → plan
            // cap → confirmation → create) because the target is dynamic.
            requiresConfirmation: false,
            parameters: {
              type: 'object' as const,
              properties: {
                entity: { type: 'string' as const, description: 'Which entity to create', enum: writableKeys },
                values: { type: 'object' as const, description: 'Field values for the new record, e.g. {"name":"…","phone":"…"}' },
              },
              required: ['entity', 'values'],
            },
            category: 'Data',
          } satisfies PluginAITool,
        ]
      : []),
    ...(writableKeys.length
      ? [
          {
            id: 'data.update-record',
            name: 'updateRecord',
            description:
              'Updates fields on an EXISTING record (add an email, fix a phone, change a name…). Use the record id already known from this conversation or from a search. Only send the fields being changed. The user confirms before anything is written.',
            icon: 'Pencil',
            mode: 'persist' as const,
            requiresConfirmation: false,
            parameters: {
              type: 'object' as const,
              properties: {
                entity: { type: 'string' as const, description: 'Which entity the record belongs to', enum: writableKeys },
                id: { type: 'string' as const, description: 'Id of the record to update' },
                values: { type: 'object' as const, description: 'Only the fields to change, e.g. {"email":"…"}' },
              },
              required: ['entity', 'id', 'values'],
            },
            category: 'Data',
          } satisfies PluginAITool,
        ]
      : []),
    {
      id: 'data.search-records',
      name: 'searchRecords',
      description: `Searches or lists records of ONE entity and returns matching rows with their fields. Use \`search\` for names/text and \`filters\` for exact field values (e.g. {"status":"open"}) — never put a status word in search. Entities: ${catalogLine}.${attachedRecordGuidance(keys)}`,
      icon: 'Search',
      mode: 'read',
      parameters: {
        type: 'object',
        properties: {
          entity: { type: 'string', description: 'Which entity to search', enum: keys },
          search: { type: 'string', description: 'Name or text to match. Omit to list recent records.' },
          filters: { type: 'object', description: 'Optional exact-value filters {field: value}, e.g. {"status":"open"}.' },
          orderBy: { type: 'string', description: 'Field to sort by (e.g. startsAt for "next/upcoming" questions).' },
          direction: { type: 'string', description: 'Sort direction', enum: ['asc', 'desc'] },
        },
        required: ['entity'],
      },
      category: 'Data',
    },
    {
      id: 'data.query-data',
      name: 'queryData',
      description: `Aggregates over ONE entity: count, sum or avg of a field, with optional date range, equality filters and a group-by. Use for analytical questions (revenue this week, new clients this month, busiest professional). Entities: ${catalogLine}.`,
      icon: 'Sigma',
      mode: 'read',
      parameters: {
        type: 'object',
        properties: {
          entity: { type: 'string', description: 'Which entity to aggregate', enum: keys },
          metric: { type: 'string', description: 'Aggregation', enum: ['count', 'sum', 'avg'] },
          field: { type: 'string', description: 'Field to sum/avg (record field name). Ignored for count.' },
          dateField: { type: 'string', description: "Date field to range-filter (default 'created_at')." },
          from: { type: 'string', description: 'ISO date/datetime lower bound (inclusive).' },
          to: { type: 'string', description: 'ISO date/datetime upper bound (inclusive).' },
          groupBy: { type: 'string', description: 'Optional field to group results by.' },
          filters: { type: 'object', description: 'Optional equality filters {field: value}.' },
        },
        required: ['entity', 'metric'],
      },
      category: 'Data',
    },
  ]
}

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
