import type { BlogPost, BlogListQuery } from '../types'

/**
 * The data seam for the blog plugin. A mock/seed implementation powers the POC;
 * a Supabase (or CMS) implementation swaps in later with no component change.
 */
export interface BlogDataProvider {
  listPosts(query?: BlogListQuery): Promise<BlogPost[]>
  getPost(slug: string): Promise<BlogPost | null>
}
