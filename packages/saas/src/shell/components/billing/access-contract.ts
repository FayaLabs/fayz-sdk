// ---------------------------------------------------------------------------
// access-contract — the single import seam the billing UI uses for the
// entitlements engine (UpgradePrompt, UpgradeModal, EntitlementGate, LimitGate,
// SoftLimitBanner, the AdminShell route guard / nav badge, SubscriptionPage
// matrix). Re-exports the core access engine (packages/saas/src/access) so the
// billing layer has ONE stable path and the wiring (AccessProvider) stays in the
// núcleo. `getPlanEntitlements` is a thin local reader — core's Plan carries the
// entitlements, so this just narrows the access.
//
// (History: this file shipped as a temporary stub while the access engine landed
// in parallel; now repointed to the real module. The public names/types below
// match the fixed contract, so no billing-wave consumer changed.)
// ---------------------------------------------------------------------------
import type { Plan, PlanEntitlements } from '@fayz-ai/core'

export {
  useAccessOptional,
  useLimit,
  useLimitGuard,
  invalidateLimit,
  useUpgradeModalStore,
} from '../../../access'

export type { AccessApi, AccessDecision } from '../../../access'
// The billing layer refers to the limit shape as `LimitInfo`; the engine calls
// it `LimitState`. Same structure — alias to keep call sites stable.
export type { LimitState as LimitInfo } from '../../../access'
export type { PlanEntitlements } from '@fayz-ai/core'

/** Narrow a plan to its entitlements (undefined when the plan declares none). */
export function getPlanEntitlements(plan: Plan | undefined | null): PlanEntitlements | undefined {
  return plan?.entitlements
}
