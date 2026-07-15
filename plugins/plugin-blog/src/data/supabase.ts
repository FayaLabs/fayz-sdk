import type { BlogDataProvider } from './types'
import type { BlogPost, BlogListQuery } from '../types'

// ---------------------------------------------------------------------------
// Supabase-backed blog provider — STUB.
//
// Deferred (Phase 2): read from a `blog_posts` table (tenant-scoped, RLS) with
// columns mirroring BlogPost (slug, title, excerpt, body, tag, read_time, date,
// image, author). Wiring this up is a pure provider swap — no hook/component
// change — because everything downstream depends only on BlogDataProvider.
//
// Until then this throws, which makes createSafeDataProvider fall back to the
// mock provider whenever no Supabase client is configured. If a client IS
// configured but this is still a stub, surface a clear error.
// ---------------------------------------------------------------------------

export function createSupabaseBlogProvider(): BlogDataProvider {
  const notImplemented = (): never => {
    throw new Error(
      '[plugin-blog] Supabase provider not implemented yet — deferred to Phase 2. ' +
        'Run on the mock/seed provider (no Supabase client configured) for now.',
    )
  }
  return {
    listPosts: (_query?: BlogListQuery): Promise<BlogPost[]> => notImplemented(),
    getPost: (_slug: string): Promise<BlogPost | null> => notImplemented(),
  }
}
