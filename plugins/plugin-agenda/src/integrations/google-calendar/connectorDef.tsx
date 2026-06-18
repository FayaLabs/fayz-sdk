// Google Calendar as a unified ConnectorDefinition.
//
// Surfaces inside plugin-agenda's settings → Integrations tab (the host),
// rendered by the shared ConnectorsHub. The hub handles the OAuth connect/
// disconnect; the ExtraPanel below adds the calendar picker, manual sync and
// run history (only meaningful once connected).
import React, { useEffect, useState } from 'react'
import { RefreshCw, History, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button, toast } from '@fayz-ai/ui'
import type { ConnectorDefinition } from '@fayz-ai/core'
import { createGoogleCalendarProvider } from './data/supabase'
import type { CalendarSyncLogEntry } from './types'

const provider = createGoogleCalendarProvider()

function GoogleCalendarExtraPanel() {
  const [connected, setConnected] = useState(false)
  const [calendarId, setCalendarId] = useState('primary')
  const [syncing, setSyncing] = useState(false)
  const [log, setLog] = useState<CalendarSyncLogEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  async function load() {
    const integ = await provider.getIntegration()
    setConnected(!!integ?.connected)
    if (integ) { setCalendarId(integ.calendarId); void provider.getSyncLog().then(setLog) }
    setLoaded(true)
  }
  useEffect(() => { void load() }, [])

  // Before connecting there's nothing to configure here.
  if (!loaded || !connected) return null

  async function handleSaveCalendar() {
    await provider.setCalendar(calendarId)
    toast.success('Saved')
  }
  async function handleSyncNow() {
    setSyncing(true)
    try { const r = await provider.syncNow(); toast.success(`Synced — ${r.written} updated`); void provider.getSyncLog().then(setLog) }
    catch (e: any) { toast.error(e?.message ?? 'Sync failed') }
    finally { setSyncing(false) }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[200px]">
          <span className="text-xs font-medium text-muted-foreground">Calendar ID</span>
          <input value={calendarId} onChange={(e) => setCalendarId(e.target.value)} placeholder="primary"
            className="w-full mt-1 rounded-input border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <Button variant="outline" size="sm" onClick={handleSaveCalendar}>Save</Button>
        <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync now
        </Button>
      </div>

      {log.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><h4 className="text-sm font-semibold">History</h4></div>
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
