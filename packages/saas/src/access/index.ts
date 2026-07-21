// Access engine — the single point of access decision composing RBAC role
// (can?) × plan entitlements (entitled? how many?). See resolver.ts for the
// pure composition and context.tsx for the reactive session wiring.

export { AccessProvider, useAccess, useAccessOptional, useLimit, useLimitGuard } from './context'
export type { AccessProviderProps } from './context'

export { resolveAccess, isEntitledByPlan } from './resolver'

export { getAccessSnapshot, checkAccess, guardLimit } from './headless'
export { agentDenial, UPGRADE_URL } from '@fayz-ai/core/access'
export type { AgentDenial, AgentDenialLimit, AgentGuardResult } from '@fayz-ai/core/access'

export { invalidateLimit, setLimitRegistry, getLimitDeclaration, CORE_LIMIT_DECLARATIONS } from './limits-registry'

export { useUpgradeModalStore } from './upgrade-modal-store'
export type { UpgradeModalPayload, UpgradeModalStore } from './upgrade-modal-store'

export type {
  AccessApi,
  AccessDecision,
  AccessSession,
  DenyReason,
  LimitState,
} from './types'
