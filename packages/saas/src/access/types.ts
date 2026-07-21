import type { AuthUser, Organization, PermissionProfile, Plan, PermissionAction } from '@fayz-ai/core'

/**
 * Decision types come from the shared engine in @fayz-ai/core/access.
 * - `role`  — the user's RBAC profile lacks the permission (fix: grant the role).
 * - `plan`  — the tenant's plan does not entitle the feature (fix: upgrade).
 * - `limit` — a guarded write would exceed a plan cap (fix: upgrade).
 * The distinction drives the UI: `role` → AccessDenied, `plan`/`limit` →
 * UpgradePrompt/UpgradeModal.
 */
import type { AccessDecision } from '@fayz-ai/core/access'

export type { DenyReason, AccessDecision } from '@fayz-ai/core/access'

/**
 * The reactive snapshot the access engine resolves against. Assembled from the
 * singleton stores (auth user, current org incl. plan id, current permission
 * profile, billing plans). This is intentionally ONE extensible object: future
 * session parameters (active location, feature-flag cohort, delegated scope, …)
 * enter here so the resolver signature never churns.
 */
export interface AccessSession {
  user: AuthUser | null
  org: Organization | null
  /** Effective profile — becomes the previewed role during impersonation. */
  profile: PermissionProfile | null
  /** The org's currently-active plan (resolved from billing plans by org.plan). */
  plan: Plan | null
}

export interface LimitState {
  key: string
  /** Cap from the plan (`-1`/unlimited surfaces as `Infinity` here). */
  max: number
  used: number
  remaining: number
  atLimit: boolean
  unlimited: boolean
  loading: boolean
  /** Re-count (bypasses the short-lived cache). */
  refresh(): void
}

export interface AccessApi {
  can(feature: string, action?: PermissionAction): AccessDecision
  entitled(feature: string): boolean
}
