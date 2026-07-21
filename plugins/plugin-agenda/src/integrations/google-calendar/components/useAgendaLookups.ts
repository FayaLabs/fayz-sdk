// Host-plugin lookups for the smart-sync de-para target picker.
//
// A channel can target one professional (assignee), one service, or one location
// instead of the whole agenda. To offer real pickers (not raw uuid inputs) the
// connector reuses plugin-agenda's own data providers — it lives inside the same
// package, so these are in-process reads under the same RLS:
//   • professionals + locations  → createSupabaseAgendaProvider()
//   • services                    → createSupabasePublicBookingProvider() (v_public_services)
// Everything is loaded once, lazily, and degrades to an empty list (the row then
// falls back to a plain uuid input) if a lookup is unavailable for the tenant.
import { useEffect, useState } from 'react'
import { getActiveTenantId } from '@fayz-ai/core'
import { createSupabaseAgendaProvider } from '../../../data'
import { createSupabasePublicBookingProvider } from '../../../public/data.supabase'
import type { ChannelTargetKind } from '../types'

/** A pickable target option (assignee/service/location) — id + display name. */
export interface LookupOption {
  id: string
  name: string
}

export interface AgendaLookups {
  assignee: LookupOption[]
  service: LookupOption[]
  location: LookupOption[]
}

const EMPTY: AgendaLookups = { assignee: [], service: [], location: [] }

export interface UseAgendaLookupsResult {
  lookups: AgendaLookups
  loading: boolean
  /** True when at least one of the three lookups returned rows. */
  hasAny: boolean
}

/**
 * Load professionals / services / locations for the target picker. Failures are
 * swallowed per-lookup (each falls back to an empty list) so a missing table or
 * a vertical without services never breaks the whole de-para screen.
 */
export function useAgendaLookups(enabled: boolean): UseAgendaLookupsResult {
  const [lookups, setLookups] = useState<AgendaLookups>(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const agenda = createSupabaseAgendaProvider()
      const tenantId = getActiveTenantId()
      const publicProvider = tenantId
        ? createSupabasePublicBookingProvider({ tenantId })
        : null

      const [assignee, location, service] = await Promise.all([
        agenda.getProfessionals().then(
          (rows) => rows.map((p) => ({ id: p.id, name: p.name })),
          () => [] as LookupOption[],
        ),
        (agenda.getLocations?.() ?? Promise.resolve([])).then(
          (rows) => rows.map((l) => ({ id: l.id, name: l.name })),
          () => [] as LookupOption[],
        ),
        (publicProvider?.getServices() ?? Promise.resolve([])).then(
          (rows) => rows.map((s) => ({ id: s.id, name: s.name })),
          () => [] as LookupOption[],
        ),
      ])

      if (cancelled) return
      setLookups({ assignee, service, location })
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  const hasAny =
    lookups.assignee.length > 0 ||
    lookups.service.length > 0 ||
    lookups.location.length > 0

  return { lookups, loading, hasAny }
}

/** Options available for a given target kind (empty for whole-agenda / null). */
export function optionsForKind(
  lookups: AgendaLookups,
  kind: ChannelTargetKind,
): LookupOption[] {
  if (kind === 'assignee') return lookups.assignee
  if (kind === 'service') return lookups.service
  if (kind === 'location') return lookups.location
  return []
}
