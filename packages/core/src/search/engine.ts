import type { EntityDef } from '../types/crud'
import { resolveDataProvider } from '../data/resolve'
import { getSupabaseClientOptional } from '../data/supabase'
import { getActiveTenantId } from '../tenant'
import {
  digitsOf,
  foldText,
  normalizeQuery,
  scoreCandidate,
  type NormalizedQuery,
} from './text'
import type {
  GlobalSearchResult,
  SearchGroup,
  SearchHit,
  SearchOptions,
  SearchPath,
  SearchTarget,
} from './types'

// Global search, two paths, one ranking:
//   ① INDEX — one `public.fayz_global_search` RPC (trigram-indexed, ~6ms).
//   ② SCAN  — parallel ilike per entity. Fallback for pools without the
//             migration, for mock data, and whenever ① errors.
// Both feed the same scorer, so the path changes latency, never the order.

/** Nothing shorter is worth a round-trip. */
export const MIN_QUERY_LENGTH = 2

const DEFAULT_LIMIT = 30
const DEFAULT_PER_TARGET = 5
/** Wide enough that a typical app fits in one wave — a second wave waits on
 *  the slowest table of the first. */
const SCAN_CONCURRENCY = 16
/** A single slow table must not hold the box hostage. */
const TARGET_TIMEOUT_MS = 3000
const CACHE_TTL_MS = 30_000
const CACHE_MAX_ENTRIES = 40

const RPC_NAME = 'fayz_global_search'

/** null = never asked. Set false once Postgres says the RPC is missing. */
let indexAvailable: boolean | null = null

/** Test seam / manual override. */
export function setSearchIndexAvailable(value: boolean | null): void {
  indexAvailable = value
}

export function isSearchIndexAvailable(): boolean | null {
  return indexAvailable
}

// Rows come back camelCase, EntityDefs declare both spellings — look up either.

function camelOf(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

function snakeOf(key: string): string {
  return key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

function readField(row: Record<string, unknown>, key: string): unknown {
  if (key in row) return row[key]
  const camel = camelOf(key)
  if (camel in row) return row[camel]
  const snake = snakeOf(key)
  if (snake in row) return row[snake]
  return undefined
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(' ')
  return ''
}

/** Field keys worth matching against, in declaration order. */
function searchableKeys(entity: EntityDef): string[] {
  const declared = entity.data?.searchColumns ?? entity.fields.filter((f) => f.searchable).map((f) => f.key)
  const keys = [...declared]
  const display = entity.displayField ?? 'name'
  if (!keys.includes(display)) keys.unshift(display)
  const subtitle = entity.subtitleField
  if (subtitle && !keys.includes(subtitle)) keys.push(subtitle)
  return keys
}

/** Keys whose value is a number the user might type digits of. */
const DIGIT_FIELD_TYPES = new Set(['phone', 'number'])

function digitKeys(entity: EntityDef): string[] {
  const keys = entity.fields
    .filter((f) => DIGIT_FIELD_TYPES.has(f.type) || /phone|document|cpf|cnpj|zip|postal|sku|code|reference/i.test(f.key))
    .map((f) => f.key)
  for (const extra of ['phone', 'document_number', 'sku', 'reference_number', 'postal_code']) {
    if (!keys.includes(extra)) keys.push(extra)
  }
  return keys
}

function titleOf(entity: EntityDef, row: Record<string, unknown>): string {
  const display = entity.displayField ?? 'name'
  const primary = asText(readField(row, display))
  if (primary) return primary
  for (const field of entity.fields) {
    if (field.type === 'text' || field.type === 'email') {
      const value = asText(readField(row, field.key))
      if (value) return value
    }
  }
  return asText(row.id) || '—'
}

function subtitleOf(entity: EntityDef, row: Record<string, unknown>, title: string): string | undefined {
  // A subtitle that repeats the title is noise.
  const distinct = (value: string): string | undefined => {
    if (!value || foldText(value) === foldText(title)) return undefined
    return value.length > 90 ? value.slice(0, 89) + '…' : value
  }
  const declared = entity.subtitleField
  if (declared) {
    const value = distinct(asText(readField(row, declared)))
    if (value) return value
  }
  for (const key of ['email', 'phone', 'sku', 'reference_number', 'document_number', 'description']) {
    const value = distinct(asText(readField(row, key)))
    if (value) return value
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Result assembly
// ---------------------------------------------------------------------------

function hitFromRow(
  target: SearchTarget,
  row: Record<string, unknown>,
  query: NormalizedQuery,
): SearchHit | null {
  const id = asText(row.id)
  if (!id) return null
  const entity = target.entity
  const title = titleOf(entity, row)
  const parts: string[] = [title]
  for (const key of searchableKeys(entity)) {
    const value = asText(readField(row, key))
    if (value) parts.push(value)
  }
  let digits = ''
  for (const key of digitKeys(entity)) {
    const value = readField(row, key)
    if (typeof value === 'string' || typeof value === 'number') digits += digitsOf(String(value))
  }
  const score = scoreCandidate(query, {
    title: foldText(title),
    haystack: foldText(parts.join(' ')),
    digits,
  })
  if (score === 0) return null
  return {
    uid: `${target.key}:${id}`,
    id,
    key: target.key,
    group: target.label,
    icon: target.icon ?? entity.icon,
    title,
    subtitle: subtitleOf(entity, row, title),
    score: score * (target.boost ?? 1),
    archetype: entity.data?.archetype,
    archetypeKind: entity.data?.archetypeKind,
    table: entity.data?.table,
    record: row,
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Identity of the RECORD, not of the target that found it — several targets
 *  cover the same rows ("Fornecedores" and "Suppliers" are both people). */
function recordIdentity(hit: SearchHit): string {
  if (UUID.test(hit.id)) return hit.id
  return `${hit.table ?? hit.key}#${hit.id}`
}

function assemble(
  query: string,
  hits: SearchHit[],
  targets: SearchTarget[],
  opts: { via: SearchPath; failed: string[]; elapsedMs: number; perTarget: number; limit: number; partial?: boolean },
): GlobalSearchResult {
  const seen = new Set<string>()
  const unique: SearchHit[] = []
  for (const hit of hits.slice().sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))) {
    const identity = recordIdentity(hit)
    if (seen.has(identity)) continue
    seen.add(identity)
    unique.push(hit)
  }

  // Cap per target before the global cap, so one populous entity can't crowd out the rest.
  const byKey = new Map<string, SearchHit[]>()
  const kept: SearchHit[] = []
  const capped = new Set<string>()
  for (const hit of unique) {
    const bucket = byKey.get(hit.key) ?? []
    if (bucket.length >= opts.perTarget) { capped.add(hit.key); continue }
    bucket.push(hit)
    byKey.set(hit.key, bucket)
    kept.push(hit)
  }
  const limited = kept.slice(0, opts.limit)

  const order = new Map(targets.map((t, i) => [t.key, i]))
  const groups: SearchGroup[] = []
  for (const hit of limited) {
    let group = groups.find((g) => g.key === hit.key)
    if (!group) {
      group = { key: hit.key, label: hit.group, icon: hit.icon, hits: [], hasMore: capped.has(hit.key) }
      groups.push(group)
    }
    group.hits.push(hit)
  }
  // Groups follow their best hit; ties fall back to target order.
  groups.sort((a, b) => (b.hits[0]?.score ?? 0) - (a.hits[0]?.score ?? 0)
    || (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99))

  return {
    query,
    hits: limited,
    groups,
    via: opts.via,
    failed: opts.failed,
    elapsedMs: opts.elapsedMs,
    partial: opts.partial ?? false,
  }
}

// Cache: exact hits plus prefix reuse. Substring matching is monotone, so an
// untruncated result for "bigod" is a sound superset for "bigodi" and can be
// re-scored locally while the real request flies.

interface CacheEntry {
  scope: string
  folded: string
  at: number
  complete: boolean
  hits: SearchHit[]
}

const cache: CacheEntry[] = []

function scopeKey(targets: SearchTarget[]): string {
  return `${getActiveTenantId() ?? '_'}|${targets.map((t) => t.key).sort().join(',')}`
}

function cacheGet(scope: string, folded: string): CacheEntry | undefined {
  const now = Date.now()
  return cache.find((e) => e.scope === scope && e.folded === folded && now - e.at < CACHE_TTL_MS)
}

function cachePrefix(scope: string, folded: string): CacheEntry | undefined {
  const now = Date.now()
  let best: CacheEntry | undefined
  for (const entry of cache) {
    if (entry.scope !== scope || !entry.complete) continue
    if (now - entry.at >= CACHE_TTL_MS) continue
    if (!folded.startsWith(entry.folded)) continue
    if (!best || entry.folded.length > best.folded.length) best = entry
  }
  return best
}

function cacheSet(entry: CacheEntry): void {
  const at = cache.findIndex((e) => e.scope === entry.scope && e.folded === entry.folded)
  if (at >= 0) cache.splice(at, 1)
  cache.unshift(entry)
  if (cache.length > CACHE_MAX_ENTRIES) cache.length = CACHE_MAX_ENTRIES
}

/** Drop every cached answer. Call on tenant switch and after writes. */
export function clearSearchCache(): void {
  cache.length = 0
}

// Path ① — the server index

interface IndexRow {
  entity_key: string
  record_id: string
  title: string | null
  subtitle: string | null
  score: number | null
}

function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  // PGRST202: PostgREST could not find the function in its schema cache.
  if (error.code === 'PGRST202') return true
  const message = (error.message ?? '').toLowerCase()
  return message.includes(RPC_NAME) && (message.includes('does not exist') || message.includes('not find'))
}

async function searchViaIndex(
  query: NormalizedQuery,
  targets: SearchTarget[],
  perTarget: number,
  limit: number,
): Promise<{ hits: SearchHit[]; ok: boolean }> {
  const client = getSupabaseClientOptional() as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>
  } | null
  const tenantId = getActiveTenantId()
  if (!client || !tenantId) return { hits: [], ok: false }

  const byKey = new Map(targets.map((t) => [t.key, t]))
  const { data, error } = await client.rpc(RPC_NAME, {
    p_query: query.raw,
    p_tenant_id: tenantId,
    p_entity_keys: targets.map((t) => t.key),
    p_per_source: perTarget * 3,
    p_limit: limit * 3,
  })

  if (error) {
    if (isMissingFunction(error)) {
      indexAvailable = false
      return { hits: [], ok: false }
    }
    throw error
  }
  indexAvailable = true

  const rows = Array.isArray(data) ? (data as IndexRow[]) : []
  const hits: SearchHit[] = []
  for (const row of rows) {
    const target = byKey.get(row.entity_key)
    if (!target || !row.record_id) continue
    const title = row.title ?? ''
    // Re-score locally so both paths obey one ordering law.
    const local = scoreCandidate(query, {
      title: foldText(title),
      haystack: foldText(`${title} ${row.subtitle ?? ''}`),
      digits: digitsOf(row.subtitle ?? '') + digitsOf(title),
    })
    // The server matched on columns the client never sees (notes, tags). Keep
    // those, ranked under everything the local scorer can explain.
    const score = local > 0 ? local : Math.min(0.55, (row.score ?? 0.4))
    hits.push({
      uid: `${target.key}:${row.record_id}`,
      id: row.record_id,
      key: target.key,
      group: target.label,
      icon: target.icon ?? target.entity.icon,
      title: title || '—',
      subtitle: row.subtitle ?? undefined,
      score: score * (target.boost ?? 1),
      archetype: target.entity.data?.archetype,
      archetypeKind: target.entity.data?.archetypeKind,
      table: target.entity.data?.table,
    })
  }
  return { hits, ok: true }
}

// Path ② — bounded per-entity scan

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('search target timed out')), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; item: T }>> {
  const results: Array<{ ok: true; value: R } | { ok: false; item: T }> = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      const item = items[index]!
      try {
        results[index] = { ok: true, value: await fn(item) }
      } catch {
        results[index] = { ok: false, item }
      }
    }
  })
  await Promise.all(workers)
  return results
}

async function searchViaScan(
  query: NormalizedQuery,
  targets: SearchTarget[],
  perTarget: number,
  onProgress?: (hits: SearchHit[]) => void,
): Promise<{ hits: SearchHit[]; failed: string[] }> {
  // Two rounds, same shape as the SQL function. Round 1 sends the whole phrase
  // (selective, answers the common case). Round 2 sends the longest token —
  // the only form that finds "Maria da Silva" for "maria silva" — and runs
  // only if round 1 found nothing anywhere: an unindexed `%cli%` is expensive,
  // and firing it per miss made multi-word queries 9.8s instead of 0.8s.
  const multiWord = query.tokens.length > 1
  const phrase = query.folded
  const token = query.anchor.length >= MIN_QUERY_LENGTH ? query.anchor : phrase
  const pageSize = Math.min(perTarget * 3, 24)
  const widePageSize = Math.min(perTarget * 6, 40)

  const searchable = targets.filter((t) => searchableKeys(t.entity).length > 0)

  // Emit as each target lands, so the box fills instead of spinning until the
  // slowest entity reports.
  const running: SearchHit[] = []

  const round = (search: string, size: number) =>
    mapLimited(searchable, SCAN_CONCURRENCY, async (target) => {
      const provider = resolveDataProvider(target.entity as EntityDef<{ id: string }>, target.mockData)
      // No count: the aggregate costs more than the rows, times every entity.
      const result = await withTimeout(
        provider.list({ search, pageSize: size, countMode: 'none' }),
        TARGET_TIMEOUT_MS,
      )
      const rows = result.data as unknown as Array<Record<string, unknown>>
      // Post-scoring also guards providers that ignore `search` entirely.
      const hits = rows.map((row) => hitFromRow(target, row, query)).filter((h): h is SearchHit => h !== null)
      if (hits.length && onProgress) {
        running.push(...hits)
        onProgress(running.slice())
      }
      return { target, hits }
    })

  const collect = (settled: Awaited<ReturnType<typeof round>>) => {
    const hits: SearchHit[] = []
    const failed: string[] = []
    for (const outcome of settled) {
      if (outcome.ok) hits.push(...outcome.value.hits)
      else failed.push(outcome.item.key)
    }
    return { hits, failed }
  }

  const first = collect(await round(phrase, pageSize))
  if (first.hits.length > 0 || !multiWord || token === phrase) return first

  const second = collect(await round(token, widePageSize))
  return { hits: second.hits, failed: [...new Set([...first.failed, ...second.failed])] }
}

/** Search every target at once. Never throws for data reasons — a target that
 *  errors lands in `failed` and the rest of the answer still ships. */
export async function searchEverything(
  rawQuery: string,
  options: SearchOptions,
): Promise<GlobalSearchResult> {
  const started = Date.now()
  const query = normalizeQuery(rawQuery)
  const targets = options.targets
  const limit = options.limit ?? DEFAULT_LIMIT
  const perTarget = options.perTarget ?? DEFAULT_PER_TARGET
  const empty = (via: SearchPath): GlobalSearchResult =>
    assemble(rawQuery, [], targets, { via, failed: [], elapsedMs: Date.now() - started, perTarget, limit })

  if (query.folded.length < MIN_QUERY_LENGTH || targets.length === 0) return empty('cache')

  const scope = scopeKey(targets)
  const exact = cacheGet(scope, query.folded)
  if (exact) {
    return assemble(rawQuery, exact.hits, targets, {
      via: 'cache', failed: [], elapsedMs: Date.now() - started, perTarget, limit,
    })
  }

  // Paint from the widest complete prefix result while the real one flies.
  if (options.onPartial) {
    const prefix = cachePrefix(scope, query.folded)
    if (prefix) {
      const rescored = prefix.hits
        .map((hit) => {
          const score = scoreCandidate(query, {
            title: foldText(hit.title),
            haystack: foldText(`${hit.title} ${hit.subtitle ?? ''}`),
            digits: digitsOf(hit.subtitle ?? ''),
          })
          return score > 0 ? { ...hit, score } : null
        })
        .filter((h): h is SearchHit => h !== null)
      options.onPartial(assemble(rawQuery, rescored, targets, {
        via: 'cache', failed: [], elapsedMs: Date.now() - started, perTarget, limit, partial: true,
      }))
    }
  }

  let hits: SearchHit[] = []
  let failed: string[] = []
  let via: SearchPath = 'scan'

  if (!options.forceScan && indexAvailable !== false) {
    try {
      const indexed = await searchViaIndex(query, targets, perTarget, limit)
      if (indexed.ok) {
        hits = indexed.hits
        via = 'index'
      }
    } catch {
      // One bad query is no reason to abandon a live index — scan just this once.
    }
  }

  if (via !== 'index') {
    const emit = options.onPartial
    const scanned = await searchViaScan(query, targets, perTarget, emit
      ? (running) => emit(assemble(rawQuery, running, targets, {
          via: 'scan', failed: [], elapsedMs: Date.now() - started, perTarget, limit, partial: true,
        }))
      : undefined)
    hits = scanned.hits
    failed = scanned.failed
  }

  if (options.signal?.aborted) return empty(via)

  const result = assemble(rawQuery, hits, targets, {
    via, failed, elapsedMs: Date.now() - started, perTarget, limit,
  })
  cacheSet({
    scope,
    folded: query.folded,
    at: Date.now(),
    // Only an uncapped answer is a sound superset for longer queries.
    complete: failed.length === 0 && !result.groups.some((g) => g.hasMore),
    hits,
  })
  return result
}
