// ---------------------------------------------------------------------------
// @fayz-ai/plugin-crm/public — anon-safe lead capture for marketing sites.
//
// Headless: the site keeps its own form UI and calls useLeadForm(formId).submit
// with a bag of values. The SDK resolves where that goes (the tenant's CRM) and
// who is told (the Fayz project inbox).
// ---------------------------------------------------------------------------

export { createPublicFormsPlugin, readAttribution } from './createPublicFormsPlugin'
export type { PublicFormsOptions, PublicFormsPlugin } from './createPublicFormsPlugin'

export { PublicFormsProvider, useLeadForm } from './context'

export { createSupabasePublicLeadProvider } from './data.supabase'
export type { SupabasePublicLeadOptions } from './data.supabase'

export { createFayzInboxNotifier } from './inbox'
export type { FayzInboxNotifierOptions } from './inbox'

export { LeadSubmitError } from './types'
export type {
  LeadAttribution,
  LeadFieldValue,
  LeadFields,
  LeadNotifier,
  LeadSubmitErrorKind,
  LeadSubmitResult,
  PublicFormDef,
  PublicLeadDataProvider,
} from './types'
