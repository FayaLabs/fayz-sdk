// ---------------------------------------------------------------------------
// Fayz inbox notifier — tells the site's owner a lead just arrived.
//
// The Fayz platform already ships a public ingest endpoint built for exactly
// this ("Deployed user-sites POST here"): it stores an InboxRecord against the
// project and emails the project owner. We only have to speak to it.
//
//   POST <base>/public/projects/:projectId/inbox
//   { source, subject, payload, metadata }
//
// SAME-ORIGIN BY DEFAULT. In production the API's CORS allowlist is a single
// origin (the editor), so a cross-origin POST from a published site would be
// refused at preflight. Fayz's Caddy proxies `/api/*` to the API "regardless of
// host", so a published site — custom domain included — reaches it same-origin
// with no preflight at all. Hence the default base '/api' (relative). Only pass
// an absolute base when the site is NOT served by Fayz, and expect to widen
// CORS on the API before it works.
//
// Best-effort by contract: the lead is already safe in the CRM by the time this
// runs. A failed notification is logged and swallowed — never a failed form.
// ---------------------------------------------------------------------------

import type { LeadNotifier, LeadFields } from './types'

export interface FayzInboxNotifierOptions {
  /**
   * Fayz project id. Injected into published builds as VITE_FAYZ_PROJECT_ID;
   * omit to read that env var automatically.
   */
  projectId?: string
  /**
   * API base. Defaults to '/api' (same-origin via Caddy) — see the note above
   * before changing it.
   */
  apiBaseUrl?: string
  /** Milliseconds before giving up. The visitor is waiting; keep it short. */
  timeoutMs?: number
}

function readEnv(key: string): string | undefined {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    return env?.[key]
  } catch {
    return undefined
  }
}

/** "age_range" → "Age range", unless the form gave us a real label. */
function humanize(key: string, labels?: Record<string, string>): string {
  if (labels?.[key]) return labels[key]
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return String(value)
}

/**
 * Builds the flat, already-humanized payload the inbox renders. The editor
 * shows this verbatim, so it must read like a message — not like a database row.
 */
function buildPayload(
  input: Parameters<LeadNotifier['notify']>[0],
): Record<string, string> {
  const payload: Record<string, string> = { Nome: input.leadName }
  if (input.phone) payload['Telefone'] = input.phone
  if (input.email) payload['E-mail'] = input.email

  for (const [key, value] of Object.entries(input.fields as LeadFields)) {
    payload[humanize(key, input.labels)] = renderValue(value)
  }

  const { utm_source, utm_medium, utm_campaign, landing_page } = input.attribution
  if (utm_source) payload['Origem'] = utm_source
  if (utm_medium) payload['Mídia'] = utm_medium
  if (utm_campaign) payload['Campanha'] = utm_campaign
  if (landing_page) payload['Página'] = landing_page

  return payload
}

/**
 * A notifier that posts to the Fayz project inbox. Returns a no-op notifier
 * (with one loud warning) when no project id is resolvable, so a site running
 * outside Fayz still submits leads normally.
 */
export function createFayzInboxNotifier(options: FayzInboxNotifierOptions = {}): LeadNotifier {
  const projectId = options.projectId ?? readEnv('VITE_FAYZ_PROJECT_ID')
  const apiBaseUrl = (options.apiBaseUrl ?? readEnv('VITE_FAYZ_API_BASE_URL') ?? '/api').replace(/\/$/, '')
  const timeoutMs = options.timeoutMs ?? 4000

  if (!projectId) {
    let warned = false
    return {
      async notify() {
        if (!warned && typeof console !== 'undefined') {
          warned = true
          console.warn(
            '[plugin-crm/public] no VITE_FAYZ_PROJECT_ID — leads are saved to the CRM but the ' +
              'site owner is NOT notified in the Fayz inbox.',
          )
        }
      },
    }
  }

  return {
    async notify(input) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
      try {
        const res = await fetch(`${apiBaseUrl}/public/projects/${projectId}/inbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller?.signal,
          body: JSON.stringify({
            source: 'form',
            subject: `Novo lead: ${input.leadName} — ${input.formName}`,
            payload: buildPayload(input),
            metadata: { formId: input.formId, formName: input.formName, ...input.attribution },
          }),
        })
        if (!res.ok) {
          throw new Error(`inbox responded ${res.status}`)
        }
      } finally {
        if (timer) clearTimeout(timer)
      }
    },
  }
}
