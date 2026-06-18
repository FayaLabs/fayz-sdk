// Google Calendar integration — settings tab (control plane UI).
//
// Connect/disconnect, pick the target calendar, run a manual inbound sync, and
// see recent runs. Outbound (booking → Google) is automatic via the DB trigger;
// this screen is the only UI surface the integration needs.
import React, { useEffect, useState } from 'react'
import { Calendar, Plug, Power, RefreshCw, CheckCircle2, Loader2, History, AlertCircle } from 'lucide-react'
import { Button, toast } from '@fayz-ai/ui'
import { createGoogleCalendarProvider } from './data/supabase'
import type { CalendarIntegration, CalendarSyncLogEntry } from './types'

const provider = createGoogleCalendarProvider()

export function GoogleCalendarSettings() {
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [calendarId, setCalendarId] = useState('primary')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [log, setLog] = useState<CalendarSyncLogEntry[]>([])

  async function load() {
    setLoading(true)
    try {
      const found = await provider.getIntegration()
      setIntegration(found)
      if (found) { setCalendarId(found.calendarId); void provider.getSyncLog().then(setLog) }
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      const url = await provider.getConnectUrl()
      window.location.href = url // → Google consent, then back to the app
    } catch (e: any) {
      toast.error(e?.message ?? 'Connect failed')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    await provider.disconnect()
    toast.success('Disconnected')
    void load()
  }

  async function handleSaveCalendar() {
    await provider.setCalendar(calendarId)
    toast.success('Saved')
  }

  async function handleSyncNow() {
    setSyncing(true)
    try {
      const res = await provider.syncNow()
      toast.success(`Synced — ${res.written} updated`)
      void provider.getSyncLog().then(setLog)
      void load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Sync failed')
    } finally { setSyncing(false) }
  }

  const connected = !!integration?.connected

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Google Calendar</h2>
          <p className="text-sm text-muted-foreground">Two-way sync between your bookings and Google Calendar.</p>
        </div>
        {connected && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Connected
          </span>
        )}
      </div>

      <section className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
        ) : !connected ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Connect a Google account to sync bookings both ways.</p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Connect Google Calendar
            </Button>
          </div>
        ) : (
          <>
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
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Power className="h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>
            {integration?.lastSyncAt && (
              <p className="text-[11px] text-muted-foreground">Last sync: {new Date(integration.lastSyncAt).toLocaleString()}</p>
            )}
          </>
        )}
      </section>

      {log.length > 0 && (
        <section className="rounded-lg border bg-card shadow-sm p-5 space-y-2">
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">History</h3></div>
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
        </section>
      )}
    </div>
  )
}
