import type { HeroVariant } from './theme'
import type React from 'react'

// ---------------------------------------------------------------------------
// Home-page section blueprint — the storefront's PageConfig equivalent.
// A template (or the Fayz agent) declares the home as an ordered list of
// typed sections; HomePage renders them. Every recurring block found in the
// Nuvemshop research maps to one section type.
// ---------------------------------------------------------------------------

export interface HeroSlide {
  title: string
  subtitle?: string
  cta?: string
  href?: string
  /** Image URL; omit for a gradient placeholder derived from `hue` */
  image?: string
  hue?: number
  /** Editorial boxed copy block (Uyuni) instead of free overlay */
  boxed?: boolean
}

export interface MediaCarouselItem {
  title: string
  subtitle?: string
  eyebrow?: string
  cta?: string
  href?: string
  image: string
  imageAlt?: string
  align?: 'start' | 'center' | 'end'
}

export type StorefrontSection =
  | { type: 'hero'; variant: HeroVariant; slides: HeroSlide[]; height?: 'tall' | 'medium' }
  | {
      type: 'mediaCarousel'
      items: MediaCarouselItem[]
      height?: 'medium' | 'tall' | 'screen'
      autoplayMs?: number
      overlay?: 'dark' | 'soft' | 'none'
      className?: string
    }
  | { type: 'categories'; style: 'bubbles' | 'tiles'; title?: string }
  | {
      type: 'products'
      title: string
      subtitle?: string
      /** Small-caps label above the title (e.g. 'curadoria') */
      eyebrow?: string
      /** 'sale' = compareAtPrice set; 'new' = newest first; 'all' = catalog order */
      filter?: 'sale' | 'new' | 'all'
      limit?: number
    }
  | {
      type: 'productSlider'
      title: string
      subtitle?: string
      eyebrow?: string
      filter?: 'sale' | 'new' | 'all'
      categoryName?: string
      collection?: string
      limit?: number
      cta?: string
      href?: string
      className?: string
    }
  | { type: 'benefits'; items: Array<{ icon: string; title: string; text?: string }> }
  | { type: 'banner'; title: string; subtitle?: string; eyebrow?: string; cta?: string; href?: string; image?: string; hue?: number }
  | { type: 'manifesto'; title?: string; text: string }
  | { type: 'testimonials'; title?: string; items: Array<{ quote: string; author: string }> }
  | { type: 'newsletter'; title?: string; subtitle?: string }

/** @deprecated Use StorefrontSection. Kept for existing generated stores. */
export type HomeSection = StorefrontSection

export interface HomeConfig {
  sections: readonly StorefrontSection[]
}

export interface NavLink {
  label: string
  to: string
}

export interface FooterConfig {
  about?: string
  contact?: { phone?: string; email?: string; address?: string }
  social?: Array<{ label: string; href: string }>
  credit?: React.ReactNode
  labels?: {
    categories?: string
    navigation?: string
    contact?: string
    viewAll?: string
    purchases?: string
    privacy?: string
    terms?: string
    returns?: string
  }
}

/** Wide gradient SVG data-URI — deterministic hero/banner art, no network. */
export function bannerPlaceholder(label: string, hueA: number, hueB: number, w = 1600, h = 700): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hueA},40%,78%)"/>` +
    `<stop offset="1" stop-color="hsl(${hueB},45%,55%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<circle cx="${w * 0.8}" cy="${h * 0.3}" r="${h * 0.45}" fill="hsla(${hueB},50%,90%,0.25)"/>` +
    `<circle cx="${w * 0.15}" cy="${h * 0.85}" r="${h * 0.35}" fill="hsla(${hueA},45%,30%,0.12)"/>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
