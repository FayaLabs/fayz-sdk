// ---------------------------------------------------------------------------
// Public forms plugin — "the site collects, the SDK decides where it goes".
//
// Headless on purpose. Marketing sites have bespoke, brand-heavy forms; taking
// over their markup would be a downgrade. So this ships no UI: a site keeps its
// own inputs and calls submit() with a plain object of values.
//
// Every submission fans out to two places, in this order:
//   1. the tenant's CRM (create_public_lead) — the record of truth
//   2. the Fayz project inbox — so the site owner is told, and gets the email
// Step 2 is best-effort: a notification outage must never cost a lead.
// ---------------------------------------------------------------------------

import { createElement, type FC, type ReactNode } from 'react'
import type { PluginManifest, PluginScope, VerticalId } from '@fayz-ai/core'
import { createSupabasePublicLeadProvider } from './data.supabase'
import { createFayzInboxNotifier } from './inbox'
import { PublicFormsProvider } from './context'
import {
  LeadSubmitError,
  type LeadAttribution,
  type LeadFields,
  type LeadNotifier,
  type LeadSubmitResult,
  type PublicFormDef,
  type PublicLeadDataProvider,
} from './types'

export interface PublicFormsOptions {
  /**
   * Tenant the leads land in. REQUIRED — this is the whole point of the
   * abstraction: the site never names a table, only a tenant.
   */
  tenantId: string
  /** The forms this site exposes, keyed by id. */
  forms: PublicFormDef[]
  /**
   * Notify the site owner in the Fayz project inbox. Default true; resolves the
   * project from VITE_FAYZ_PROJECT_ID. Pass false for sites outside Fayz.
   */
  inbox?: boolean | { projectId?: string; apiBaseUrl?: string }
  /** Inject a custom transport (tests, or a non-Supabase backend). */
  dataProvider?: PublicLeadDataProvider
  /** Inject a custom notifier (tests). */
  notifier?: LeadNotifier
  scope?: PluginScope
  verticalId?: VerticalId
}

export interface PublicFormsPlugin {
  manifest: PluginManifest
  Provider: FC<{ children: ReactNode }>
  /** Imperative submit, for code paths outside React. */
  submit(formId: string, values: LeadFields): Promise<LeadSubmitResult>
}

/** Reads UTM + page context off the browser. Safe to call during SSR. */
export function readAttribution(): LeadAttribution {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const pick = (k: string) => params.get(k) || undefined
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_term: pick('utm_term'),
    utm_content: pick('utm_content'),
    landing_page: window.location.pathname,
    referrer: document.referrer || undefined,
  }
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

export function createPublicFormsPlugin(options: PublicFormsOptions): PublicFormsPlugin {
  const { tenantId } = options
  const formsById = new Map(options.forms.map((f) => [f.id, f]))

  const provider: PublicLeadDataProvider =
    options.dataProvider ?? createSupabasePublicLeadProvider({ tenantId })

  const notifier: LeadNotifier | null =
    options.notifier ??
    (options.inbox === false
      ? null
      : createFayzInboxNotifier(typeof options.inbox === 'object' ? options.inbox : {}))

  async function submit(formId: string, values: LeadFields): Promise<LeadSubmitResult> {
    const form = formsById.get(formId)
    if (!form) {
      throw new LeadSubmitError('validation', `[plugin-crm/public] unknown form "${formId}".`)
    }

    // Identity fields are pulled OUT of the bag; whatever remains is custom.
    const idMap = { name: 'name', phone: 'phone', email: 'email', ...form.identity }
    const name = String(values[idMap.name] ?? '').trim()
    const phone = idMap.phone ? String(values[idMap.phone] ?? '').trim() : ''
    const email = idMap.email ? String(values[idMap.email] ?? '').trim() : ''
    const notes = idMap.notes ? String(values[idMap.notes] ?? '').trim() : ''

    for (const key of form.required ?? []) {
      if (isEmpty(values[key])) {
        throw new LeadSubmitError('validation', `Campo obrigatório: ${form.labels?.[key] ?? key}`)
      }
    }
    if (!name) throw new LeadSubmitError('validation', 'Nome é obrigatório.')
    if (!phone && !email) {
      throw new LeadSubmitError('validation', 'Informe telefone ou e-mail.')
    }

    const identityKeys = new Set(Object.values(idMap).filter(Boolean) as string[])
    const fields: LeadFields = Object.fromEntries(
      Object.entries(values).filter(([k, v]) => !identityKeys.has(k) && !isEmpty(v)),
    )

    const attribution = readAttribution()

    // 1. CRM — if this throws, the submission failed and the site says so.
    const { leadId, createdAt } = await provider.createLead(
      stripUndefined({
        formId: form.id,
        formName: form.name,
        name,
        phone: phone || undefined,
        email: email || undefined,
        notes: notes || undefined,
        fields,
        attribution,
      }),
    )

    // 2. Inbox — the lead is already safe; never fail the form over a notice.
    let notified = false
    if (notifier) {
      try {
        await notifier.notify({
          formId: form.id,
          formName: form.name,
          leadName: name,
          phone: phone || undefined,
          email: email || undefined,
          fields,
          labels: form.labels,
          attribution,
        })
        notified = true
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.error('[plugin-crm/public] lead saved but inbox notification failed:', err)
        }
      }
    }

    return { leadId, createdAt, notified }
  }

  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(PublicFormsProvider, { forms: formsById, submit, children })
  Provider.displayName = 'PublicFormsProvider'

  const manifest: PluginManifest = {
    id: 'public-forms',
    name: 'Formulários',
    icon: 'Inbox',
    version: '0.1.0',
    scope: options.scope ?? 'universal',
    verticalId: options.verticalId,
    scaffolds: ['website', 'landing_page'],
    defaultEnabled: true,
    dependencies: [],
    // Headless: the site owns the markup, so this plugin mounts no route and
    // contributes no navigation. It exists to be registered and provide context.
    navigation: [],
    routes: [],
    widgets: [],
  }

  return { manifest, Provider, submit }
}
