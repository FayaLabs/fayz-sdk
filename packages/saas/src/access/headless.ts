import type { PermissionAction, Plan } from '@fayz-ai/core'
import { countByTenant } from '@fayz-ai/core'
import { resolveAccess, agentDenial, type AgentGuardResult } from '@fayz-ai/core/access'
import { useAuthStore } from '@fayz-ai/auth'
import { useOrganizationStore } from '../org/store'
import { usePermissionsStore } from '../permissions/store'
import { useBillingStore } from '../billing/store'
import { getLimitDeclaration } from './limits-registry'
import type { AccessSession } from './types'

// ---------------------------------------------------------------------------
// Headless access — the imperative counterpart of useAccess()/useLimitGuard()
// for runtimes without React: the agent's client-plane tool executor, command
// handlers, background sync. Reads the SAME singleton stores the providers
// hydrate, and decides with the SAME engine (@fayz-ai/core/access), so a
// decision here never diverges from what the UI shows.
//
// Denials come back as the structured AgentDenial (never a silent failure) so
// an agent can explain the denial and offer the upgrade conversationally.
// ---------------------------------------------------------------------------

/**
 * Snapshot of the live session assembled from the singleton stores — the same
 * assembly AccessProvider does reactively. Values are as-hydrated: before
 * AuthProvider/OrgProvider finish, fields are null (and decisions fail-open on
 * profile, closed on nothing — same semantics as the providers).
 */
export function getAccessSnapshot(): AccessSession {
  const user = useAuthStore.getState().user
  const org = useOrganizationStore.getState().currentOrg
  const profile = usePermissionsStore.getState().currentProfile
  const plans = useBillingStore.getState().plans
  const plan: Plan | null = org?.plan ? plans.find((p) => p.id === org.plan) ?? null : null
  return { user, org, profile, plan }
}

/** Imperative role × plan check over the live snapshot. */
export function checkAccess(feature: string, action?: PermissionAction): AgentGuardResult {
  const session = getAccessSnapshot()
  const decision = resolveAccess(session, feature, action)
  if (decision.allowed) return { allowed: true }
  return agentDenial(decision.reason ?? 'role')
}

/**
 * Imperative plan-limit guard: would adding `n` rows exceed the cap for
 * `key`? Counts FRESH (never trusts stale hook state), mirrors useLimitGuard.
 * No declaration / no cap / `-1` / no tenant ⇒ allowed. Does NOT open the
 * UpgradeModal — the caller decides how to surface the denial (an agent turns
 * it into a conversational upgrade prompt).
 */
export async function guardLimit(key: string, n = 1): Promise<AgentGuardResult> {
  const session = getAccessSnapshot()
  const tenantId = session.org?.id
  const cap = session.plan?.entitlements?.limits?.[key]
  const declaration = getLimitDeclaration(key)

  if (!declaration || cap === undefined || cap === -1 || !tenantId) return { allowed: true }

  const used = await countByTenant(declaration.table, {
    kind: declaration.kindFilter,
    period: declaration.period,
    tenantId,
    fresh: true,
  })

  if (used + n > cap) {
    return agentDenial('limit', { key, max: cap, used })
  }
  return { allowed: true }
}
