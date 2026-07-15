import { unmaskPhone } from '@fayz-ai/core'

/**
 * Canonical phone → auth email. Used by BOTH the phone-auth modal and any host
 * booking→auth bridge so the same number always maps to the same account
 * (Quaddro model: phone = identity). Pass the phone WITH its country dial so the
 * digits are globally unique.
 */
export function phoneToEmail(phoneWithDial: string): string {
  const digits = unmaskPhone(phoneWithDial)
  return `${digits || 'anon'}@phone.fayz.local`
}
