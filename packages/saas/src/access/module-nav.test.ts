import { describe, it, expect } from 'vitest'
import type { ModuleNavItem } from '@fayz-ai/ui'
import { applyNavAccess } from './module-nav'
import type { AccessApi } from './types'

// ---------------------------------------------------------------------------
// Fixtures — a fake AccessApi so the pure decoration is testable without React
// or the live stores. `roleDenied` names features the role can't read;
// `planDenied` names features the plan doesn't entitle.
// ---------------------------------------------------------------------------

function fakeAccess(opts: { roleDenied?: string[]; planDenied?: string[] }): AccessApi {
  const roleDenied = new Set(opts.roleDenied ?? [])
  const planDenied = new Set(opts.planDenied ?? [])
  return {
    can: (feature) =>
      roleDenied.has(feature) ? { allowed: false, reason: 'role' } : { allowed: true },
    entitled: (feature) => !planDenied.has(feature),
  }
}

function item(id: string, feature?: string, children?: ModuleNavItem[]): ModuleNavItem {
  return { id, label: id, feature, children }
}

// ---------------------------------------------------------------------------
// applyNavAccess
// ---------------------------------------------------------------------------

describe('applyNavAccess', () => {
  const known = new Set(['fin_reconciliation', 'fin_cards', 'fin_commissions'])

  it('removes a link the role denies (declared feature)', () => {
    const nav = [item('summary'), item('reconciliation', 'fin_reconciliation')]
    const out = applyNavAccess(nav, fakeAccess({ roleDenied: ['fin_reconciliation'] }), known)
    expect(out.map((i) => i.id)).toEqual(['summary'])
  })

  it('badges a plan-denied link premium but keeps it navigable', () => {
    const nav = [item('reconciliation', 'fin_reconciliation')]
    const out = applyNavAccess(nav, fakeAccess({ planDenied: ['fin_reconciliation'] }), known)
    expect(out).toHaveLength(1)
    expect(out[0].premium).toBe(true)
  })

  it('passes an ABSENT feature through untouched (default allow — no remove, no crown)', () => {
    // `fin_ghost` isn't in the RBAC catalog → the role axis is skipped even
    // though a bare `can` would report a role denial for it.
    const nav = [item('ghost', 'fin_ghost')]
    const out = applyNavAccess(nav, fakeAccess({ roleDenied: ['fin_ghost'] }), known)
    expect(out).toHaveLength(1)
    expect(out[0].premium).toBe(false)
  })

  it('leaves featureless links (and their id/onClick) untouched', () => {
    const nav = [item('summary')]
    const out = applyNavAccess(nav, fakeAccess({ roleDenied: ['x'], planDenied: ['y'] }), known)
    expect(out).toEqual(nav)
  })

  it('recurses into children — removes role-denied, crowns plan-denied', () => {
    const nav = [
      item('cards', 'fin_cards', [
        item('cards-overview'),
        item('cards-secret', 'fin_reconciliation'), // role-denied child
        item('cards-premium', 'fin_commissions'), // plan-denied child
      ]),
    ]
    const out = applyNavAccess(
      nav,
      fakeAccess({ roleDenied: ['fin_reconciliation'], planDenied: ['fin_commissions'] }),
      known,
    )
    const parent = out[0]
    expect(parent.children!.map((c) => c.id)).toEqual(['cards-overview', 'cards-premium'])
    expect(parent.children!.find((c) => c.id === 'cards-premium')!.premium).toBe(true)
  })
})
