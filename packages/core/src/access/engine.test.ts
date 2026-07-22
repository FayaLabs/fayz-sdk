import { describe, it, expect } from 'vitest'
import type { PermissionProfile } from '../types/permissions'
import { profileHasPermission, isOwnerProfile, resolveAccess } from './engine'
import { agentDenial, UPGRADE_URL } from './denial'

// The composition matrix (role × plan × limit math) is covered by
// packages/saas/src/access/resolver.test.ts, which now runs against this
// engine through the saas re-export — parity by construction. Here we cover
// the pieces that are new or only reachable from core.

const staff: PermissionProfile = { id: 'staff', name: 'Staff', grants: { clients: ['read'] } }

describe('profileHasPermission', () => {
  it('null profile is allow-all (catalog not hydrated yet)', () => {
    expect(profileHasPermission(null, 'anything', 'delete')).toBe(true)
  })

  it('owner matches by id or (localized) name', () => {
    expect(isOwnerProfile({ id: 'owner', name: 'Proprietário', grants: {} })).toBe(true)
    expect(isOwnerProfile({ id: 'x', name: 'Owner', grants: {} })).toBe(true)
    expect(isOwnerProfile(staff)).toBe(false)
  })

  it('manage satisfies any action; empty grant list denies actionless check', () => {
    const manager: PermissionProfile = { id: 'm', name: 'M', grants: { clients: ['manage'], reports: [] } }
    expect(profileHasPermission(manager, 'clients', 'delete')).toBe(true)
    expect(profileHasPermission(manager, 'reports')).toBe(false)
  })
})

describe('agentDenial', () => {
  it('carries the canonical upgrade URL', () => {
    expect(agentDenial('plan')).toEqual({ allowed: false, reason: 'plan', upgradeUrl: UPGRADE_URL })
  })

  it('carries limit details for limit denials', () => {
    const d = agentDenial('limit', { key: 'clients', max: 100, used: 100 })
    expect(d.limit).toEqual({ key: 'clients', max: 100, used: 100 })
    expect(d.reason).toBe('limit')
  })

  it('shape matches what resolveAccess produces for the same reason', () => {
    const decision = resolveAccess({ profile: staff, plan: null }, 'marketing')
    expect(decision.allowed).toBe(false)
    const d = agentDenial(decision.reason!)
    expect(d.reason).toBe('role')
  })
})
