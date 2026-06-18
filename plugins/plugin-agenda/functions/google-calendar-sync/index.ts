// google-calendar-sync — bidirectional Google Calendar sync (data plane).
//
// Holds the Google OAuth client secret server-side. Actions:
//   oauth_start     → return the Google consent URL
//   oauth_callback  → exchange the code, store the refresh token (Google redirect)
//   push_event      → outbound: a booking change → create/update/delete a Google event
//   pull_events     → inbound: incremental list of Google changes → update bookings
//   watch           → register/refresh a Google push channel
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GCAL_REDIRECT_URI,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// The booking↔event link is stored on saas_core.bookings.metadata.googleCalendarEventId.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const CAL_API = 'https://www.googleapis.com/calendar/v3'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

const env = (k: string) => Deno.env.get(k) ?? ''
const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

// --- OAuth helpers ----------------------------------------------------------

function consentUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    redirect_uri: env('GCAL_REDIRECT_URI'),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH}?${p.toString()}`
}

async function exchangeCode(code: string): Promise<any> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: env('GCAL_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  return res.json()
}

/** Return a valid access token for the integration, refreshing if expired. */
async function accessToken(db: any, integ: any): Promise<string> {
  const exp = integ.token_expires_at ? new Date(integ.token_expires_at).getTime() : 0
  if (integ.oauth_access_token && exp > Date.now() + 60_000) return integ.oauth_access_token
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: integ.oauth_refresh_token,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const tok = await res.json()
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString()
  await db.from('calendar_integrations').update({ oauth_access_token: tok.access_token, token_expires_at: expiresAt }).eq('id', integ.id)
  return tok.access_token
}

async function calApi(token: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${CAL_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (res.status === 204) return {}
  const text = await res.text()
  if (!res.ok) throw new Error(`Calendar API ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

// --- Booking ↔ event mapping (mirror of src/integrations/.../mapping.ts) -----

function bookingToEvent(b: any): any {
  const services = (b.metadata?.serviceNames as string) ?? ''
  const summary = [services, b.metadata?.contactName].filter(Boolean).join(' — ') || 'Appointment'
  return {
    summary,
    description: b.notes ?? undefined,
    start: { dateTime: b.starts_at },
    end: { dateTime: b.ends_at ?? b.starts_at },
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const db = admin()

  try {
    // OAuth callback arrives as a GET redirect from Google.
    const url = new URL(req.url)
    if (req.method === 'GET' && url.searchParams.has('code')) {
      const code = url.searchParams.get('code')!
      const state = url.searchParams.get('state') ?? ''
      const [tenantId, redirectTo] = state.split('::')
      const tok = await exchangeCode(code)
      const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString()
      await db.from('calendar_integrations').upsert({
        tenant_id: tenantId,
        provider: 'google',
        oauth_refresh_token: tok.refresh_token,
        oauth_access_token: tok.access_token,
        token_expires_at: expiresAt,
        active: true,
      }, { onConflict: 'tenant_id,provider' })
      return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectTo || '/' } })
    }

    const body = await req.json()
    const action = body.action as string

    if (action === 'oauth_start') {
      // state carries tenant + return URL so the GET callback can finish the link.
      const state = `${body.tenantId ?? ''}::${body.redirectTo ?? ''}`
      return json({ url: consentUrl(state) })
    }

    // Resolve the tenant's integration for the data actions.
    const tenantId = body.tenantId
    const { data: integ } = await db.from('calendar_integrations')
      .select('*').eq('provider', 'google').eq('active', true)
      .maybeSingle()
    if (!integ) return json({ error: 'Not connected' }, 400)
    const token = await accessToken(db, integ)
    const core = db.schema('saas_core')

    // ---- Outbound: booking change → Google event ----
    if (action === 'push_event') {
      const op = body.op as string // insert | update | delete
      const { data: booking } = await core.from('bookings').select('*').eq('id', body.bookingId).maybeSingle()
      const existingEventId = booking?.metadata?.googleCalendarEventId

      if (op === 'delete' || !booking) {
        if (existingEventId) await calApi(token, `/calendars/${encodeURIComponent(integ.calendar_id)}/events/${existingEventId}`, { method: 'DELETE' })
        await logRun(db, integ.tenant_id, 'outbound', body.op, 1)
        return json({ ok: true })
      }

      const event = bookingToEvent(booking)
      let saved: any
      if (existingEventId) {
        saved = await calApi(token, `/calendars/${encodeURIComponent(integ.calendar_id)}/events/${existingEventId}`, { method: 'PATCH', body: JSON.stringify(event) })
      } else {
        saved = await calApi(token, `/calendars/${encodeURIComponent(integ.calendar_id)}/events`, { method: 'POST', body: JSON.stringify(event) })
        await core.from('bookings').update({
          metadata: { ...(booking.metadata ?? {}), googleCalendarEventId: saved.id, googleCalendarSyncedAt: new Date().toISOString() },
        }).eq('id', booking.id)
      }
      await logRun(db, integ.tenant_id, 'outbound', 'on-write', 1)
      return json({ ok: true, eventId: saved.id })
    }

    // ---- Inbound: Google changes → bookings ----
    if (action === 'pull_events') {
      const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true', maxResults: '250' })
      if (integ.sync_token) params.set('syncToken', integ.sync_token)
      else params.set('timeMin', new Date(Date.now() - 30 * 86400_000).toISOString())
      const res = await calApi(token, `/calendars/${encodeURIComponent(integ.calendar_id)}/events?${params.toString()}`)
      let written = 0
      for (const ev of res.items ?? []) {
        // Find the booking linked to this event.
        const { data: rows } = await core.from('bookings').select('id, metadata, tenant_id')
          .eq('tenant_id', integ.tenant_id)
          .contains('metadata', { googleCalendarEventId: ev.id })
        const booking = (rows ?? [])[0]
        if (!booking) continue // event not originated here — skip (v1 scope)
        if (ev.status === 'cancelled') {
          await core.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id); written++
        } else if (ev.start?.dateTime) {
          await core.from('bookings').update({ starts_at: ev.start.dateTime, ends_at: ev.end?.dateTime ?? null }).eq('id', booking.id); written++
        }
      }
      if (res.nextSyncToken) await db.from('calendar_integrations').update({ sync_token: res.nextSyncToken, last_sync_at: new Date().toISOString() }).eq('id', integ.id)
      await logRun(db, integ.tenant_id, 'inbound', body.trigger ?? 'scheduled', res.items?.length ?? 0, written)
      return json({ fetched: res.items?.length ?? 0, written })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    return json({ error: String((err as any)?.message ?? err) }, 500)
  }
})

async function logRun(db: any, tenantId: string, direction: string, trigger: string, fetched = 0, written = 0) {
  await db.from('calendar_sync_log').insert({ tenant_id: tenantId, direction, trigger, status: 'success', fetched, written })
}
