import { describe, it, expect } from 'vitest'
import type { PermissionProfile, Plan } from '@fayz-ai/core'
import { resolveAccess, isEntitledByPlan, resolveLimit } from './resolver'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ownerProfile: PermissionProfile = { id: 'owner', name: 'Owner', grants: {} }

const staffProfile: PermissionProfile = {
  id: 'staff',
  name: 'Staff',
  grants: { clients: ['read'], reports: ['read', 'edit'] },
}

function plan(entitlements: Plan['entitlements']): Plan {
  return {
    id: 'p',
    name: 'Plan',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [],
    entitlements,
  }
}

// ---------------------------------------------------------------------------
// resolveAccess — role × plan composition
// ---------------------------------------------------------------------------

describe('resolveAccess', () => {
  it('denies by ROLE when the profile lacks the grant (non-owner)', () => {
    const d = resolveAccess({ profile: staffProfile, plan: null }, 'marketing')
    expect(d).toEqual({ allowed: false, reason: 'role' })
  })

  it('role denial takes precedence over plan denial', () => {
    // staff lacks 'marketing' (role) AND the plan gates it off (plan). Role wins.
    const p = plan({ features: { marketing: false } })
    const d = resolveAccess({ profile: staffProfile, plan: p }, 'marketing')
    expect(d.reason).toBe('role')
  })

  it('allows when role grants and the plan does not gate the feature', () => {
    const d = resolveAccess({ profile: staffProfile, plan: plan({}) }, 'clients')
    expect(d).toEqual({ allowed: true })
  })

  it('denies by PLAN when role grants but the plan gates the feature off', () => {
    const p = plan({ features: { reports: false } })
    const d = resolveAccess({ profile: staffProfile, plan: p }, 'reports')
    expect(d).toEqual({ allowed: false, reason: 'plan' })
  })

  it('OWNER passes the role check but does NOT bypass the plan', () => {
    const p = plan({ features: { reports: false } })
    const d = resolveAccess({ profile: ownerProfile, plan: p }, 'reports')
    expect(d).toEqual({ allowed: false, reason: 'plan' })
  })

  it('owner is allowed when the plan does not gate the feature', () => {
    const d = resolveAccess({ profile: ownerProfile, plan: plan({}) }, 'anything')
    expect(d).toEqual({ allowed: true })
  })

  it('a feature absent from entitlements is allowed (additive plans)', () => {
    const p = plan({ features: { other: false } })
    const d = resolveAccess({ profile: ownerProfile, plan: p }, 'prontuario')
    expect(d).toEqual({ allowed: true })
  })

  it('respects the action argument (manage/absent)', () => {
    // staff has clients:['read'] only → write denied by role.
    expect(resolveAccess({ profile: staffProfile, plan: null }, 'clients', 'write').reason).toBe('role')
    expect(resolveAccess({ profile: staffProfile, plan: null }, 'clients', 'read').allowed).toBe(true)
  })

  it('impersonation preview composes: previewing a restricted role loses owner bypass', () => {
    // During impersonation the session.profile IS the previewed (staff) role.
    const d = resolveAccess({ profile: staffProfile, plan: plan({}) }, 'billing')
    expect(d).toEqual({ allowed: false, reason: 'role' })
  })
})

// ---------------------------------------------------------------------------
// isEntitledByPlan
// ---------------------------------------------------------------------------

describe('isEntitledByPlan', () => {
  it('null plan is entitled (no gating)', () => {
    expect(isEntitledByPlan(null, 'reports')).toBe(true)
  })
  it('explicit false denies', () => {
    expect(isEntitledByPlan(plan({ features: { reports: false } }), 'reports')).toBe(false)
  })
  it('explicit true and absent both allow', () => {
    expect(isEntitledByPlan(plan({ features: { reports: true } }), 'reports')).toBe(true)
    expect(isEntitledByPlan(plan({}), 'reports')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// resolveLimit — quantity math
// ---------------------------------------------------------------------------

describe('resolveLimit', () => {
  it('unlimited when there is no declaration', () => {
    const s = resolveLimit({ cap: 100, hasDeclaration: false, used: 50 })
    expect(s.unlimited).toBe(true)
    expect(s.max).toBe(Infinity)
    expect(s.atLimit).toBe(false)
  })

  it('unlimited when the plan has no cap for the key', () => {
    const s = resolveLimit({ cap: undefined, hasDeclaration: true, used: 999 })
    expect(s.unlimited).toBe(true)
  })

  it('-1 means unlimited', () => {
    const s = resolveLimit({ cap: -1, hasDeclaration: true, used: 999 })
    expect(s.unlimited).toBe(true)
    expect(s.remaining).toBe(Infinity)
  })

  it('computes remaining and not-at-limit below the cap', () => {
    const s = resolveLimit({ cap: 100, hasDeclaration: true, used: 40 })
    expect(s).toMatchObject({ unlimited: false, max: 100, remaining: 60, atLimit: false })
  })

  it('atLimit when used reaches the cap', () => {
    const s = resolveLimit({ cap: 100, hasDeclaration: true, used: 100 })
    expect(s.atLimit).toBe(true)
    expect(s.remaining).toBe(0)
  })

  it('clamps remaining at 0 when over the cap', () => {
    const s = resolveLimit({ cap: 2, hasDeclaration: true, used: 5 })
    expect(s.remaining).toBe(0)
    expect(s.atLimit).toBe(true)
  })
})
