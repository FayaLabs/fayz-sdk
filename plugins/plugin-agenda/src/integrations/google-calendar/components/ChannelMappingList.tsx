// De-para (mapping) list — one row per Google calendar.
//
// Reads the user's Google calendars (listGoogleCalendars) and this tenant's
// existing channels (listChannels), joins them by google_calendar_id, and lets
// the user, per calendar:
//   • toggle sync on/off            → creates/updates the channel (is_active)
//   • pick a direction              → Two-way / Import only / Export only / Off
//   • pick a target                 → Whole agenda / Professional / Service / Location
//   • pick an import mode           → Block / Appointment
// Every change is persisted immediately via saveChannel (RLS upsert on
// integration_id + google_calendar_id), snapshotting the calendar summary+color
// onto the channel. Target ids come from real host lookups (useAgendaLookups);
// if a lookup is empty for the tenant the row degrades to a raw uuid input.
import React, { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import {
  Button,
  Checkbox,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@fayz-ai/ui'
import type { GoogleCalendarProvider } from '../data/supabase'
import type {
  CalendarChannel,
  ChannelDirection,
  ChannelTargetKind,
  ChannelImportMode,
  GoogleCalendarListEntry,
} from '../types'
import { CalendarColorDot } from './CalendarColorDot'
import { useAgendaLookups, optionsForKind } from './useAgendaLookups'

const DIRECTION_LABELS: Record<ChannelDirection, string> = {
  bidirectional: 'Two-way',
  inbound: 'Import only',
  outbound: 'Export only',
  off: 'Off',
}
const IMPORT_MODE_LABELS: Record<ChannelImportMode, string> = {
  block: 'Block',
  appointment: 'Appointment',
}
// 'agenda' is the UI sentinel for the whole-agenda target (target_kind = null).
const TARGET_KIND_LABELS: Record<'agenda' | 'assignee' | 'service' | 'location', string> = {
  agenda: 'Whole agenda',
  assignee: 'Professional',
  service: 'Service',
  location: 'Location',
}
const NO_TARGET = '__none__'

/** Defaults for a freshly-enabled calendar (mirror the migration defaults). */
function defaultChannel(): {
  direction: ChannelDirection
  targetKind: ChannelTargetKind
  targetId: string | null
  importMode: ChannelImportMode
} {
  return { direction: 'bidirectional', targetKind: null, targetId: null, importMode: 'block' }
}

export function ChannelMappingList({
  provider,
  onChannelsChange,
}: {
  provider: GoogleCalendarProvider
  /** Bubble the current channels up so the parent can gate the import wizard. */
  onChannelsChange?: (channels: CalendarChannel[]) => void
}) {
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([])
  const [byGcalId, setByGcalId] = useState<Record<string, CalendarChannel>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const { lookups, hasAny: hasLookups } = useAgendaLookups(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cals, channels] = await Promise.all([
        provider.listGoogleCalendars(),
        provider.listChannels(),
      ])
      setCalendars(cals)
      const map: Record<string, CalendarChannel> = {}
      for (const ch of channels) map[ch.googleCalendarId] = ch
      setByGcalId(map)
      onChannelsChange?.(channels)
    } catch (e: any) {
      setError(e?.message ?? 'Could not load Google calendars')
    } finally {
      setLoading(false)
    }
  }, [provider, onChannelsChange])

  useEffect(() => {
    void load()
  }, [load])

  /** Persist a patch for one calendar, then refresh channels (keeps ids correct). */
  const persist = useCallback(
    async (
      cal: GoogleCalendarListEntry,
      patch: {
        direction?: ChannelDirection
        targetKind?: ChannelTargetKind
        targetId?: string | null
        importMode?: ChannelImportMode
        isActive?: boolean
      },
    ) => {
      const existing = byGcalId[cal.id]
      const base = existing ?? { ...defaultChannel(), isActive: true }
      setSavingId(cal.id)
      try {
        await provider.saveChannel({
          id: existing?.id,
          googleCalendarId: cal.id,
          summary: cal.summary,
          color: cal.backgroundColor ?? null,
          direction: patch.direction ?? base.direction,
          targetKind: patch.targetKind !== undefined ? patch.targetKind : base.targetKind,
          targetId: patch.targetId !== undefined ? patch.targetId : base.targetId ?? null,
          importMode: patch.importMode ?? base.importMode,
          isActive: patch.isActive !== undefined ? patch.isActive : base.isActive,
        })
        const channels = await provider.listChannels()
        const map: Record<string, CalendarChannel> = {}
        for (const ch of channels) map[ch.googleCalendarId] = ch
        setByGcalId(map)
        onChannelsChange?.(channels)
      } catch (e: any) {
        toast.error(e?.message ?? 'Could not save calendar mapping')
      } finally {
        setSavingId(null)
      }
    },
    [byGcalId, provider, onChannelsChange],
  )

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-warning/40 bg-warning-soft/40 px-3 py-3 text-sm">
        <div className="flex items-center gap-2 text-warning-soft-foreground">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    )
  }

  if (calendars.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No Google calendars found on this account.
      </p>
    )
  }

  return (
    <div className="rounded-md border divide-y">
      {calendars.map((cal) => {
        const ch = byGcalId[cal.id]
        const active = !!ch?.isActive
        const saving = savingId === cal.id
        const direction: ChannelDirection = ch?.direction ?? 'bidirectional'
        const targetKind: ChannelTargetKind = ch?.targetKind ?? null
        const importMode: ChannelImportMode = ch?.importMode ?? 'block'
        // Import mode only matters when Google can write into the agenda.
        const canImport = direction === 'inbound' || direction === 'bidirectional'
        const kindOptions = optionsForKind(lookups, targetKind)

        return (
          <div key={cal.id} className="px-3 py-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <Checkbox
                checked={active}
                disabled={saving}
                onChange={(next) => void persist(cal, { isActive: next })}
              />
              <CalendarColorDot color={cal.backgroundColor} />
              <span className="text-sm font-medium truncate">{cal.summary}</span>
              {cal.primary && (
                <Badge variant="outline" className="shrink-0">
                  Primary
                </Badge>
              )}
              {saving && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {active && (
              <div className="grid gap-2 pl-[26px] sm:grid-cols-2 lg:grid-cols-4">
                {/* Direction */}
                <label className="block">
                  <span className="text-[11px] font-medium text-muted-foreground">Direction</span>
                  <Select
                    value={direction}
                    onValueChange={(v) => void persist(cal, { direction: v as ChannelDirection })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DIRECTION_LABELS) as ChannelDirection[]).map((d) => (
                        <SelectItem key={d} value={d}>
                          {DIRECTION_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                {/* Target kind */}
                <label className="block">
                  <span className="text-[11px] font-medium text-muted-foreground">Target</span>
                  <Select
                    value={targetKind ?? 'agenda'}
                    onValueChange={(v) =>
                      void persist(cal, {
                        targetKind: v === 'agenda' ? null : (v as ChannelTargetKind),
                        // Reset the id whenever the kind changes.
                        targetId: null,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TARGET_KIND_LABELS) as Array<keyof typeof TARGET_KIND_LABELS>).map(
                        (k) => (
                          <SelectItem key={k} value={k}>
                            {TARGET_KIND_LABELS[k]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </label>

                {/* Target id — real picker when we have lookups, uuid input otherwise */}
                {targetKind && (
                  <label className="block">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {TARGET_KIND_LABELS[targetKind]}
                    </span>
                    {kindOptions.length > 0 ? (
                      <Select
                        value={ch?.targetId ?? NO_TARGET}
                        onValueChange={(v) =>
                          void persist(cal, { targetId: v === NO_TARGET ? null : v })
                        }
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {kindOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <input
                        defaultValue={ch?.targetId ?? ''}
                        placeholder="uuid"
                        onBlur={(e) =>
                          void persist(cal, { targetId: e.target.value.trim() || null })
                        }
                        className="w-full mt-1 h-8 rounded-input border border-input bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </label>
                )}

                {/* Import mode — only when inbound */}
                {canImport && (
                  <label className="block">
                    <span className="text-[11px] font-medium text-muted-foreground">Import as</span>
                    <Select
                      value={importMode}
                      onValueChange={(v) => void persist(cal, { importMode: v as ChannelImportMode })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(IMPORT_MODE_LABELS) as ChannelImportMode[]).map((m) => (
                          <SelectItem key={m} value={m}>
                            {IMPORT_MODE_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
              </div>
            )}
          </div>
        )
      })}
      {!hasLookups && (
        <p className="px-3 py-2 text-[11px] text-muted-foreground">
          No professional/service/location lookups available — target ids fall back to manual uuid
          entry.
        </p>
      )}
    </div>
  )
}
