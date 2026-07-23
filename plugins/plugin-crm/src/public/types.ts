// ---------------------------------------------------------------------------
// Public lead capture — types
//
// The contract between a marketing site's own form UI and the CRM. Sites keep
// their bespoke layout and copy; all they hand over is a bag of values. Where
// that lands (which tenant, which table, what status) is decided by the SDK and
// the RPC behind it, never by the site.
// ---------------------------------------------------------------------------

/** What a form field may carry. Scalars and scalar lists — anything a checkbox
 *  group, a select or a text input produces. Files are out of scope: a lead
 *  form links to an upload, it does not embed one. */
export type LeadFieldValue = string | number | boolean | null | string[] | number[]

/** The values a site collects, keyed by field id. Free-form on purpose: a new
 *  landing page adds keys without touching the schema. */
export type LeadFields = Record<string, LeadFieldValue>

/**
 * One form the site exposes. Registered up-front so submissions carry a stable
 * id (attribution) and a human name (what the operator reads in the CRM).
 */
export interface PublicFormDef {
  /** Stable id — the attribution key. Keep it stable across redesigns. */
  id: string
  /** Human name shown as the lead's source in the CRM. */
  name: string
  /**
   * Field ids that must be present and non-empty for the submission to be
   * attempted. Contact reachability (phone or email) is enforced server-side
   * regardless of what is declared here.
   */
  required?: string[]
  /**
   * Maps this form's field ids onto the lead's identity columns. Everything NOT
   * mapped stays in `fields` as a custom field.
   *
   * Defaults to { name: 'name', phone: 'phone', email: 'email' }.
   */
  identity?: {
    name?: string
    phone?: string
    email?: string
    /** Field whose value becomes the lead's free-text note. */
    notes?: string
  }
  /** Labels for custom fields, so the CRM shows "Faixa etária" not "age_range". */
  labels?: Record<string, string>
}

/** Result of a submission — enough for the site to show its own success state. */
export interface LeadSubmitResult {
  leadId: string
  createdAt: string
  /** False when the CRM write succeeded but the inbox notification did not. */
  notified: boolean
}

/** Thrown for problems the site should surface differently than a crash. */
export type LeadSubmitErrorKind =
  | 'validation'   // missing required field / no contact channel
  | 'duplicate'    // same contact, same form, seconds apart
  | 'rate_limited' // burst cap tripped
  | 'unavailable'  // backend not configured or unreachable

export class LeadSubmitError extends Error {
  readonly kind: LeadSubmitErrorKind
  constructor(kind: LeadSubmitErrorKind, message: string) {
    super(message)
    this.name = 'LeadSubmitError'
    this.kind = kind
  }
}

/** UTM/attribution captured from the browser, merged into every submission. */
export interface LeadAttribution {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  /** Path the form was submitted from. */
  landing_page?: string
  referrer?: string
}

/** The transport a submission goes through. Swappable for tests. */
export interface PublicLeadDataProvider {
  createLead(input: {
    formId: string
    formName: string
    name: string
    phone?: string
    email?: string
    notes?: string
    fields: LeadFields
    attribution: LeadAttribution
  }): Promise<{ leadId: string; createdAt: string }>
}

/** Notifies the site's admin that a lead arrived. */
export interface LeadNotifier {
  notify(input: {
    formId: string
    formName: string
    leadName: string
    phone?: string
    email?: string
    fields: LeadFields
    labels?: Record<string, string>
    attribution: LeadAttribution
  }): Promise<void>
}
