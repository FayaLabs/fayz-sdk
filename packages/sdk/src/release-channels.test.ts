import { describe, expect, it } from 'vitest'
import {
  resolveFayzPackageDependencies,
  resolveFayzPackageVersion,
  resolveFayzPackageVersions,
} from './release-channels'

describe('release channels', () => {
  it('keeps stable as the default channel', () => {
    expect(resolveFayzPackageVersions()).toEqual({
      channel: 'stable',
      packages: {
        '@fayz-ai/sdk': '^0.1.3',
      },
    })
  })

  it('returns a copy of package dependencies', () => {
    const dependencies = resolveFayzPackageDependencies()
    dependencies['@fayz-ai/sdk'] = 'tampered'

    expect(resolveFayzPackageDependencies()['@fayz-ai/sdk']).toBe('^0.1.3')
  })

  it('throws when a package is not mapped for a channel', () => {
    expect(() => resolveFayzPackageVersion('@fayz-ai/app-runtime')).toThrow(
      'No Fayz package version configured for @fayz-ai/app-runtime in stable channel',
    )
  })
})
