// Import wizard — pull FUTURE Google events into the agenda as blocks/appointments.
//
// listExternalEvents() returns events on the active inbound channels that are not
// yet linked to an appointment. The user ticks the ones to bring in and confirms;
// importEvents() runs them through gcal_import_event (honouring each channel's
// import_mode + target) and returns a per-item tally {imported, skipped, errors}.
// Events show their source calendar as a colored badge and an "All-day" badge
// when applicable; times are formatted pt-BR.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, CalendarPlus, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react'
import { Button, Checkbox, Badge, toast } from '@fayz-ai/ui'
import type { GoogleCalendarProvider } from '../data/supabase'
import type { CalendarChannel, ExternalEventPreview, ImportEventsResult } from '../types'
import { CalendarColorDot } from './CalendarColorDot'

/** pt-BR datetime label, all-day aware (date only for all-day events). */
function formatWhen(ev: ExternalEventPreview): string {
  const start = new Date(ev.startsAt)
  if (ev.allDay) {
    return start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return start.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ImportEventsWizard({
  provider,
  channels,
  onClose,
  onImported,
}: {
  provider: GoogleCalendarProvider
  /** Active channels — used to label each event with its source calendar + color. */
  channels: CalendarChannel[]
  onClose: () => void
  /** Fired after a successful import so the parent can refresh status/history. */
  onImported?: (result: ImportEventsResult) => void
}) {
  const [events, setEvents] = useState<ExternalEventPreview[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportEventsResult | null>(null)

  const channelById = useMemo(() => {
    const m: Record<string, CalendarChannel> = {}
    for (const c of channels) m[c.id] = c
    return m
  }, [channels])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const rows = await provider.listExternalEvents()
      setEvents(rows)
      setSelected(new Set(rows.map((r) => r.eventId)))
    } catch (e: any) {
      setError(e?.message ?? 'Could not load upcoming events')
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = (eventId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })

  const allSelected = events.length > 0 && selected.size === events.length
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(events.map((e) => e.eventId)))

  async function handleImport() {
    const items = events
      .filter((e) => selected.has(e.eventId))
      .map((e) => ({ channelId: e.channelId, eventId: e.eventId }))
    if (items.length === 0) return
    setImporting(true)
    try {
      const res = await provider.importEvents(items)
      setResult(res)
      onImported?.(res)
      toast.success(`Imported ${res.imported} · skipped ${res.skipped}`)
      // Drop imported events from the list so the wizard reflects the new state.
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <CalendarPlus className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">Import future events</h4>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted/50"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </div>
      ) : error ? (
        <div className="p-3">
          <div className="flex items-center gap-2 text-sm text-warning-soft-foreground">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 px-4 text-center space-y-1">
          <p className="text-sm font-medium">You're all caught up</p>
          <p className="text-xs text-muted-foreground">
            No upcoming Google events left to import on your active calendars.
          </p>
          {result && (
            <p className="text-xs text-success">
              Imported {result.imported} · skipped {result.skipped}
              {result.errors.length > 0 ? ` · ${result.errors.length} errors` : ''}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 border-b px-3 py-2">
            <Checkbox checked={allSelected} onChange={toggleAll} />
            <span className="text-xs text-muted-foreground">
              {selected.size} of {events.length} selected
            </span>
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y">
            {events.map((ev) => {
              const ch = channelById[ev.channelId]
              return (
                <label
                  key={ev.eventId}
                  className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted/30"
                >
                  <Checkbox
                    checked={selected.has(ev.eventId)}
                    onChange={() => toggle(ev.eventId)}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {ev.summary || '(no title)'}
                      </span>
                      {ev.allDay && (
                        <Badge variant="secondary" className="shrink-0">
                          All-day
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatWhen(ev)}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarColorDot color={ch?.color} />
                        {ch?.summary ?? ev.calendarId}
                      </span>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
          <div className="flex items-center gap-2 border-t px-3 py-2">
            {result && (
              <span className="text-xs text-muted-foreground">
                Last run: {result.imported} imported
                {result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}
              </span>
            )}
            <Button
              size="sm"
              className="ml-auto"
              disabled={importing || selected.size === 0}
              onClick={handleImport}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Import {selected.size > 0 ? selected.size : ''}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
