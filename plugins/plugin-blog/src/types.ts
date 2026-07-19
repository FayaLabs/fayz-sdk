// ---------------------------------------------------------------------------
// Blog domain types. Deliberately presentation-agnostic: a host site maps these
// into its own card markup, and the plugin's default components render them with
// semantic Tailwind tokens so they inherit the host theme.
// ---------------------------------------------------------------------------

/** Medium-inspired author byline shown on cards and article pages. */
export interface BlogAuthor {
  name: string
  /** Avatar image URL; a name-initial is shown as fallback. */
  avatarUrl?: string
  /** Short role/handle under the name (e.g. "Cirurgião-Dentista"). */
  role?: string
  /** One-line bio for the "about the author" block on the article page. */
  bio?: string
}

/**
 * First-class blog category. Managed in the backoffice (marketing "Blog" tab);
 * a post references one via categoryId. The website's BlogPost surfaces the
 * category's `name` as its `tag` string so presentation stays unchanged.
 */
export interface BlogCategory {
  id: string
  name: string
  /** URL-safe identifier (unique per tenant). */
  slug: string
  description?: string
}

export interface BlogPost {
  /** URL-safe identifier used for the /blog/:slug detail route. */
  slug: string
  title: string
  /** Short summary shown on cards / list. */
  excerpt: string
  /** Full article body. Plain text or lightweight markdown (paragraphs split on blank lines). */
  body: string
  /** Category / topic label (e.g. "Periodontia"). Derived from the post's category name. */
  tag: string
  /** Human-readable reading time (e.g. "5 min"). */
  readTime: string
  /** Human-readable publish date (e.g. "Janeiro 2025"). */
  date: string
  /** Machine date (ISO 8601) for SEO/JSON-LD datePublished. Optional. */
  publishedAt?: string
  /** Cover image URL. */
  image: string
  /** Byline author. Filled from the plugin's defaultAuthor when a post omits it. */
  author: BlogAuthor
}

export interface BlogListQuery {
  /** Cap the number of posts returned (e.g. the home teaser shows 3). */
  limit?: number
  /** Filter by tag. */
  tag?: string
}
