import type { Plan } from '@fayz-ai/core'

export interface PlanBadgeInfo {
  /** Display label, e.g. 'Free' or 'Pro'. */
  label: string
  /** Resolved plan id (falls back to the raw org.plan string). */
  planId: string
  /** Paid plan (price > 0) — drives the Crown icon + gold styling in the menus. */
  paid: boolean
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/**
 * Resolve an org's `plan` string against the configured billing plans into the
 * badge shown next to the user in both menus. Falls back to a capitalized
 * version of the raw string when the id isn't in config (defensive — e.g. a
 * legacy 'free' tenant before billing was wired).
 */
export function resolvePlanBadge(
  planId: string | undefined | null,
  plans: Plan[],
): PlanBadgeInfo {
  const id = planId || 'free'
  const match = plans.find((p) => p.id === id)
  if (match) {
    return { label: match.name, planId: match.id, paid: match.price > 0 }
  }
  return { label: capitalize(id), planId: id, paid: false }
}
