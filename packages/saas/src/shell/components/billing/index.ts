export { SubscriptionPage } from './SubscriptionPage'
export { PlanSelector } from './PlanSelector'
export { SubscriptionCard } from './SubscriptionCard'
export { InvoiceList } from './InvoiceList'
export { UpgradePrompt } from './UpgradePrompt'
export type { UpgradePromptProps } from './UpgradePrompt'
export { UpgradeOverlay } from './UpgradeOverlay'
export type { UpgradeOverlayProps } from './UpgradeOverlay'
export { UpgradeModal } from './UpgradeModal'
export { SoftLimitBanner } from './SoftLimitBanner'
export { EntitlementGate, LimitGate } from './gates'
export type { EntitlementGateProps, LimitGateProps } from './gates'
// Entitlements access contract (TEMP STUB until packages/saas/src/access lands —
// orchestrator: repoint access-contract.ts re-exports on integration).
export {
  useAccessOptional,
  useLimit,
  useLimitGuard,
  useUpgradeModalStore,
  invalidateLimit,
  getPlanEntitlements,
} from './access-contract'
export type { AccessApi, AccessDecision, LimitInfo, PlanEntitlements } from './access-contract'
