import type { EntityDef } from '../types/crud'

/** One searchable thing — declaring an entity is all it takes to be findable. */
export interface SearchTarget {
  /** Stable entity key (`deriveEntityKey`): 'person:client', 'product', … */
  key: string
  /** Plural human label; becomes the result group heading. */
  label: string
  icon?: string
  entity: EntityDef
  mockData?: Array<{ id: string }>
  /** Multiplies the final score. Default 1. */
  boost?: number
}

export interface SearchHit {
  /** `${target.key}:${record id}` — stable across both search paths. */
  uid: string
  id: string
  /** Target key this record came from. */
  key: string
  /** Group heading (the target's plural label). */
  group: string
  icon?: string
  title: string
  subtitle?: string
  /** 0 … 1 (times the target boost). Higher is better. */
  score: number
  archetype?: string
  archetypeKind?: string
  table?: string
  /** The row, when the path that found it had one. The index path returns
   *  titles only. */
  record?: Record<string, unknown>
}

export interface SearchGroup {
  key: string
  label: string
  icon?: string
  hits: SearchHit[]
  /** True when this group hit its per-target cap — more matches exist. */
  hasMore: boolean
}

export type SearchPath = 'index' | 'scan' | 'cache'

export interface GlobalSearchResult {
  query: string
  hits: SearchHit[]
  groups: SearchGroup[]
  /** Which path produced this result — surfaced for diagnostics, not for UI. */
  via: SearchPath
  /** Targets whose query failed. Never fatal: a broken table cannot blind the box. */
  failed: string[]
  /** Wall-clock milliseconds. */
  elapsedMs: number
  /** True while a better (network) answer is still on its way. */
  partial: boolean
}

export interface SearchOptions {
  /** Permission filtering is the caller's job — the engine searches what it's handed. */
  targets: SearchTarget[]
  /** Max hits returned overall. Default 30. */
  limit?: number
  /** Max hits per target. Default 5. */
  perTarget?: number
  /** Fired with early/partial answers before the authoritative one resolves. */
  onPartial?: (result: GlobalSearchResult) => void
  /** Discard the result if this aborts. */
  signal?: AbortSignal
  /** Skip the server index and force the per-entity scan (tests, diagnostics). */
  forceScan?: boolean
}
