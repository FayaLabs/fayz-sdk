import type { BlogDataProvider } from './types'
import type { BlogPost, BlogListQuery, BlogAuthor } from '../types'

/** Slugify a title when a seed post omits an explicit slug. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    // Drop combining accent marks (and any other non-ASCII) so "saúde" -> "saude".
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

/** Seed post — same shape as BlogPost but slug/body/author may be derived. */
export type BlogSeedPost = Omit<BlogPost, 'slug' | 'body' | 'author'> & {
  slug?: string
  body?: string
  author?: BlogAuthor
}

export interface BlogSeed {
  posts: BlogSeedPost[]
}

export interface MockBlogProviderOptions {
  seed?: BlogSeed
  /** Fallback byline used for posts without their own author. */
  defaultAuthor?: BlogAuthor
}

const FALLBACK_AUTHOR: BlogAuthor = { name: 'Equipe' }

function normalize(post: BlogSeedPost, defaultAuthor: BlogAuthor): BlogPost {
  return {
    ...post,
    slug: post.slug ?? slugify(post.title),
    body: post.body ?? post.excerpt,
    author: post.author ?? defaultAuthor,
  }
}

/** A built-in fallback post so an unseeded plugin still renders something. */
const FALLBACK: BlogSeedPost[] = [
  {
    title: 'Bem-vindo ao blog',
    excerpt: 'Este é um artigo de exemplo servido pelo plugin de blog do Fayz.',
    tag: 'Novidades',
    readTime: '2 min',
    date: 'Hoje',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
  },
]

export function createMockBlogProvider(options?: MockBlogProviderOptions): BlogDataProvider {
  const defaultAuthor = options?.defaultAuthor ?? FALLBACK_AUTHOR
  const posts: BlogPost[] = (options?.seed?.posts ?? FALLBACK).map((p) => normalize(p, defaultAuthor))

  return {
    async listPosts(query?: BlogListQuery): Promise<BlogPost[]> {
      let result = posts
      if (query?.tag) result = result.filter((p) => p.tag === query.tag)
      if (query?.limit != null) result = result.slice(0, query.limit)
      return result
    },
    async getPost(slug: string): Promise<BlogPost | null> {
      return posts.find((p) => p.slug === slug) ?? null
    },
  }
}
