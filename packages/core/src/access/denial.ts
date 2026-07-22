import type { DenyReason } from './engine'

// ---------------------------------------------------------------------------
// The structured denial an AGENT surface returns instead of failing silently
// (docs/ENTITLEMENTS.md § "Superfície de agentes de IA"). One shape for every
// executor — FAB client-plane, the Fayz broker, and the pool RPCs (which emit
// its jsonb mirror in their `denial` field) — so the model can explain the
// denial and offer the upgrade path conversationally.
// ---------------------------------------------------------------------------

/** Where a denied tenant goes to upgrade — the conversational UpgradeModal. */
export const UPGRADE_URL = '/settings/subscription'

export interface AgentDenialLimit {
  key: string
  max: number
  used: number
}

export interface AgentDenial {
  allowed: false
  reason: DenyReason
  /** Present when `reason === 'limit'`. */
  limit?: AgentDenialLimit
  upgradeUrl: string
}

export type AgentGuardResult = { allowed: true } | AgentDenial

/** Build a denial with the canonical upgrade URL attached. */
export function agentDenial(reason: DenyReason, limit?: AgentDenialLimit): AgentDenial {
  return { allowed: false, reason, ...(limit ? { limit } : {}), upgradeUrl: UPGRADE_URL }
}
