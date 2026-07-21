import * as React from 'react'
import type { LimitDeclaration, PermissionAction, Plan } from '@fayz-ai/core'
import { countByTenant, usePluginRuntimeOptional } from '@fayz-ai/core'
import { useAuthStore } from '@fayz-ai/auth'
import { useOrganizationStore } from '../org/store'
import { usePermissionsStore } from '../permissions/store'
import { useBillingStore } from '../billing/store'
import { resolveAccess, isEntitledByPlan, resolveLimit } from './resolver'
import { setLimitRegistry, getLimitDeclaration, subscribeLimit } from './limits-registry'
import { useUpgradeModalStore } from './upgrade-modal-store'
import type { AccessApi, AccessDecision, AccessSession, LimitState } from './types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AccessContextValue extends AccessApi {
  session: AccessSession
}

const AccessContext = React.createContext<AccessContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AccessProviderProps {
  children: React.ReactNode
  /**
   * App-level limit declarations layered ON TOP of the plugins' `declaredLimits`
   * (app wins on key collision). Sourced from `config.billing.limitDeclarations`.
   */
  limitDeclarations?: LimitDeclaration[]
}

/**
 * Assembles the reactive {@link AccessSession} from the singleton stores and
 * exposes the composed access API (role × plan). Thin by design — mounts just
 * inside PermissionsProvider so it can reuse the live permission profile and the
 * plugin runtime. Also publishes the merged limit declarations to the module
 * registry so `invalidateLimit` works from non-React create handlers.
 */
export function AccessProvider({ children, limitDeclarations }: AccessProviderProps) {
  const user = useAuthStore((s) => s.user)
  const org = useOrganizationStore((s) => s.currentOrg)
  const profile = usePermissionsStore((s) => s.currentProfile)
  const plans = useBillingStore((s) => s.plans)

  const runtime = usePluginRuntimeOptional()
  const pluginLimits = runtime?.pluginLimits

  // Merge plugin-declared limits with app overrides (app wins by key), then
  // publish to the module registry consumed by invalidateLimit / hooks.
  React.useEffect(() => {
    const byKey = new Map<string, LimitDeclaration>()
    for (const d of pluginLimits ?? []) byKey.set(d.key, d)
    for (const d of limitDeclarations ?? []) byKey.set(d.key, d)
    setLimitRegistry(Array.from(byKey.values()))
  }, [pluginLimits, limitDeclarations])

  const plan: Plan | null = React.useMemo(
    () => (org?.plan ? plans.find((p) => p.id === org.plan) ?? null : null),
    [plans, org?.plan],
  )

  const session: AccessSession = React.useMemo(
    () => ({ user, org, profile, plan }),
    [user, org, profile, plan],
  )

  const value = React.useMemo<AccessContextValue>(
    () => ({
      session,
      can: (feature, action) => resolveAccess(session, feature, action),
      entitled: (feature) => isEntitledByPlan(session.plan, feature),
    }),
    [session],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
AccessProvider.displayName = 'AccessProvider'

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const ALLOW_ALL: AccessApi = {
  can: () => ({ allowed: true }),
  entitled: () => true,
}

/**
 * The composed access API. Throws outside <AccessProvider> — use
 * {@link useAccessOptional} for SDK components that must degrade gracefully.
 */
export function useAccess(): AccessApi {
  const ctx = React.useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used inside <AccessProvider>')
  return { can: ctx.can, entitled: ctx.entitled }
}

/**
 * Like {@link useAccess} but degrades to allow-all when no provider is mounted,
 * so components stay usable under a bare host shell (gating is an enhancement).
 */
export function useAccessOptional(): AccessApi {
  const ctx = React.useContext(AccessContext)
  return ctx ? { can: ctx.can, entitled: ctx.entitled } : ALLOW_ALL
}

/** Internal: the live session (for hooks that need tenant/plan directly). */
function useAccessSession(): AccessSession | null {
  return React.useContext(AccessContext)?.session ?? null
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

function resolveCap(plan: Plan | null, key: string): number | undefined {
  return plan?.entitlements?.limits?.[key]
}

/**
 * Live usage of a quantity limit for the active tenant. Resolves the limit's
 * declaration (plugin manifest or app override) → a tenant-scoped `count(*)`,
 * capped by the current plan. No declaration or no cap (or `-1`) ⇒ unlimited.
 * Re-fetches when the tenant, plan cap, or an `invalidateLimit(key)` fires.
 */
export function useLimit(key: string): LimitState {
  const session = useAccessSession()
  const tenantId = session?.org?.id
  const cap = resolveCap(session?.plan ?? null, key)
  const declaration = getLimitDeclaration(key)

  const unlimited = !declaration || cap === undefined || cap === -1

  const [used, setUsed] = React.useState(0)
  const [loading, setLoading] = React.useState(!unlimited)
  const [version, setVersion] = React.useState(0)

  const refresh = React.useCallback(() => setVersion((v) => v + 1), [])

  // Wake on external invalidation (a create/delete elsewhere).
  React.useEffect(() => subscribeLimit(key, refresh), [key, refresh])

  React.useEffect(() => {
    if (unlimited || !declaration || !tenantId) {
      setUsed(0)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    countByTenant(declaration.table, {
      kind: declaration.kindFilter,
      period: declaration.period,
      tenantId,
      fresh: version > 0,
    })
      .then((n) => {
        if (active) {
          setUsed(n)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [unlimited, declaration, tenantId, version])

  const bounds = resolveLimit({ cap, hasDeclaration: Boolean(declaration), used })

  return { key, ...bounds, loading, refresh }
}

/**
 * Imperative guard for create handlers: `await guard(n)` returns `'ok'` when
 * adding `n` more rows stays within the cap, or `'blocked'` (and opens the global
 * UpgradeModal) when it would exceed it. Always checks a FRESH count so it never
 * relies on stale hook state.
 */
export function useLimitGuard(key: string): (n?: number) => Promise<'ok' | 'blocked'> {
  const session = useAccessSession()
  const tenantId = session?.org?.id
  const plan = session?.plan ?? null
  const openModal = useUpgradeModalStore((s) => s.open)

  return React.useCallback(
    async (n = 1) => {
      const cap = resolveCap(plan, key)
      const declaration = getLimitDeclaration(key)
      // Unlimited / no declaration / no tenant ⇒ never block.
      if (!declaration || cap === undefined || cap === -1 || !tenantId) return 'ok'

      const used = await countByTenant(declaration.table, {
        kind: declaration.kindFilter,
        period: declaration.period,
        tenantId,
        fresh: true,
      })

      if (used + n > cap) {
        openModal({ limitKey: key })
        return 'blocked'
      }
      return 'ok'
    },
    [key, plan, tenantId, openModal],
  )
}
