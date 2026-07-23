import { resolveDataProvider, getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import { checkAccess, guardLimit } from '../../access/headless'
import { invalidateLimit } from '../../access/limits-registry'
import { CORE_QUERY_ENTITIES } from '../../app/core-entities'
import { useChatStore } from '../stores/chat.store'

/** Chat-store confirmation gate, callable from any handler. */
function requestChatConfirmation(action: {
  id: string
  toolName: string
  title: string
  params: Record<string, unknown>
  plane: 'client' | 'server'
}): Promise<boolean> {
  return useChatStore.getState().requestConfirmation(action)
}
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
  /** Read-model (view/ledger): searchable/queryable but never writable. */
  readOnly?: boolean
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

/** The documented contract: every returned record carries a semantic ref
 *  {id, resource, archetype} the surface can resolve to ITS OWN route — never
 *  a URL (agents.md: presentation stays client knowledge). */
function attachRefs(
  entity: EntityDef,
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const archetype = entity.data?.archetype
  if (!archetype) return rows
  const kind = entity.data?.archetypeKind
  return rows.map((r) =>
    r.id
      ? { ...r, ref: { id: r.id, resource: entity.data?.table, archetype: kind ? `${archetype}:${kind}` : archetype } }
      : r,
  )
}

function rowContainsText(row: Record<string, unknown>, needle: string): boolean {
  const n = needle.toLowerCase()
  return Object.values(row).some((v) => typeof v === 'string' && v.toLowerCase().includes(n))
}

async function executeDataTool(
  target: DataToolTarget,
  args: Record<string, unknown>,
): Promise<unknown> {
  const provider = resolveDataProvider(
    target.entity as EntityDef<{ id: string }>,
    target.mockData,
  )
  const search = typeof args.search === 'string' && args.search.trim() ? args.search.trim() : undefined
  const result = await provider.list({
    search,
    pageSize: REGISTRY_PAGE_SIZE,
    ...(typeof args.orderBy === 'string'
      ? { sortBy: args.orderBy, sortDir: args.direction === 'asc' ? 'asc' : 'desc' }
      : {}),
  })
  // Honesty guard: a provider with no searchable columns quietly IGNORES
  // `search` and returns recent rows — which the model then presents as the
  // thing it looked for ("REC-00012 vale R$6000" when no row matched at all).
  // If nothing in the returned rows contains the text, say so explicitly.
  const rows = result.data as Array<Record<string, unknown>>
  const unmatched = !!search && rows.length > 0 && !rows.some((r) => rowContainsText(r, search))
  return {
    entity: target.label,
    ...(search ? { search } : {}),
    total: result.total,
    // Truthful cap: the model is told the list was trimmed so it can say so
    // rather than presenting one page as the whole set.
    truncated: result.total > result.data.length,
    records: attachRefs(target.entity, rows),
    ...(unmatched
      ? {
          warning:
            'None of these rows contain the search text — they are RECENT records, not matches. Do NOT present them as the searched item; say it was not found or try another entity.',
        }
      : {}),
  }
}

/** Tolerant field resolution: exact key, then camelCase, then snake_case. */
function resolveFieldKey(row: Record<string, unknown>, name: string): string | null {
  if (name in row) return name
  const camel = name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  if (camel in row) return camel
  const snake = name.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
  if (snake in row) return snake
  return null
}

function isRangeObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    ('from' in v || 'to' in v || 'gte' in v || 'lte' in v || 'gt' in v || 'lt' in v)
  )
}

function compareInRange(raw: unknown, range: Record<string, unknown>): boolean {
  const asNumberOrTime = (v: unknown): number => {
    if (typeof v === 'number') return v
    const ts = Date.parse(String(v))
    if (!Number.isNaN(ts)) return ts
    return Number(v)
  }
  const value = asNumberOrTime(raw)
  if (Number.isNaN(value)) return false
  const lo = range.from ?? range.gte ?? range.gt
  const hi = range.to ?? range.lte ?? range.lt
  if (lo !== undefined && value < asNumberOrTime(lo)) return false
  if (lo !== undefined && 'gt' in range && value <= asNumberOrTime(lo)) return false
  if (hi !== undefined && value > asNumberOrTime(hi)) return false
  if (hi !== undefined && 'lt' in range && value >= asNumberOrTime(hi)) return false
  return true
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
  queryEntities?: Array<{ key: string; entity: EntityDef; writable?: boolean }>
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
    if (!entity.entityDef || entity.entityDef.agentHidden) continue
    const target = {
      label: entity.labelPlural,
      entity: entity.entityDef,
      mockData: entity.mockData,
    }
    index.set(input.entityToolName(entity.entityKey), target)
    index.set(`key:${entity.entityKey}`, target)
  }

  // CORE_QUERY_ENTITIES merged here — same reason buildDataPrimitiveTools does
  // it: this index and that catalog MUST agree, or the model is offered an
  // entity the executor then rejects as unknown.
  for (const q of [...(input.queryEntities ?? []), ...CORE_QUERY_ENTITIES]) {
    index.set(`key:${q.key}`, {
      label: q.entity.namePlural ?? q.entity.name,
      entity: q.entity,
      readOnly: !q.writable,
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

/** Field names are equal ignoring case and word separators, so a model sending
 *  `postalCode` matches a `postal_code` column and vice versa. */
function sameField(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[_-]/g, '').toLowerCase()
  return norm(a) === norm(b)
}

/**
 * Match a call's `values` against the target entity's declared fields,
 * tolerating a snake_case/camelCase mismatch either way.
 *
 * Deliberately does NOT try to guess which other entity the caller "meant".
 * Scoring candidates by how many of the rejected field names they declare was
 * tried and is actively harmful here: for {address, city, postalCode, state,
 * country} the salon app's `location` and `local-de-atendimento` both score 5
 * against `address`'s 4, so "add an address to this contact" would be redirected
 * into creating a business LOCATION. Field names alone cannot tell a child
 * record from an unrelated table that happens to describe a place; the guidance
 * that does work is declared up front, in the tool description.
 */
function matchDeclaredFields(
  target: DataToolTarget,
  values: Record<string, unknown>,
): { clean: Record<string, unknown> } | { error: Record<string, unknown> } {
  const declaredKeys = (target.entity.fields ?? []).map((f) => f.key)
  const clean: Record<string, unknown> = {}
  const unknown: string[] = []
  for (const [k, v] of Object.entries(values)) {
    const match = declaredKeys.find((d) => sameField(d, k)) ?? null
    if (match) clean[match] = v
    else unknown.push(k)
  }
  if (!unknown.length) return { clean }

  return {
    error: {
      error: 'unknown_field',
      message: `Unknown field(s) ${unknown.join(', ')} for ${target.label}. Use only the available fields and retry.`,
      availableFields: declaredKeys,
    },
  }
}

/**
 * For every PERSON matched by a global search, pull the records that hang off
 * it (today: addresses) and return them grouped by entity key. Returns null
 * when nothing is attached, so the payload stays quiet in the common case.
 */
async function resolveAttachedRecords(
  ctx: AIToolExecutionContext,
  matches: Array<{ key: string; records: unknown[] }>,
): Promise<Record<string, unknown[]> | null> {
  const ownerIds = new Set<string>()
  for (const m of matches) {
    const target = ctx.dataTools.get(`key:${m.key}`)
    if (target?.entity.data?.archetype !== 'person') continue
    for (const r of m.records) {
      const id = (r as { id?: unknown }).id
      if (typeof id === 'string') ownerIds.add(id)
    }
  }
  if (!ownerIds.size) return null

  const out: Record<string, unknown[]> = {}
  for (const q of CORE_QUERY_ENTITIES) {
    const target = ctx.dataTools.get(`key:${q.key}`)
    if (!target) continue
    const permission = target.entity.permission
    if (permission && !checkAccess(permission.feature, permission.action).allowed) continue
    try {
      const provider = resolveDataProvider(target.entity as EntityDef<{ id: string }>, target.mockData)
      const result = await provider.list({ pageSize: 50 })
      const rows = (result.data as Array<Record<string, unknown>>).filter((row) => {
        const owner = row.ownerId ?? row.owner_id
        return typeof owner === 'string' && ownerIds.has(owner)
      })
      if (rows.length) out[q.key] = rows
    } catch {
      // An attachment lookup must never sink the search it decorates.
    }
  }
  return Object.keys(out).length ? out : null
}

registerAIToolHandler('findAnything', async (args, ctx) => {
  const search = typeof args.search === 'string' ? args.search.trim() : ''
  if (!search) return { error: 'missing_search', message: 'Provide the name or text to look up.' }

  // Deduped key-indexed targets, permission-filtered PER TARGET (the palette
  // semantics: what you cannot see is not searched), person-archetypes first —
  // "quem é X?" is a person question far more often than not.
  const seen = new Set<DataToolTarget>()
  const candidates: Array<{ key: string; target: DataToolTarget }> = []
  for (const [key, target] of ctx.dataTools) {
    if (!key.startsWith('key:') || seen.has(target)) continue
    seen.add(target)
    candidates.push({ key: key.slice(4), target })
  }
  let skippedForPermission = 0
  const allowed = candidates.filter(({ target }) => {
    const permission = target.entity.permission
    if (!permission) return true
    if (checkAccess(permission.feature, permission.action).allowed) return true
    skippedForPermission += 1
    return false
  })
  allowed.sort((a, b) => {
    const ap = a.target.entity.data?.archetype === 'person' ? 0 : 1
    const bp = b.target.entity.data?.archetype === 'person' ? 0 : 1
    return ap - bp || a.key.localeCompare(b.key)
  })

  const MAX_TARGETS = 20
  const searched = allowed.slice(0, MAX_TARGETS)
  const settled = await Promise.allSettled(
    searched.map(async ({ key, target }) => {
      const provider = resolveDataProvider(
        target.entity as EntityDef<{ id: string }>,
        target.mockData,
      )
      const result = await provider.list({ search, pageSize: 5 })
      return {
        key,
        label: target.label,
        total: result.total,
        records: attachRefs(target.entity, result.data as Array<Record<string, unknown>>),
      }
    }),
  )
  const matches = settled
    .filter((r) => r.status === 'fulfilled' && r.value.records.length > 0)
    .map((r) => (r as PromiseFulfilledResult<{ key: string; label: string; total: number; records: unknown[] }>).value)

  // Attached records travel WITH their owner. A person's address lives in its
  // own table keyed by owner_id, so a text search for "Doguez" can never return
  // it — and telling the model to make a second, filtered call is a hope, not a
  // mechanism: it answers "this contact has no address registered" instead,
  // which is false. Resolving them here makes the answer correct by
  // construction. One extra query, only when a person actually matched.
  const attached = await resolveAttachedRecords(ctx, matches)

  return {
    query: search,
    matches,
    ...(attached ? { attached } : {}),
    searchedEntities: searched.length,
    ...(allowed.length > MAX_TARGETS ? { targetsTruncated: true } : {}),
    ...(skippedForPermission ? { skippedForPermission } : {}),
    ...(matches.length === 0
      ? { hint: 'No records matched anywhere the user can see. Say so — do not retry other search tools with the same text.' }
      : {}),
  }
})

registerAIToolHandler('createRecord', async (args, ctx) => {
  const resolved = resolveKeyedTarget(ctx, args)
  if ('error' in resolved) return resolved.error
  const { target } = resolved
  if (target.readOnly) {
    return { error: 'read_only', message: `${target.label} is a read-only view — records cannot be created here.` }
  }

  // Guard chain, in the broker's order: role×plan for CREATE → plan cap →
  // field validation → human confirmation → write → invalidate the count.
  const permission = target.entity.permission
  if (permission) {
    const access = checkAccess(permission.feature, 'create')
    if (!access.allowed) return access
  }
  if (target.entity.limitKey) {
    const limit = await guardLimit(target.entity.limitKey)
    if (!limit.allowed) return limit
  }

  const values = (args.values ?? {}) as Record<string, unknown>
  const declared = target.entity.fields ?? []
  const matched = matchDeclaredFields(target, values)
  if ('error' in matched) return matched.error
  const { clean } = matched
  const missing = declared
    .filter((f) => f.required && (clean[f.key] === undefined || clean[f.key] === null || clean[f.key] === ''))
    .map((f) => f.key)
  if (missing.length) {
    return {
      error: 'missing_required',
      message: `Missing required field(s): ${missing.join(', ')}. Ask the user for them, then retry.`,
      availableFields: declared.map((f) => f.key),
    }
  }

  // Duplicate guard: same-name record already existing comes back as a
  // structured warning FIRST — the model confirms intent with the user and
  // retries with allowDuplicate:true only if they really want a second one.
  const dupName = typeof clean.name === 'string' ? clean.name.trim() : ''
  if (dupName && args.allowDuplicate !== true) {
    const provider0 = resolveDataProvider(
      target.entity as EntityDef<{ id: string }>,
      target.mockData,
    )
    const existing = await provider0.list({ search: dupName, pageSize: 3 })
    const dupes = (existing.data as Array<Record<string, unknown>>).filter(
      (r) => String(r.name ?? '').trim().toLowerCase() === dupName.toLowerCase(),
    )
    if (dupes.length) {
      return {
        error: 'possible_duplicate',
        message: `A ${target.entity.name} named "${dupName}" already exists. If the user wants to CHANGE that existing record, use updateRecord with its id; only retry createRecord with allowDuplicate:true if they explicitly want a second one.`,
        matches: dupes,
      }
    }
  }

  const approved = await requestChatConfirmation({
    id: `create-${Date.now()}`,
    toolName: 'createRecord',
    title: `Criar ${target.entity.name}`,
    params: clean,
    plane: 'client',
  })
  if (!approved) return { ok: false, cancelled: true, reason: 'user_declined' }

  const provider = resolveDataProvider(
    target.entity as EntityDef<{ id: string }>,
    target.mockData,
  )
  const record = await provider.create(clean as never)
  if (target.entity.limitKey) invalidateLimit(target.entity.limitKey)
  return {
    ok: true,
    record,
    ref: {
      id: (record as { id?: string }).id,
      label: String((record as Record<string, unknown>).name ?? target.entity.name),
      resource: target.entity.data?.table,
      archetype: target.entity.data?.archetype
        ? `${target.entity.data.archetype}${target.entity.data.archetypeKind ? ':' + target.entity.data.archetypeKind : ''}`
        : undefined,
    },
  }
})

registerAIToolHandler('updateRecord', async (args, ctx) => {
  const resolved = resolveKeyedTarget(ctx, args)
  if ('error' in resolved) return resolved.error
  const { target } = resolved
  if (target.readOnly) {
    return { error: 'read_only', message: `${target.label} is a read-only view — records cannot be updated here.` }
  }
  const id = typeof args.id === 'string' ? args.id : ''
  if (!id) return { error: 'missing_id', message: 'Provide the id of the record to update (from this conversation or a search).' }

  // Same guard chain as createRecord, with the EDIT action; updates never
  // consume plan caps.
  const permission = target.entity.permission
  if (permission) {
    const access = checkAccess(permission.feature, 'edit')
    if (!access.allowed) return access
  }

  const values = (args.values ?? {}) as Record<string, unknown>
  const matched = matchDeclaredFields(target, values)
  if ('error' in matched) return matched.error
  const { clean } = matched
  if (!Object.keys(clean).length) {
    return { error: 'empty_update', message: 'No valid fields to change were provided.' }
  }

  const approved = await requestChatConfirmation({
    id: `update-${Date.now()}`,
    toolName: 'updateRecord',
    title: `Atualizar ${target.entity.name}`,
    params: { id, ...clean },
    plane: 'client',
  })
  if (!approved) return { ok: false, cancelled: true, reason: 'user_declined' }

  const provider = resolveDataProvider(
    target.entity as EntityDef<{ id: string }>,
    target.mockData,
  )
  const record = await provider.update(id, clean as never)
  return {
    ok: true,
    record,
    ref: {
      id,
      label: String((record as Record<string, unknown>).name ?? target.entity.name),
      resource: target.entity.data?.table,
      archetype: target.entity.data?.archetype
        ? `${target.entity.data.archetype}${target.entity.data.archetypeKind ? ':' + target.entity.data.archetypeKind : ''}`
        : undefined,
    },
  }
})

registerAIToolHandler('searchRecords', async (args, ctx) => {
  const resolved = resolveKeyedTarget(ctx, args)
  if ('error' in resolved) return resolved.error
  const base = (await executeDataTool(resolved.target, args)) as {
    records: Array<Record<string, unknown>>
    [k: string]: unknown
  }
  const filters = (args.filters ?? {}) as Record<string, unknown>
  const keys = Object.keys(filters)
  if (!keys.length) return base
  let rows = base.records
  for (const k of keys) {
    const sample = rows[0] ?? base.records[0]
    if (sample) {
      const fieldKey = resolveFieldKey(sample, k)
      if (!fieldKey) {
        return {
          error: 'unknown_field',
          message: `Filter field "${k}" does not exist on ${resolved.target.label}. Use one of the available fields and retry.`,
          availableFields: Object.keys(sample),
        }
      }
      const v = filters[k]
      rows = isRangeObject(v)
        ? rows.filter((r) => compareInRange(r[fieldKey], v))
        : rows.filter((r) => String(r[fieldKey] ?? '') === String(v))
    }
  }
  return { ...base, records: rows, filtered: keys, total: rows.length }
})

registerAIToolHandler('queryData', async (args, ctx) => {
  const resolved = resolveKeyedTarget(ctx, args)
  if ('error' in resolved) return resolved.error
  const { target } = resolved

  const metric = args.metric === 'sum' || args.metric === 'avg' ? args.metric : 'count'
  let field = typeof args.field === 'string' ? args.field : undefined
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

  // Field references FAIL LOUD: a typo'd/unknown field must never silently
  // filter everything to zero ("Não há agendamentos" over a wrong key). The
  // error carries the row's real keys so the model self-corrects next round.
  const sampleRow = rows[0]
  const availableFields = sampleRow ? Object.keys(sampleRow) : []
  const requireField = (name: string): string | { error: string; message: string; availableFields: string[] } => {
    if (!sampleRow) return name
    const resolved = resolveFieldKey(sampleRow, name)
    if (resolved) return resolved
    return {
      error: 'unknown_field',
      message: `Field \"${name}\" does not exist on ${target.label}. Use one of the available fields and retry.`,
      availableFields,
    }
  }

  const wantsDateRange = typeof args.from === 'string' || typeof args.to === 'string'
  let dateKey = 'createdAt'
  if (wantsDateRange || typeof args.dateField === 'string') {
    const resolved = requireField(typeof args.dateField === 'string' ? args.dateField : 'createdAt')
    if (typeof resolved !== 'string') return resolved
    dateKey = resolved
  }
  const from = typeof args.from === 'string' ? Date.parse(args.from) : NaN
  const to = typeof args.to === 'string' ? Date.parse(args.to) : NaN
  if (!Number.isNaN(from) || !Number.isNaN(to)) {
    rows = rows.filter((r) => {
      const raw = r[dateKey]
      const ts = typeof raw === 'string' || typeof raw === 'number' ? Date.parse(String(raw)) : NaN
      if (Number.isNaN(ts)) return false
      if (!Number.isNaN(from) && ts < from) return false
      if (!Number.isNaN(to) && ts > to) return false
      return true
    })
  }

  const filters = (args.filters ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(filters)) {
    const resolved = requireField(k)
    if (typeof resolved !== 'string') return resolved
    if (isRangeObject(v)) {
      // Models naturally express ranges as {from,to} nested in filters —
      // honor it instead of comparing against "[object Object]".
      rows = rows.filter((r) => compareInRange(r[resolved], v))
    } else {
      rows = rows.filter((r) => String(r[resolved] ?? '') === String(v))
    }
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

  if (field && rows[0]) {
    const resolved = resolveFieldKey(rows[0], field)
    if (!resolved) {
      return {
        error: 'unknown_field',
        message: `Field "${field}" does not exist on ${target.label}. Use one of the available fields and retry.`,
        availableFields,
      }
    }
    field = resolved
  }
  let groupBy = typeof args.groupBy === 'string' ? args.groupBy : undefined
  if (groupBy && rows[0]) {
    const resolved = resolveFieldKey(rows[0], groupBy)
    if (!resolved) {
      return {
        error: 'unknown_field',
        message: `Field "${groupBy}" does not exist on ${target.label}. Use one of the available fields and retry.`,
        availableFields,
      }
    }
    groupBy = resolved
  }
  const sampled = page.total > page.data.length
  if (groupBy) {
    const groups = new Map<string, Array<Record<string, unknown>>>()
    for (const r of rows) {
      const g = String(r[groupBy] ?? '—')
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(r)
    }
    // A group key like professionalId is opaque to the user — attach the
    // sibling display field (professionalName) when the rows carry one.
    const labelKey = groupBy.endsWith('Id')
      ? resolveFieldKey(rows[0] ?? {}, groupBy.slice(0, -2) + 'Name')
      : null
    return {
      entity: target.label,
      metric,
      ...(field ? { field } : {}),
      groupBy,
      groups: Array.from(groups.entries())
        .map(([group, subset]) => ({
          group,
          ...(labelKey && subset[0] ? { label: subset[0][labelKey] } : {}),
          value: aggregate(subset),
          rows: subset.length,
        }))
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
  const executable = tools.filter(
    (t) =>
      handlers.has(t.name) ||
      dataTools.has(t.name) ||
      (t.execution?.plane === 'server' && t.execution.kind === 'rpc'),
  )

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


/**
 * Client-plane execution of an RPC-bound tool (`execution: {kind:'rpc'}`):
 * calls the pool function as the signed-in user. The actor is the SESSION
 * user — spine 016 makes the RPC reject any other p_actor for JWT callers, so
 * this path cannot borrow someone else's role. Structured denials pass through
 * to the model (conversational paywall); S4 moves this server-side untouched.
 */
export async function executeRpcTool(
  rpcName: string,
  args: Record<string, unknown>,
  userId: string | undefined,
): Promise<AIToolExecutionResult> {
  const supabase = getSupabaseClientOptional() as {
    rpc?: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  } | null
  const tenantId = getActiveTenantId()
  if (!supabase?.rpc || !tenantId || !userId) {
    return errorResult('not_executable', 'No authenticated session/tenant available for this action.')
  }
  const { data, error } = await supabase.rpc(rpcName, {
    p_tenant_id: tenantId,
    p_actor_user_id: userId,
    p_payload: args,
  })
  if (error) return errorResult('execution_failed', error.message)
  return { ok: true, content: JSON.stringify(data ?? { ok: true }) }
}
