import type { PermissionProfile, PermissionAction } from '../types/permissions'
import type { Plan } from '../types/billing'

// ---------------------------------------------------------------------------
// The access engine — the ONE implementation of the role × plan × limit
// decision, shared by every runtime that gates anything:
//
//   - browser (saas AccessProvider / PermissionsProvider re-export from here)
//   - headless client-plane (saas access/headless.ts)
//   - the Fayz broker (server-side agent authorization imports this package)
//
// Hard constraint: this module (and everything under core/src/access) must stay
// free of React, zustand and supabase — pure functions over plain data — so the
// exact same code runs in Node/edge. Guarded by scripts/check-access-purity.mjs.
// ---------------------------------------------------------------------------

/** Why an access request was denied. `limit` only occurs on guarded writes. */
export type DenyReason = 'role' | 'plan' | 'limit'

export interface AccessDecision {
  allowed: boolean
  reason?: DenyReason
}

/** The minimal subject a decision needs — a projection of any richer session. */
export interface AccessSubject {
  /** Effective RBAC profile — the previewed role during impersonation. */
  profile: PermissionProfile | null
  /** The tenant's currently-active plan. */
  plan: Plan | null
}

/**
 * The org owner has every permission implicitly. Owner is represented by the
 * canonical role id `owner` across adapters (see org/adapters/supabase.ts
 * buildPermissionProfiles, which also grants owner all catalog perms, and the
 * mock adapter's `owner` fallback). We match by id first, falling back to the
 * (possibly localized) name for safety.
 */
export function isOwnerProfile(profile: PermissionProfile): boolean {
  return profile.id === 'owner' || profile.name?.toLowerCase() === 'owner'
}

/**
 * The single role-side permission check. The plan axis composes ON TOP of it in
 * {@link resolveAccess} instead of reimplementing owner-bypass / `manage`
 * semantics.
 */
export function profileHasPermission(
  profile: PermissionProfile | null,
  feature: string,
  action?: string,
): boolean {
  if (!profile) return true

  // Owner bypass: never lock the owner out, even if the RBAC catalog is empty
  // or still loading. Because permission checks read the *effective* profile,
  // an owner previewing a non-owner role correctly loses this bypass — the
  // preview stays honest.
  if (isOwnerProfile(profile)) return true

  const actions = profile.grants[feature]
  if (!actions) return false

  if (!action) return actions.length > 0

  return actions.includes(action) || actions.includes('manage')
}

/**
 * Does the current plan entitle `feature`? A plan gates a feature ONLY with an
 * explicit `false`; absent means "not gated by this plan" (allowed). This keeps
 * entitlements additive and safe: a feature the plan has never heard of stays
 * open rather than silently locking.
 */
export function isEntitledByPlan(plan: Plan | null, feature: string): boolean {
  return plan?.entitlements?.features?.[feature] !== false
}

/**
 * The single access decision: role FIRST, then plan.
 *
 * 1. Role — reuses `profileHasPermission` (owner bypass + `manage` semantics
 *    live there, and impersonation composes for free because `profile` is the
 *    previewed role). Denied → `{ allowed:false, reason:'role' }`.
 * 2. Plan — even the owner does NOT bypass the plan: upgrading is the tenant's
 *    decision, not a role power. Denied → `{ allowed:false, reason:'plan' }`.
 */
export function resolveAccess(
  subject: AccessSubject,
  feature: string,
  action?: PermissionAction,
): AccessDecision {
  if (!profileHasPermission(subject.profile, feature, action)) {
    return { allowed: false, reason: 'role' }
  }
  if (!isEntitledByPlan(subject.plan, feature)) {
    return { allowed: false, reason: 'plan' }
  }
  return { allowed: true }
}

/**
 * Pure numeric side of a limit: given the plan cap, whether a countable
 * declaration exists, and the current usage, derive the limit math. Unlimited
 * when there's no declaration to count, no cap on the plan, or the cap is `-1`.
 */
export function resolveLimit(params: { cap: number | undefined; hasDeclaration: boolean; used: number }): {
  max: number
  used: number
  remaining: number
  atLimit: boolean
  unlimited: boolean
} {
  const { cap, hasDeclaration, used } = params
  const unlimited = !hasDeclaration || cap === undefined || cap === -1
  const max = unlimited ? Infinity : cap
  const remaining = unlimited ? Infinity : Math.max(0, max - used)
  const atLimit = !unlimited && used >= max
  return { max, used, remaining, atLimit, unlimited }
}
