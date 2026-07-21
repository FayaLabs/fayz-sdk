import type {
  AgentContract,
  AIToolContract,
  EntityContract,
  EntityDef,
  FeatureDeclaration,
  LimitDeclaration,
  PluginAITool,
  PluginManifest,
  RegisteredEntity,
} from '@fayz-ai/core'
import { getAllEntities, deriveEntityKey } from '@fayz-ai/core'
import { mergeLimitDeclarations } from '@fayz-ai/core/access'
import {
  coreAITools,
  generateEntityTools,
  generateRegistryTools,
} from '../shell/lib/core-ai-tools'
import { CORE_LIMIT_DECLARATIONS, entityDerivedLimitDeclarations } from './../access/limits-registry'
import type { FayzAppConfig } from './config'

// ---------------------------------------------------------------------------
// deriveAgentContract — FayzAppConfig → the manifest v3 `agent` section +
// resolved `limitDeclarations`. This is the "capabilities are derived, never
// configured" principle applied to the server side: everything the Fayz broker
// needs to operate the app without a browser is PROJECTED from what the app
// already declares (entities, plugins, permissions, billing), never re-typed.
// Pure data out — safe to run at defineSaas time and in `fayz manifest emit`.
// ---------------------------------------------------------------------------

function projectEntity(key: string, label: string, labelPlural: string | undefined, def: EntityDef): EntityContract | null {
  const data = def.data
  if (!data?.table) return null
  return {
    key,
    label,
    ...(labelPlural ? { labelPlural } : {}),
    ...(def.limitKey ? { limitKey: def.limitKey } : {}),
    data: {
      table: data.table,
      ...(data.schema ? { schema: data.schema } : {}),
      ...(data.tenantScoped !== undefined ? { tenantScoped: data.tenantScoped } : {}),
      ...(data.tenantIdColumn ? { tenantIdColumn: data.tenantIdColumn } : {}),
      ...(data.searchColumns ? { searchColumns: data.searchColumns } : {}),
      ...(data.selectColumns ? { selectColumns: data.selectColumns } : {}),
      ...(data.columnMap ? { columnMap: data.columnMap } : {}),
      ...(data.archetype ? { archetype: data.archetype } : {}),
      ...(data.archetypeKind ? { archetypeKind: data.archetypeKind } : {}),
      ...(data.filters ? { filters: data.filters } : {}),
    },
    fields: (def.fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      ...(f.required ? { required: true } : {}),
      ...(f.searchable ? { searchable: true } : {}),
      ...(Array.isArray(f.options) && f.options.length
        ? { options: f.options.map((o) => (typeof o === 'string' ? o : o.value)) }
        : {}),
      ...(f.relation?.table ? { relationTable: f.relation.table } : {}),
    })),
  }
}

function projectTool(tool: PluginAITool, pluginId?: string): AIToolContract {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    mode: tool.mode,
    ...(tool.parameters ? { parameters: tool.parameters } : {}),
    ...(tool.permission ? { permission: tool.permission } : {}),
    ...(tool.limitKey ? { limitKey: tool.limitKey } : {}),
    ...(tool.execution ? { execution: tool.execution } : {}),
    // Persist tools default to human confirmation — an agent never clicks a
    // gated button, so the contract is where the guard is declared.
    ...(tool.mode === 'persist' ? { requiresConfirmation: tool.requiresConfirmation ?? true } : {}),
    ...(pluginId ? { pluginId } : {}),
    ...(tool.category ? { category: tool.category } : {}),
  }
}

/** Merge plugin-declared features with the app's own, app wins by id — the
 *  same rule PermissionsProvider applies to the live matrix. */
function mergeFeatureDeclarations(
  plugins: PluginManifest[],
  appFeatures: FeatureDeclaration[] | undefined,
): FeatureDeclaration[] {
  const byId = new Map<string, FeatureDeclaration>()
  for (const plugin of plugins) {
    for (const f of plugin.declaredFeatures ?? []) byId.set(f.id, f)
  }
  for (const f of appFeatures ?? []) byId.set(f.id, f)
  return Array.from(byId.values())
}

export interface DerivedAgentSections {
  agent: AgentContract
  limitDeclarations: LimitDeclaration[]
}

export function deriveAgentContract(
  config: FayzAppConfig,
  entities: RegisteredEntity[] = getAllEntities(),
): DerivedAgentSections {
  const plugins = config.plugins ?? []

  // --- Entities: registered CRUD entities + plugin registry entities --------
  const entityContracts: EntityContract[] = []
  for (const e of entities) {
    if (!e.entityDef) continue
    const projected = projectEntity(e.entityKey, e.label, e.labelPlural, e.entityDef)
    if (projected) entityContracts.push(projected)
  }
  const registries: NonNullable<AgentContract['registries']> = []
  for (const plugin of plugins) {
    for (const registry of plugin.registries ?? []) {
      const entityKey = `${plugin.id}:${registry.id}`
      registries.push({
        pluginId: plugin.id,
        id: registry.id,
        entityKey,
        ...(registry.readOnly ? { readOnly: true } : {}),
      })
      const projected = projectEntity(
        entityKey,
        registry.entity.name,
        registry.entity.namePlural,
        registry.entity,
      )
      if (projected) entityContracts.push(projected)
    }
  }

  // --- Tools: core + derived reads + plugin-declared --------------------------
  const tools: AIToolContract[] = []
  // Core handlers run in the surface (org store / router) — client plane.
  for (const tool of coreAITools) {
    tools.push({ ...projectTool(tool), execution: { plane: 'client' } })
  }
  // Derived entity searches — the generic server-side read covers them.
  // (generateEntityTools mints ids as `entity.<entityKey>`.)
  for (const tool of generateEntityTools(entities)) {
    const entityKey = tool.id.replace(/^entity\./, '')
    tools.push({ ...projectTool(tool), execution: { plane: 'server', kind: 'entity_read', entity: entityKey } })
  }
  // Derived registry lists — same server-side read against the registry entity.
  // (generateRegistryTools mints ids as `<pluginId>.list-<registryId>` and
  // skips readOnly registries, mirroring the live catalog.)
  for (const plugin of plugins) {
    if (!plugin.registries?.length) continue
    for (const tool of generateRegistryTools(plugin.id, plugin.registries)) {
      const registryId = tool.id.slice(`${plugin.id}.list-`.length)
      tools.push({
        ...projectTool(tool, plugin.id),
        execution: { plane: 'server', kind: 'entity_read', entity: `${plugin.id}:${registryId}` },
      })
    }
  }
  // Plugin-authored tools keep their declared execution (persist tools bind to
  // RPCs via `execution: { kind:'rpc' }`; absent ⇒ client-plane executor).
  for (const plugin of plugins) {
    for (const tool of plugin.aiTools ?? []) {
      tools.push(projectTool(tool, plugin.id))
    }
  }

  // --- Limits: the same 4-layer merge the AccessProvider publishes ----------
  const limitDeclarations = mergeLimitDeclarations(
    CORE_LIMIT_DECLARATIONS,
    entityDerivedLimitDeclarations(entities),
    plugins.flatMap((p) => p.declaredLimits ?? []),
    config.billing?.limitDeclarations,
  )

  // --- RPCs: plugin-shipped + app-shipped ------------------------------------
  const rpcs = [
    ...plugins.flatMap((p) => p.declaredRpcs ?? []),
    ...(config.agentContract?.rpcs ?? []),
  ]

  const agent: AgentContract = {
    ...(config.chat?.title || config.chat?.systemPrompt
      ? {
          persona: {
            ...(config.chat.title ? { name: config.chat.title } : {}),
            ...(config.chat.systemPrompt ? { systemPrompt: config.chat.systemPrompt } : {}),
          },
        }
      : {}),
    executionPlane: config.agentContract?.executionPlane ?? 'client',
    entities: entityContracts,
    tools,
    ...(registries.length ? { registries } : {}),
    declaredFeatures: mergeFeatureDeclarations(plugins, config.permissions?.features),
    ...(rpcs.length ? { rpcs } : {}),
    ...(config.agentContract?.knowledge ? { domainKnowledge: config.agentContract.knowledge } : {}),
  }

  return { agent, limitDeclarations }
}
