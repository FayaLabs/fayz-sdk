import React from 'react'
import { registerScaffold, defineApp } from '@fayz-ai/core'
import type { AppManifest } from '@fayz-ai/core'
import { MemberConfigProvider, resolveConfig } from './config'
import type { MemberConfig } from './config'
import { initMemberRuntime, MemberShell } from './createMemberApp'

// ---------------------------------------------------------------------------
// Member scaffold — renders the learner portal from a pure-data AppManifest.
// Mirrors the storefront scaffold's dual path: defineMember (config → manifest)
// and MemberScaffold (manifest → render). This is the SDK's third surface type
// (authenticated member area), alongside 'admin' and 'storefront'.
// ---------------------------------------------------------------------------

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'
}

export function defineMember(config: MemberConfig): AppManifest {
  return defineApp({
    id: slug(config.name),
    name: config.name,
    backend: config.supabaseUrl ? { provider: 'supabase', url: config.supabaseUrl } : { provider: 'mock' },
    locale: { default: config.locale ?? 'pt-BR', supported: [config.locale ?? 'pt-BR'] },
    surfaces: {
      member: {
        scaffold: 'member',
        options: {
          logoUrl: config.logoUrl,
          accent: config.accent,
          autoEnroll: config.autoEnroll ?? true,
        },
      },
    },
  })
}

function manifestToMemberConfig(manifest: AppManifest, surfaceName: string): MemberConfig {
  const o = (manifest.surfaces[surfaceName]?.options ?? {}) as Record<string, unknown>
  return {
    name: manifest.name,
    locale: (manifest.locale as { default?: string } | undefined)?.default,
    logoUrl: o.logoUrl as string | undefined,
    accent: o.accent as string | undefined,
    autoEnroll: (o.autoEnroll as boolean | undefined) ?? true,
    supabaseUrl: manifest.backend?.provider === 'supabase' ? manifest.backend.url : undefined,
  }
}

export function MemberScaffold({ manifest, surface }: { manifest: AppManifest; surface: string }) {
  const config = React.useMemo(() => manifestToMemberConfig(manifest, surface), [manifest, surface])
  const resolved = React.useMemo(() => resolveConfig(config), [config])
  const inited = React.useRef(false)
  if (!inited.current) {
    initMemberRuntime(config)
    inited.current = true
  }
  return (
    <MemberConfigProvider value={resolved}>
      <MemberShell />
    </MemberConfigProvider>
  )
}
MemberScaffold.displayName = 'MemberScaffold'

// Self-register so renderApp(manifest, { surface: 'member' }) resolves once this
// package is imported.
registerScaffold('member', MemberScaffold, { source: 'sdk', label: 'Member' })
