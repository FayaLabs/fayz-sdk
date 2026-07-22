export {
  isOwnerProfile,
  profileHasPermission,
  isEntitledByPlan,
  resolveAccess,
  resolveLimit,
} from './engine'
export type { DenyReason, AccessDecision, AccessSubject } from './engine'

export { UPGRADE_URL, agentDenial } from './denial'
export type { AgentDenial, AgentDenialLimit, AgentGuardResult } from './denial'

export { mergeLimitDeclarations } from './limits'
