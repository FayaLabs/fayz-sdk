// Capability test — proves the data slice end-to-end against the mock
// provider, per docs/PLUGIN-PATTERNS.md → capability anatomy. plugin-admin is
// a read-only foundation (no writes yet): the slice to prove is that the
// resolved shell-config snapshot round-trips through the provider unchanged,
// and that both mock and supabase stubs honor the same contract.
import { describe, it, expect } from 'vitest'
import { createMockAdminProvider } from './mock'
import { createSupabaseAdminProvider } from './supabase'
import type { AdminSettingsSnapshot } from './types'

const SNAPSHOT: AdminSettingsSnapshot = {
  layout: 'topbar',
  moduleNav: 'rail',
  mobileHeader: 'transparent',
  navTransition: 'fade',
  orgSettings: false,
  branding: true,
}

describe('plugin-admin capability · data slice', () => {
  it('mock provider surfaces the resolved snapshot as-is', async () => {
    const provider = createMockAdminProvider(SNAPSHOT)
    expect(await provider.getSettings()).toEqual(SNAPSHOT)
  })

  it('supabase stub provider honors the same contract (no backend table yet)', async () => {
    const provider = createSupabaseAdminProvider(SNAPSHOT)
    expect(await provider.getSettings()).toEqual(SNAPSHOT)
  })
})
