// ---------------------------------------------------------------------------
// Supabase implementation of PublicLeadDataProvider — anon-safe.
//
// Public marketing pages run with the publishable (anon) key and NO user
// session, so canonical tenant RLS yields nothing. This provider touches only
// the one object designed for anon access:
//   - public.create_public_lead (SECURITY DEFINER RPC: validates, caps spam,
//     writes people[kind=lead] with the custom fields in metadata)
// Shipped by plugins/plugin-crm/src/migrations/005_public_lead.sql.
//
// The RPC never reads back — a form writes, it does not query the CRM.
// ---------------------------------------------------------------------------

import { getFayzCloudClient, getSupabaseClientOptional } from '@fayz-ai/core'
import { LeadSubmitError, type PublicLeadDataProvider } from './types'

export interface SupabasePublicLeadOptions {
  /** The tenant leads land in (RPC arg — required). */
  tenantId: string
}

interface SupabaseLikeClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

function getClient(): SupabaseLikeClient | null {
  return (getSupabaseClientOptional() ?? getFayzCloudClient()) as SupabaseLikeClient | null
}

/** Map the RPC's RAISE EXCEPTION messages onto kinds the site can branch on. */
function toSubmitError(message: string): LeadSubmitError {
  const m = message.toLowerCase()
  if (m.includes('duplicate submission')) {
    return new LeadSubmitError('duplicate', 'Recebemos seu contato há instantes.')
  }
  if (m.includes('too many submissions')) {
    return new LeadSubmitError('rate_limited', 'Muitos envios agora há pouco. Tente em instantes.')
  }
  if (
    m.includes('invalid') ||
    m.includes('required') ||
    m.includes('too many fields') ||
    m.includes('fields too large')
  ) {
    return new LeadSubmitError('validation', message)
  }
  return new LeadSubmitError('unavailable', message)
}

export function createSupabasePublicLeadProvider(
  options: SupabasePublicLeadOptions,
): PublicLeadDataProvider {
  const { tenantId } = options

  return {
    async createLead(input) {
      const client = getClient()
      if (!client) {
        throw new LeadSubmitError(
          'unavailable',
          '[plugin-crm/public] no Supabase client — register one with setGlobalSupabaseClient.',
        )
      }

      const { data, error } = await client.rpc('create_public_lead', {
        p_tenant_id: tenantId,
        p_name: input.name,
        p_phone: input.phone ?? null,
        p_email: input.email ?? null,
        p_form_id: input.formId,
        p_form_name: input.formName,
        p_fields: input.fields,
        p_notes: input.notes ?? null,
        p_utm: input.attribution,
      })

      if (error) throw toSubmitError(error.message)

      const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined
      if (!row?.lead_id) {
        throw new LeadSubmitError('unavailable', 'Lead não foi criado.')
      }
      return { leadId: String(row.lead_id), createdAt: String(row.created_at) }
    },
  }
}
