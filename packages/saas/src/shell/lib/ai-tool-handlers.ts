import { resolveDataProvider } from '@fayz-ai/core'
import type { EntityDef, OrgMember, Organization } from '@fayz-ai/core'
import type { PluginAITool, PluginRegistryDef } from '../types/plugins'
import { resolveEntityRoute } from './entity-routes'

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

/**
 * Best-effort human label for a record, used as the link text.
 * Falls back through the fields business records actually carry.
 */
function recordLabel(record: Record<string, unknown>): string | null {
  for (const key of ['name', 'full_name', 'fullName', 'title', 'label', 'email']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/**
 * A stable, channel-agnostic pointer to a record: which resource, which id.
 *
 * Deliberately *not* a URL. An address is presentation, and presentation is the
 * channel's business — the FAB resolves this against its own route map, a
 * WhatsApp thread ignores it, an email channel would resolve it against its own
 * base. Emitting a URL here would also mean whoever produced it had to know the
 * app's routing, which is how /customers got invented for an app that routes
 * /clients. When record reads move server-side for non-browser channels, Fayz
 * emits this same shape and nothing downstream changes.
 */
function recordRef(
  entity: EntityDef,
  record: Record<string, unknown>,
): RecordRef | null {
  const id = record.id
  if (typeof id !== 'string' || !id) return null
  const data = entity.data as { archetype?: string; archetypeKind?: string; table?: string } | undefined
  const resource = data?.archetypeKind ?? data?.table
  // The archetype travels with the reference because the route map is keyed on
  // "archetype:kind" — resolving from the kind alone misses every archetyped
  // entity, which is most of them.
  return resource ? { id, resource, archetype: data?.archetype } : null
}

export interface RecordRef {
  id: string
  resource: string
  archetype?: string
}

/** Resolve a record reference to an in-app path, or null if unaddressable here. */
export function resolveRecordPath(ref: RecordRef): string | null {
  const route = resolveEntityRoute(ref.archetype, ref.resource) ?? resolveEntityRoute(ref.resource)
  return route ? `${route}/${ref.id}` : null
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
    records: result.data.map((record) => {
      const row = record as unknown as Record<string, unknown>
      const ref = recordRef(target.entity, row)
      // The reference rides along so the surface can turn it into a link; the
      // model is told not to author addresses itself.
      return ref ? { ...row, ref } : row
    }),
  }
}

/** Record links surfaced by a tool result, for the surface to render. */
export interface RecordLink {
  label: string
  url: string
}

export function extractRecordLinks(serializedResult: string): RecordLink[] {
  try {
    const parsed = JSON.parse(serializedResult) as { records?: unknown }
    if (!Array.isArray(parsed.records)) return []
    return parsed.records
      .map((r) => r as Record<string, unknown> & { ref?: RecordRef })
      .flatMap((r) => {
        if (!r.ref?.id || !r.ref.resource) return []
        const url = resolveRecordPath(r.ref)
        // Unaddressable in this surface — no chip, rather than a dead one.
        if (!url) return []
        return [{ label: recordLabel(r) ?? r.ref.resource, url }]
      })
      .slice(0, 5)
  } catch {
    return []
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
  entityToolName: (entityKey: string, table?: string) => string
}): Map<string, DataToolTarget> {
  const index = new Map<string, DataToolTarget>()

  for (const [pluginId, defs] of input.registries) {
    for (const registry of defs) {
      if (registry.readOnly) continue
      index.set(input.registryToolName(pluginId, registry.id), {
        label: registry.entity.namePlural ?? registry.entity.name,
        entity: registry.entity as EntityDef,
        mockData: registry.mockData as Array<{ id: string }> | undefined,
      })
    }
  }

  for (const entity of input.entities) {
    if (!entity.entityDef) continue
    index.set(input.entityToolName(entity.entityKey, entity.entityDef?.data?.table), {
      label: entity.labelPlural,
      entity: entity.entityDef,
      mockData: entity.mockData,
    })
  }

  return index
}

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
