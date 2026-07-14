import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Generic, domain-agnostic SEO / structured-data head manager (SDK-level).
// ANY surface (blog, booking, reviews, product, landing) uses `useSeo` to set
// <title>, meta description, canonical, OpenGraph/Twitter cards and JSON-LD per
// route. Domain plugins build their own schema.org objects (BlogPosting,
// Product, Event…) and pass them via `jsonLd` — the mechanics live here once.
//
// NOTE: a SPA still benefits from SSR/prerendering for the strongest SEO — that
// is the real upgrade; this covers everything achievable client-side.
// ---------------------------------------------------------------------------

const MANAGED = 'data-fayz-seo'

export interface SeoConfig {
  title: string
  description?: string
  canonical?: string
  image?: string
  type?: 'website' | 'article' | (string & {})
  siteName?: string
  /** One or more JSON-LD objects injected as <script type="application/ld+json">. */
  jsonLd?: Array<Record<string, unknown>>
}

/** Current page origin (empty during SSR). */
export function seoOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/** Build an absolute URL from a path, using the current origin. */
export function absoluteUrl(path: string): string {
  return `${seoOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute(MANAGED, '')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  if (!href) return
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    el.setAttribute(MANAGED, '')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function clearManaged() {
  document.head.querySelectorAll(`[${MANAGED}]`).forEach((el) => el.remove())
}

/** Imperatively apply SEO tags (used by useSeo; exported for non-React callers). */
export function applySeo(config: SeoConfig): void {
  if (typeof document === 'undefined') return
  clearManaged()
  document.title = config.title
  upsertMeta('name', 'description', config.description ?? '')
  if (config.canonical) upsertLink('canonical', config.canonical)

  upsertMeta('property', 'og:title', config.title)
  upsertMeta('property', 'og:description', config.description ?? '')
  upsertMeta('property', 'og:type', config.type === 'article' ? 'article' : 'website')
  if (config.canonical) upsertMeta('property', 'og:url', config.canonical)
  if (config.image) upsertMeta('property', 'og:image', config.image)
  if (config.siteName) upsertMeta('property', 'og:site_name', config.siteName)

  upsertMeta('name', 'twitter:card', config.image ? 'summary_large_image' : 'summary')
  upsertMeta('name', 'twitter:title', config.title)
  upsertMeta('name', 'twitter:description', config.description ?? '')
  if (config.image) upsertMeta('name', 'twitter:image', config.image)

  for (const obj of config.jsonLd ?? []) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(MANAGED, '')
    script.text = JSON.stringify(obj)
    document.head.appendChild(script)
  }
}

/** Apply SEO head tags for the current route; cleans up on unmount. */
export function useSeo(config: SeoConfig): void {
  const key = JSON.stringify(config)
  useEffect(() => {
    applySeo(config)
    return () => clearManaged()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

// --- Generic schema.org builders (reusable across plugins) -----------------

export interface BreadcrumbItem {
  name: string
  url: string
}

/** schema.org BreadcrumbList from an ordered list of crumbs. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

/** schema.org Organization publisher block. */
export function organizationJsonLd(name: string, extra?: Record<string, unknown>): Record<string, unknown> {
  return { '@type': 'Organization', name, ...extra }
}
