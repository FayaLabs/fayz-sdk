import { registerBlock } from '@fayz-ai/core'
import type { BlockNode } from '@fayz-ai/core'
import type { HomeSection } from './sections'
import { HeroSection } from './components/sections/HeroSection'
import { CategoryShowcase } from './components/sections/CategoryShowcase'
import { ProductRail } from './components/sections/ProductRail'
import {
  BenefitsRow,
  PromoBanner,
  ManifestoBlock,
  Testimonials,
  NewsletterBand,
} from './components/sections/MiscSections'

// ---------------------------------------------------------------------------
// Storefront blocks — the section components registered into the universal
// block registry. This replaces HomePage's hardcoded switch: a home page is now
// a block tree (`{ type, props }[]`) resolved through the registry, identical
// to how admin pages will compose. Section prop shapes are unchanged, so the
// components are registered directly.
// ---------------------------------------------------------------------------

let registered = false

export function registerStorefrontBlocks(): void {
  if (registered) return
  registered = true
  registerBlock('hero', HeroSection, { source: 'sdk', label: 'Hero' })
  registerBlock('categories', CategoryShowcase, { source: 'sdk', label: 'Categories' })
  registerBlock('products', ProductRail, { source: 'sdk', label: 'Product rail' })
  registerBlock('benefits', BenefitsRow, { source: 'sdk', label: 'Benefits row' })
  registerBlock('banner', PromoBanner, { source: 'sdk', label: 'Promo banner' })
  registerBlock('manifesto', ManifestoBlock, { source: 'sdk', label: 'Manifesto' })
  registerBlock('testimonials', Testimonials, { source: 'sdk', label: 'Testimonials' })
  registerBlock('newsletter', NewsletterBand, { source: 'sdk', label: 'Newsletter band' })
}

// Register on import so any consumer of the storefront package has the blocks.
registerStorefrontBlocks()

/** Convert the legacy HomeSection[] blueprint into a generic block tree. */
export function sectionsToBlocks(sections: HomeSection[]): BlockNode[] {
  return sections.map((section, i) => {
    const { type, ...props } = section
    return { type, id: `${type}-${i}`, props: props as Record<string, unknown> }
  })
}
