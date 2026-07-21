import { resolveDataProvider } from '@fayz-ai/core'
import { checkAccess } from '../../access/headless'
import type { EntityDef, OrgMember, Organization } from '@fayz-ai/core'
import type { PluginAITool, PluginRegistryDef } from '../types/plugins'

/**
 * Client-plane execution for the AI tool catalog.
 *
 * `useAITools()` declares *what* the surface can do — it is the catalog the
 * model reasons over. This module is *how*: the browser runs the call against
 * the session that is already open (org store, data providers, router) and
 * hands a serialized result back to the agent.
 *
 * The split matters because Fayz never holds the surface's data credentials.
 * The agent broker forwards the catalog, decides which tool to call, and
 * returns the call for the surface to execute — the same contract a
 * server-side channel (WhatsApp, email) satisfies with a server-side executor.
 *
 * **A capability is only advertised if it can run.** A declared tool with no
 * executor is a promise to the model the surface cannot keep: it burns
 * reasoning rounds retrying, then apologises. `buildAgentToolset` is the gate —
 * everything it returns has a resolvable executor.
 */

/** An entity the executor can read through its own data provider. */
export interface DataToolTarget {
  label: string
  entity: EntityDef
  mockData?: Array<{ id: string }>
}

export interface AIToolExecutionContext {
  currentOrg: Organization | null
  members: OrgMember[]
  currentPath: string
  /** Pages the surface exposes, used to resolve navigation requests. */
  routes: Array<{ path: string; label?: string }>
  navigate: (path: string) => void
  /**
   * Data-backed tools, keyed by the LLM-facing tool name. These execute
   * generically through the entity's own data provider, so every registry and
   * every CRUD entity the app declares is readable without a hand-written
   * handler — which is what lets a new vertical work on day one.
   */
  dataTools: Map<string, DataToolTarget>
}

export type AIToolHandler = (
  args: Record<string, unknown>,
  context: AIToolExecutionContext,
) => unknown | Promise<unknown>

const handlers = new Map<string, AIToolHandler>()

/**
 * Register an executor for a tool, keyed by the tool's `name` (the identifier
 * the model calls, e.g. `getTeamMembers`). Plugins and apps call this to make
 * their declared `aiTools` actually runnable.
 */
export function registerAIToolHandler(name: string, handler: AIToolHandler): void {
  handlers.set(name, handler)
}

export function registerAIToolHandlers(map: Record<string, AIToolHandler>): void {
  for (const [name, handler] of Object.entries(map)) registerAIToolHandler(name, handler)
}

export function hasAIToolHandler(name: string): boolean {
  return handlers.has(name)
}

/** Rows returned per data call — enough to answer, cheap in tokens. */
const REGISTRY_PAGE_SIZE = 20

/** Beyond this the catalog costs more in tokens than it buys in capability. */
const MAX_TOOLS_PER_TURN = 24

export interface AIToolExecutionResult {
  ok: boolean
  /** JSON-serialized payload handed back to the agent. */
  content: string
}

function errorResult(error: string, message: string): AIToolExecutionResult {
  return { ok: false, content: JSON.stringify({ error, message }) }
}

async function executeDataTool(
  target: DataToolTarget,
  args: Record<string, unknown>,
): Promise<unknown> {
  const provider = resolveDataProvider(
    target.entity as EntityDef<{ id: string }>,
    target.mockData,
  )
  const result = await provider.list({
    search: typeof args.search === 'string' ? args.search : undefined,
    pageSize: REGISTRY_PAGE_SIZE,
  })
  return {
    entity: target.label,
    total: result.total,
    // Truthful cap: the model is told the list was trimmed so it can say so
    // rather than presenting one page as the whole set.
    truncated: result.total > result.data.length,
    records: result.data,
  }
}

export async function executeAITool(
  name: string,
  args: Record<string, unknown>,
  context: AIToolExecutionContext,
): Promise<AIToolExecutionResult> {
  const handler = handlers.get(name)
  const dataTarget = context.dataTools.get(name)

  if (!handler && !dataTarget) {
    return errorResult(
      'not_executable',
      `The tool "${name}" is not available here. Do not retry it — tell the user what you cannot do, or use a different tool.`,
    )
  }

  try {
    const result = handler
      ? await handler(args, context)
      : await executeDataTool(dataTarget!, args)
    return { ok: true, content: JSON.stringify(result ?? { ok: true }) }
  } catch (error) {
    return errorResult(
      'execution_failed',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
}

/**
 * Index everything readable by the tool name its generator mints, so the
 * executor can find the entity behind a call. Covers plugin registries and the
 * app's own CRUD entities.
 */
export function buildDataToolIndex(input: {
  registries: Map<string, PluginRegistryDef[]>
  entities: Array<{ entityKey: string; labelPlural: string; entityDef?: EntityDef; mockData?: Array<{ id: string }> }>
  registryToolName: (pluginId: string, registryId: string) => string
  entityToolName: (entityKey: string) => string
  queryEntities?: Array<{ key: string; entity: EntityDef }>
}): Map<string, DataToolTarget> {
  const index = new Map<string, DataToolTarget>()

  for (const [pluginId, defs] of input.registries) {
    for (const registry of defs) {
      if (registry.readOnly) continue
      const target = {
        label: registry.entity.namePlural ?? registry.entity.name,
        entity: registry.entity as EntityDef,
        mockData: registry.mockData as Array<{ id: string }> | undefined,
      }
      index.set(input.registryToolName(pluginId, registry.id), target)
      // Key-indexed twin: the data primitives (searchRecords/queryData) receive
      // the TARGET as an argument instead of minting one tool per entity.
      index.set(`key:${pluginId}:${registry.id}`, target)
    }
  }

  for (const entity of input.entities) {
    if (!entity.entityDef) continue
    const target = {
      label: entity.labelPlural,
      entity: entity.entityDef,
      mockData: entity.mockData,
    }
    index.set(input.entityToolName(entity.entityKey), target)
    index.set(`key:${entity.entityKey}`, target)
  }

  for (const q of input.queryEntities ?? []) {
    index.set(`key:${q.key}`, {
      label: q.entity.namePlural ?? q.entity.name,
      entity: q.entity,
    })
  }

  return index
}

// ---------------------------------------------------------------------------
// Generic data primitives — ONE search + ONE aggregate over ANY entity. The
// target's own read permission (EntityDef.permission) is checked per call, so
// consolidating the catalog never widens access: the same role×plan engine
// that gated the per-entity tools gates the parameterized target.
// ---------------------------------------------------------------------------

function resolveKeyedTarget(
  ctx: AIToolExecutionContext,
  args: Record<string, unknown>,
): { target: DataToolTarget } | { error: unknown } {
  const key = typeof args.entity === 'string' ? args.entity : ''
  const target = ctx.dataTools.get(`key:${key}`)
  if (!target) {
    return {
      error: {
        error: 'unknown_entity',
        message: `No entity "${key}" is available. Use one of the keys listed in the tool description.`,
      },
    }
  }
  const permission = target.entity.permission
  if (permission) {
    const access = checkAccess(permission.feature, permission.action)
    if (!access.allowed) return { error: access }
  }
  return { target }
}

registerAIToolHandler('searchRecords', async (args, ctx) => {
  const resolved = resolveKeyedTarget(ctx, args)
  if ('error' in resolved) return resolved.error
  return executeDataTool(resolved.target, args)
})

registerAIToolHandler('queryData', async (args, ctx) => {
  const resolved = resolveKeyedTarget(ctx, args)
  if ('error' in resolved) return resolved.error
  const { target } = resolved

  const metric = args.metric === 'sum' || args.metric === 'avg' ? args.metric : 'count'
  const field = typeof args.field === 'string' ? args.field : undefined
  if (metric !== 'count' && !field) {
    return { error: 'missing_field', message: `metric "${metric}" needs a "field" to aggregate.` }
  }

  const provider = resolveDataProvider(
    target.entity as EntityDef<{ id: string }>,
    target.mockData,
  )
  // v1 samples up to 1000 rows through the provider (which owns tenant scoping
  // and column mapping) and aggregates here; `sampled` is set when the window
  // truncated. The S4 server-plane executor replaces this with exact SQL.
  const page = await provider.list({ pageSize: 1000 })
  let rows = page.data as Array<Record<string, unknown>>

  const dateField = typeof args.dateField === 'string' ? args.dateField : 'created_at'
  const from = typeof args.from === 'string' ? Date.parse(args.from) : NaN
  const to = typeof args.to === 'string' ? Date.parse(args.to) : NaN
  if (!Number.isNaN(from) || !Number.isNaN(to)) {
    rows = rows.filter((r) => {
      const raw = r[dateField]
      const ts = typeof raw === 'string' || typeof raw === 'number' ? Date.parse(String(raw)) : NaN
      if (Number.isNaN(ts)) return false
      if (!Number.isNaN(from) && ts < from) return false
      if (!Number.isNaN(to) && ts > to) return false
      return true
    })
  }
  const filters = (args.filters ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(filters)) {
    rows = rows.filter((r) => String(r[k] ?? '') === String(v))
  }

  const aggregate = (subset: Array<Record<string, unknown>>) => {
    if (metric === 'count') return subset.length
    const values = subset
      .map((r) => Number(r[field!]))
      .filter((n) => !Number.isNaN(n))
    const sum = values.reduce((a, b) => a + b, 0)
    if (metric === 'sum') return Math.round(sum * 100) / 100
    return values.length ? Math.round((sum / values.length) * 100) / 100 : 0
  }

  const groupBy = typeof args.groupBy === 'string' ? args.groupBy : undefined
  const sampled = page.total > page.data.length
  if (groupBy) {
    const groups = new Map<string, Array<Record<string, unknown>>>()
    for (const r of rows) {
      const g = String(r[groupBy] ?? '—')
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(r)
    }
    return {
      entity: target.label,
      metric,
      ...(field ? { field } : {}),
      groupBy,
      groups: Array.from(groups.entries())
        .map(([group, subset]) => ({ group, value: aggregate(subset), rows: subset.length }))
        .sort((a, b) => Number(b.value) - Number(a.value)),
      matchedRows: rows.length,
      sampled,
    }
  }
  return {
    entity: target.label,
    metric,
    ...(field ? { field } : {}),
    value: aggregate(rows),
    matchedRows: rows.length,
    sampled,
  }
})

export interface AgentTool {
  name: string
  description: string
  parameters?: Record<string, unknown>
}

export interface BuildToolsetOptions {
  dataTools: Map<string, DataToolTarget>
  /** Plugin owning the current route; its tools rank ahead of the rest. */
  activePluginId?: string | null
  maxTools?: number
}

/**
 * Shape the declared catalog into the toolset sent to the agent.
 *
 * Two filters, both load-bearing:
 *
 * 1. *Executable only.* An advertised tool with no executor is worse than a
 *    missing one — the model spends rounds on it and then apologises.
 * 2. *Contextual.* A mature app declares ~40 tools; sending all of them every
 *    turn costs input tokens on every request and degrades which tool the model
 *    picks. Tools owned by the plugin the user is currently looking at come
 *    first, then the rest, capped.
 */
export function buildAgentToolset(
  tools: PluginAITool[],
  { dataTools, activePluginId, maxTools = MAX_TOOLS_PER_TURN }: BuildToolsetOptions,
): AgentTool[] {
  const executable = tools.filter((t) => handlers.has(t.name) || dataTools.has(t.name))

  const ranked = activePluginId
    ? [
        ...executable.filter((t) => t.id.startsWith(`${activePluginId}.`)),
        ...executable.filter((t) => !t.id.startsWith(`${activePluginId}.`)),
      ]
    : executable

  return ranked.slice(0, maxTools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as Record<string, unknown> | undefined,
  }))
}

// ---------------------------------------------------------------------------
// Core handlers — the executable counterpart of `coreAITools`.
// ---------------------------------------------------------------------------

registerAIToolHandler('getBusinessSummary', (_args, ctx) => {
  if (!ctx.currentOrg) return { error: 'no_active_business' }
  const org = ctx.currentOrg as Organization & { plan?: string; verticalId?: string }
  return {
    name: org.name,
    slug: org.slug,
    plan: org.plan ?? null,
    vertical: org.verticalId ?? null,
    teamSize: ctx.members.length,
    createdAt: org.createdAt ?? null,
  }
})

registerAIToolHandler('getTeamMembers', (args, ctx) => {
  const role = typeof args.role === 'string' ? args.role.toLowerCase() : undefined
  const members = ctx.members
    .map((m) => m as OrgMember & { role?: string; status?: string })
    .filter((m) => !role || String(m.role ?? '').toLowerCase() === role)
    .map((m) => ({
      name: m.profileName ?? m.user?.fullName ?? null,
      email: m.user?.email ?? null,
      role: m.role ?? null,
      status: m.status ?? null,
    }))
  return { total: members.length, members }
})

registerAIToolHandler('navigateTo', (args, ctx) => {
  const query = typeof args.page === 'string' ? args.page.trim().toLowerCase() : ''
  if (!query) return { error: 'missing_page' }

  const match =
    ctx.routes.find((r) => r.path.toLowerCase() === query || r.path.toLowerCase() === `/${query}`) ??
    ctx.routes.find((r) => (r.label ?? '').toLowerCase() === query) ??
    ctx.routes.find((r) => r.path.toLowerCase().includes(query) || (r.label ?? '').toLowerCase().includes(query))

  if (!match) {
    return {
      error: 'page_not_found',
      availablePages: ctx.routes.map((r) => r.label ?? r.path),
    }
  }

  ctx.navigate(match.path)
  return { navigatedTo: match.path, label: match.label ?? match.path }
})
