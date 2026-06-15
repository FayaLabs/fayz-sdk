import releaseChannels from './release-channels.json'

export type FayzPackageChannel = 'stable' | 'latest' | 'preview'

export interface FayzPackageVersionSet {
  channel: FayzPackageChannel
  packages: Record<string, string>
}

const releaseChannelPackages = releaseChannels.channels as Record<FayzPackageChannel, Record<string, string>>

function buildVersionSet(channel: FayzPackageChannel): FayzPackageVersionSet {
  return {
    channel,
    packages: { ...releaseChannelPackages[channel] },
  }
}

export const fayzPackageVersionSets: Record<FayzPackageChannel, FayzPackageVersionSet> = {
  stable: buildVersionSet('stable'),
  latest: buildVersionSet('latest'),
  preview: buildVersionSet('preview'),
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
