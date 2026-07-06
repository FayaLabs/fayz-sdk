import React from 'react'
import { renderBlocks } from '@fayz-ai/core'
import type { StorefrontSection } from '../sections'
import { sectionsToBlocks } from '../blocks'

// The home page is now a block tree resolved through the universal block
// registry (see ../blocks). Section components and their props are unchanged;
// only the dispatch mechanism moved from a switch to the registry, so the same
// composition works from a pure-data AppManifest.
export function StorefrontSections({ sections }: { sections: readonly StorefrontSection[] }) {
  return <main>{renderBlocks(sectionsToBlocks(sections))}</main>
}

export function HomePage({ sections }: { sections: readonly StorefrontSection[] }) {
  return <StorefrontSections sections={sections} />
}
