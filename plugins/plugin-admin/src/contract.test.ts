// Integrity test for plugin-admin's manifest shape, using the shared assertion
// from @fayz-ai/core/testing (no UI import — pure, inline manifest, per
// docs/PLUGIN-PATTERNS.md → integrity). Mirrors plugin-financial/src/contract.test.ts.
import { describe, it, expect } from 'vitest'
import { assertPluginManifestContract, PluginContractError } from '@fayz-ai/core/testing'
import type { PluginManifest } from '@fayz-ai/core'

const Dummy = () => null

function manifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'admin',
    name: 'Admin',
    icon: 'LayoutTemplate',
    version: '1.0.0',
    navigation: [{ section: 'secondary', position: 90, label: 'Admin', route: '/admin', icon: 'LayoutTemplate' } as any],
    routes: [{ path: '/admin', component: Dummy } as any],
    ...overrides,
  }
}

describe('plugin-admin · assertPluginManifestContract', () => {
  it('passes the real manifest shape (nav route matches declared route)', () => {
    expect(() => assertPluginManifestContract(manifest())).not.toThrow()
  })

  it('rejects a missing id', () => {
    expect(() => assertPluginManifestContract(manifest({ id: '' }))).toThrow(PluginContractError)
  })

  it('rejects a nav entry pointing at an undeclared route', () => {
    expect(() => assertPluginManifestContract(manifest({
      navigation: [{ section: 'secondary', position: 90, label: 'Admin', route: '/nowhere', icon: 'LayoutTemplate' } as any],
    }))).toThrow(/no matching route/)
  })

  it('rejects a plugin that contributes nothing mountable', () => {
    expect(() => assertPluginManifestContract(manifest({ navigation: [], routes: [], settings: [] }))).toThrow(/nothing/)
  })
})
