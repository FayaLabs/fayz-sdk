import { absoluteUrl, breadcrumbJsonLd, organizationJsonLd } from '@fayz-ai/core'
import type { BlogPost } from './types'

// ---------------------------------------------------------------------------
// Blog-specific schema.org builders. The head-manager mechanics (useSeo /
// applySeo / meta+OG+Twitter) live in @fayz-ai/core — this only owns the
// domain shapes (BlogPosting, Blog) that plug into core's SeoConfig.jsonLd.
// ---------------------------------------------------------------------------

/** Absolute canonical URL for a post. */
export function postUrl(basePath: string, slug: string): string {
  return absoluteUrl(`${basePath}/${slug}`)
}

/** schema.org BlogPosting + BreadcrumbList for an article page. */
export function articleJsonLd(post: BlogPost, opts: { basePath: string; siteName: string }): Array<Record<string, unknown>> {
  const url = postUrl(opts.basePath, post.slug)
  const posting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image ? [post.image] : undefined,
    articleSection: post.tag,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: {
      '@type': 'Person',
      name: post.author.name,
      ...(post.author.role ? { jobTitle: post.author.role } : {}),
    },
    ...(post.publishedAt ? { datePublished: post.publishedAt, dateModified: post.publishedAt } : {}),
    ...(opts.siteName ? { publisher: organizationJsonLd(opts.siteName) } : {}),
  }
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Blog', url: absoluteUrl(opts.basePath) },
    { name: post.title, url },
  ])
  return [posting, breadcrumb]
}

/** schema.org Blog + post list for the listing page. */
export function blogJsonLd(posts: BlogPost[], opts: { basePath: string; siteName: string; title: string }): Array<Record<string, unknown>> {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: opts.title,
      url: absoluteUrl(opts.basePath),
      ...(opts.siteName ? { publisher: organizationJsonLd(opts.siteName) } : {}),
      blogPost: posts.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: postUrl(opts.basePath, p.slug),
        image: p.image,
        author: { '@type': 'Person', name: p.author.name },
        ...(p.publishedAt ? { datePublished: p.publishedAt } : {}),
      })),
    },
  ]
}

// Re-export the generic hook so blog components import SEO from one place.
export { useSeo } from '@fayz-ai/core'
