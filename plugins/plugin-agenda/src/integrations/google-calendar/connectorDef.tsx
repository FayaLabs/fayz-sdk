// Google Calendar as a unified ConnectorDefinition.
//
// Surfaces inside plugin-agenda's settings → Integrations tab (the host),
// rendered by the shared ConnectorsHub. The hub handles the OAuth connect/
// disconnect; the ExtraPanel below adds the calendar picker, manual sync and
// run history (only meaningful once connected).
import React, { useEffect, useState } from 'react'
import { RefreshCw, History, CheckCircle2, AlertCircle, Loader2, CalendarCog, CalendarPlus } from 'lucide-react'
import { Button, toast } from '@fayz-ai/ui'
import type { ConnectorDefinition } from '@fayz-ai/core'
import { createGoogleCalendarProvider } from './data/supabase'
import type { CalendarChannel, CalendarSyncLogEntry } from './types'
import { ChannelMappingList } from './components/ChannelMappingList'
import { ImportEventsWizard } from './components/ImportEventsWizard'

const provider = createGoogleCalendarProvider()

/** Channels Google is allowed to write INTO the agenda from (gate the import wizard). */
function inboundChannels(channels: CalendarChannel[]): CalendarChannel[] {
  return channels.filter(
    (c) => c.isActive && (c.direction === 'inbound' || c.direction === 'bidirectional'),
  )
}

function GoogleCalendarExtraPanel() {
  const [connected, setConnected] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>()
  const [syncing, setSyncing] = useState(false)
  const [log, setLog] = useState<CalendarSyncLogEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [channels, setChannels] = useState<CalendarChannel[]>([])
  // Progressive disclosure: once connected the de-para is opened either on the
  // "Configure calendars" CTA or automatically when channels already exist.
  const [showMapping, setShowMapping] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  async function load() {
    const integ = await provider.getIntegration()
    setConnected(!!integ?.connected)
    if (integ) {
      setLastSyncAt(integ.lastSyncAt)
      void provider.getSyncLog().then(setLog)
      void provider.listChannels().then((ch) => {
        setChannels(ch)
        if (ch.length > 0) setShowMapping(true)
      })
    }
    setLoaded(true)
  }
  useEffect(() => { void load() }, [])

  // Before connecting there's nothing to configure here — a short hint only.
  if (!loaded) return null
  if (!connected) {
    return (
      <p className="text-xs text-muted-foreground border-t pt-4">
        Connect a Google account above to map your calendars and import events.
      </p>
    )
  }

  async function handleSyncNow() {
    setSyncing(true)
    try {
      const r = await provider.syncNow()
      toast.success(`Synced — ${r.written} updated`)
      void provider.getSyncLog().then(setLog)
      void provider.getIntegration().then((i) => setLastSyncAt(i?.lastSyncAt))
    } catch (e: any) { toast.error(e?.message ?? 'Sync failed') }
    finally { setSyncing(false) }
  }

  const canImport = inboundChannels(channels).length > 0

  return (
    <div className="space-y-5 border-t pt-4">
      {/* 1 — De-para (mapping). CTA first when nothing is configured yet. */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarCog className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Calendars</h4>
        </div>
        {showMapping ? (
          <ChannelMappingList provider={provider} onChannelsChange={setChannels} />
        ) : (
          <div className="rounded-md border border-dashed px-4 py-5 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Map each Google calendar to what it syncs — a professional, service, location, or your
              whole agenda.
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowMapping(true)}>
              <CalendarCog className="h-3.5 w-3.5" /> Configure calendars
            </Button>
          </div>
        )}
      </section>

      {/* 2 — Import future events (only meaningful once an inbound channel exists). */}
      {showMapping && (
        <section className="space-y-2">
          {showWizard ? (
            <ImportEventsWizard
              provider={provider}
              channels={inboundChannels(channels)}
              onClose={() => setShowWizard(false)}
              onImported={() => {
                void provider.getSyncLog().then(setLog)
                void provider.getIntegration().then((i) => setLastSyncAt(i?.lastSyncAt))
              }}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!canImport}
              title={canImport ? undefined : 'Enable an importing calendar first'}
              onClick={() => setShowWizard(true)}
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Import future events
            </Button>
          )}
        </section>
      )}

      {/* 3 — Status: last sync + manual pull + run history. */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync now
          </Button>
          {lastSyncAt && (
            <span className="text-[11px] text-muted-foreground">
              Last sync: {new Date(lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>

        {log.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">History</h4>
            </div>
            <div className="rounded-md border divide-y text-sm">
              {log.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString()}</span>
                  <span className="text-[10px] uppercase tracking-wide px-1 py-px rounded bg-muted text-muted-foreground">{r.direction}</span>
                  <span className="ml-auto text-xs">{r.written} written / {r.fetched} fetched</span>
                  {r.status === 'success'
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    : <AlertCircle className="h-3.5 w-3.5 text-warning" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export const googleCalendarConnectorDef: ConnectorDefinition = {
  id: 'google-calendar',
  hostPluginId: 'agenda',
  name: 'Google Calendar',
  description: 'Two-way sync between your bookings and Google Calendar.',
  icon: 'Calendar',
  authKind: 'oauth',
  async getStatus() {
    const integ = await provider.getIntegration()
    return { connected: !!integ?.connected }
  },
  startOAuth: (redirectTo) => provider.getConnectUrl(redirectTo),
  disconnect: () => provider.disconnect(),
  ExtraPanel: GoogleCalendarExtraPanel,
}
