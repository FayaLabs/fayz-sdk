export type FayzPackageChannel = 'stable' | 'latest' | 'preview'

export interface FayzPackageVersionSet {
  channel: FayzPackageChannel
  packages: Record<string, string>
}

const stablePackageVersions: FayzPackageVersionSet = {
  channel: 'stable',
  packages: {
    '@fayz-ai/sdk': '^0.1.3',
    '@fayz-ai/runtime': '^0.1.0',
  },
}

export const fayzPackageVersionSets: Record<FayzPackageChannel, FayzPackageVersionSet> = {
  stable: stablePackageVersions,
  latest: {
    channel: 'latest',
    packages: stablePackageVersions.packages,
  },
  preview: {
    channel: 'preview',
    packages: stablePackageVersions.packages,
  },
}

export function resolveFayzPackageVersions(channel: FayzPackageChannel = 'stable'): FayzPackageVersionSet {
  return fayzPackageVersionSets[channel]
}

export function resolveFayzPackageDependencies(channel: FayzPackageChannel = 'stable'): Record<string, string> {
  return { ...resolveFayzPackageVersions(channel).packages }
}

export function resolveFayzPackageVersion(packageName: string, channel: FayzPackageChannel = 'stable'): string {
  const version = resolveFayzPackageVersions(channel).packages[packageName]

  if (!version) {
    throw new Error(`No Fayz package version configured for ${packageName} in ${channel} channel`)
  }

  return version
}
