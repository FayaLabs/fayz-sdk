import React from 'react'
import type { HomeSection } from '../sections'
import { HeroSection } from '../components/sections/HeroSection'
import { CategoryShowcase } from '../components/sections/CategoryShowcase'
import { ProductRail } from '../components/sections/ProductRail'
import {
  BenefitsRow,
  PromoBanner,
  ManifestoBlock,
  Testimonials,
  NewsletterBand,
} from '../components/sections/MiscSections'

function renderSection(section: HomeSection, index: number): React.ReactNode {
  switch (section.type) {
    case 'hero':
      return <HeroSection key={index} variant={section.variant} slides={section.slides} height={section.height} />
    case 'categories':
      return <CategoryShowcase key={index} style={section.style} title={section.title} />
    case 'products':
      return (
        <ProductRail
          key={index}
          title={section.title}
          subtitle={section.subtitle}
          eyebrow={section.eyebrow}
          filter={section.filter}
          limit={section.limit}
        />
      )
    case 'benefits':
      return <BenefitsRow key={index} items={section.items} />
    case 'banner':
      return (
        <PromoBanner
          key={index}
          title={section.title}
          subtitle={section.subtitle}
          eyebrow={section.eyebrow}
          cta={section.cta}
          href={section.href}
          image={section.image}
          hue={section.hue}
        />
      )
    case 'manifesto':
      return <ManifestoBlock key={index} title={section.title} text={section.text} />
    case 'testimonials':
      return <Testimonials key={index} title={section.title} items={section.items} />
    case 'newsletter':
      return <NewsletterBand key={index} title={section.title} subtitle={section.subtitle} />
    default:
      return null
  }
}

export function HomePage({ sections }: { sections: HomeSection[] }) {
  return <main>{sections.map(renderSection)}</main>
}
