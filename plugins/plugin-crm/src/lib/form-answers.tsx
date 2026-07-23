import React from 'react'

// ---------------------------------------------------------------------------
// Rendering whatever a public form captured.
//
// Deliberately schema-free. Every landing page asks something different — hair
// coverage on one, a coupon on another, subject/message on a third — and the
// capture side (create_public_lead) already stores the answers as an opaque bag
// so a new campaign ships with no migration. The display side needs the same
// property: anything typed here makes the NEXT form invisible.
//
// Shared because two views show the same data and had drifted: the lead detail
// page rendered answers with private helpers, while the pipeline card rendered
// none at all.
// ---------------------------------------------------------------------------

/** `hair_remaining` / `hairRemaining` → "Hair remaining". Keys that arrive
 *  already humanized ("Assunto") come back unchanged. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Arrays are joined rather than dropped: a multi-select ("Preocupações") is
 *  often the most qualifying answer on the form. */
export function renderFieldValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value.length ? value.join(', ') : null
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Answer entries worth showing, empty values already removed. */
export function answerEntries(fields: unknown): Array<[string, unknown]> {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return []
  return Object.entries(fields as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
}
