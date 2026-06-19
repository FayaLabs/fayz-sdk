import { describe, expect, it } from 'vitest'
import releaseChannels from './release-channels.json' with { type: 'json' }
import {
  resolveFayzPackageDependencies,
  fayzPackageVersionSets,
  resolveFayzPackageVersion,
  resolveFayzPackageVersions,
} from './release-channels'

describe('release channels', () => {
  it('keeps stable as the default channel', () => {
    expect(resolveFayzPackageVersions()).toEqual({
      channel: 'stable',
      packages: releaseChannels.channels.stable,
    })
    expect(resolveFayzPackageVersions().packages['@fayz-ai/sdk']).toBe('^0.1.5')
  })

  it('returns a copy of package dependencies', () => {
    const dependencies = resolveFayzPackageDependencies()
    dependencies['@fayz-ai/sdk'] = 'tampered'

    expect(resolveFayzPackageDependencies()['@fayz-ai/sdk']).toBe('^0.1.5')
  })

  it('throws when a package is not mapped for a channel', () => {
    expect(() => resolveFayzPackageVersion('@fayz-ai/app-runtime')).toThrow(
      'No Fayz package version configured for @fayz-ai/app-runtime in stable channel',
    )
  })

  it('keeps the machine-readable release-channel manifest aligned with the typed export', () => {
    expect(releaseChannels).toEqual({
      channels: {
        stable: fayzPackageVersionSets.stable.packages,
        latest: fayzPackageVersionSets.latest.packages,
        preview: fayzPackageVersionSets.preview.packages,
      },
    })
  })
})
