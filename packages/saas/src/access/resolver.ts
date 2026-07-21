import type { PermissionAction, Plan } from '@fayz-ai/core'
import { profileHasPermission } from '../permissions/context'
import type { AccessDecision, AccessSession, LimitState } from './types'

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
 *
 * Pure and store-free so it is trivially unit-testable; the hook wires the live
 * session into it.
 */
export function resolveAccess(
  session: Pick<AccessSession, 'profile' | 'plan'>,
  feature: string,
  action?: PermissionAction,
): AccessDecision {
  if (!profileHasPermission(session.profile, feature, action)) {
    return { allowed: false, reason: 'role' }
  }
  if (!isEntitledByPlan(session.plan, feature)) {
    return { allowed: false, reason: 'plan' }
  }
  return { allowed: true }
}

/**
 * Pure numeric side of a limit: given the plan cap, whether a countable
 * declaration exists, and the current usage, derive the {@link LimitState} math.
 * Unlimited when there's no declaration to count, no cap on the plan, or the cap
 * is `-1`. Kept pure (no React/stores) so it is directly unit-testable.
 */
export function resolveLimit(params: {
  cap: number | undefined
  hasDeclaration: boolean
  used: number
}): Pick<LimitState, 'max' | 'used' | 'remaining' | 'atLimit' | 'unlimited'> {
  const { cap, hasDeclaration, used } = params
  const unlimited = !hasDeclaration || cap === undefined || cap === -1
  const max = unlimited ? Infinity : cap
  const remaining = unlimited ? Infinity : Math.max(0, max - used)
  const atLimit = !unlimited && used >= max
  return { max, used, remaining, atLimit, unlimited }
}
