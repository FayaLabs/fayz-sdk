// Integrity test for the shared plugin-contract assertions (@fayz-ai/core/testing).
// Exercises the gate's rules with inline manifests (no UI import) so the tool
// itself is proven: a conformant manifest passes; each malformed shape throws.
// Real plugins call assertPluginManifestContract(theirManifest) in an env where
// their UI bundle loads (app-level / jsdom). See docs/PLUGIN-PATTERNS.md → integrity.
import { describe, it, expect } from 'vitest'
import { assertPluginManifestContract, PluginContractError } from '@fayz-ai/core/testing'
import type { PluginManifest } from '@fayz-ai/core'

const Dummy = () => null

function manifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'demo', name: 'Demo', icon: 'Box', version: '1.0.0',
    navigation: [{ section: 'main', label: 'Demo', route: '/demo', icon: 'Box' } as any],
    routes: [{ path: '/demo', component: Dummy } as any],
    ...overrides,
  }
}

describe('assertPluginManifestContract', () => {
  it('passes a conformant page plugin', () => {
    expect(() => assertPluginManifestContract(manifest())).not.toThrow()
  })

  it('passes a settings-only plugin (nav/routes empty, one settings tab)', () => {
    expect(() => assertPluginManifestContract(manifest({
      navigation: [], routes: [],
      settings: [{ id: 'demo', label: 'Demo', icon: 'Box', component: Dummy } as any],
    }))).not.toThrow()
  })

  it('rejects a missing id', () => {
    expect(() => assertPluginManifestContract(manifest({ id: '' }))).toThrow(PluginContractError)
  })

  it('rejects a nav entry pointing at an undeclared route', () => {
    expect(() => assertPluginManifestContract(manifest({
      navigation: [{ section: 'main', label: 'X', route: '/nowhere', icon: 'Box' } as any],
    }))).toThrow(/no matching route/)
  })

  it('rejects duplicate route paths', () => {
    expect(() => assertPluginManifestContract(manifest({
      routes: [{ path: '/demo', component: Dummy } as any, { path: '/demo', component: Dummy } as any],
    }))).toThrow(/duplicate route/)
  })

  it('rejects a settings tab without a component', () => {
    expect(() => assertPluginManifestContract(manifest({
      settings: [{ id: 'demo', label: 'Demo' } as any],
    }))).toThrow(/component/)
  })

  it('rejects a plugin that contributes nothing mountable', () => {
    expect(() => assertPluginManifestContract(manifest({ navigation: [], routes: [], settings: [] }))).toThrow(/nothing/)
  })
})
