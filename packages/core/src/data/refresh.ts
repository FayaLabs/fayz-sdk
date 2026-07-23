import * as React from 'react'
import { eventBus } from '../events'
import { globalCache } from '../lib/cache'
import { getActiveTenantId } from '../tenant'

// ---------------------------------------------------------------------------
// Data refresh bus — "something wrote; whoever is showing it should reload".
//
// A write that happens OUTSIDE the list showing it (the assistant creating an
// appointment, a webhook, another tab) used to leave the screen stale until the
// user reloaded by hand. Providers already invalidate their own read cache on
// create/update/remove, but a mounted list holds its rows in a store — nothing
// told it to fetch again.
//
// This is the missing half: one broadcast, every surface that renders the
// affected data listens. Deliberately coarse — a table name, not a row diff.
// Refetching a page of rows is cheap; a stale screen after "criei o
// agendamento" is not.
// ---------------------------------------------------------------------------

export const DATA_CHANGED_EVENT = 'data:changed'

export interface DataChangedPayload {
  /** Physical table the write touched, when the writer knows it. */
  table?: string
  /** Registered entity key (deriveEntityKey), when the writer knows it. */
  entityKey?: string
  /** Archetype the record belongs to (`person:client`), when known. */
  archetype?: string
  op?: 'create' | 'update' | 'delete' | 'unknown'
  /** Affected record id, when known. */
  id?: string
  /** What caused the write — lets a surface ignore its own UI writes. */
  source?: 'agent' | 'ui' | 'remote'
}

/** What a subscriber renders. Any field left out matches everything. */
export interface DataChangedMatch {
  table?: string
  entityKey?: string
  archetype?: string
}

/**
 * A write with NO table/entityKey is a write we could not attribute (a plugin
 * tool, an RPC). Subscribers still refresh for it: a redundant refetch costs a
 * request, a missed one costs the user's trust in what the screen shows.
 */
export function matchesDataChange(match: DataChangedMatch, payload: DataChangedPayload): boolean {
  const attributed = payload.table ?? payload.entityKey ?? payload.archetype
  if (!attributed) return true
  if (match.table && payload.table && match.table === payload.table) return true
  if (match.entityKey && payload.entityKey && match.entityKey === payload.entityKey) return true
  if (match.archetype && payload.archetype && match.archetype === payload.archetype) return true
  // A subscriber that declared nothing listens to everything.
  return !match.table && !match.entityKey && !match.archetype
}

// One agent turn can write twice (create + link). Coalesce so the lists behind
// it fetch once, after the turn settles, instead of once per call.
let pending: DataChangedPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flush(): void {
  const batch = pending
  pending = []
  flushTimer = null
  for (const payload of batch) eventBus.emit(DATA_CHANGED_EVENT, payload)
}

/**
 * Announce a write. Invalidates the provider read cache for the affected table
 * (an unattributed write clears it wholesale — a stale hit would defeat the
 * refetch it just triggered) and broadcasts to mounted surfaces.
 */
export function emitDataChanged(payload: DataChangedPayload = {}): void {
  if (payload.table) {
    globalCache.invalidate(`${getActiveTenantId() ?? '_'}:${payload.table}`)
  } else {
    globalCache.clear()
  }
  pending.push({ op: 'unknown', source: 'agent', ...payload })
  if (flushTimer) return
  flushTimer = setTimeout(flush, 120)
}

/** Subscribe for the lifetime of the component. The latest handler always runs. */
export function useDataChanged(
  match: DataChangedMatch,
  handler: (payload: DataChangedPayload) => void,
  deps: React.DependencyList = [],
): void {
  const handlerRef = React.useRef(handler)
  handlerRef.current = handler
  const { table, entityKey, archetype } = match

  React.useEffect(
    () =>
      eventBus.on<DataChangedPayload>(DATA_CHANGED_EVENT, (payload) => {
        if (matchesDataChange({ table, entityKey, archetype }, payload)) handlerRef.current(payload)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, entityKey, archetype, ...deps],
  )
}
