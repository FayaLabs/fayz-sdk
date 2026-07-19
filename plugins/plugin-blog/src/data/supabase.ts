import { getSupabaseClientOptional, getActiveTenantId } from '@fayz-ai/core'
import type { BlogDataProvider } from './types'
import type { BlogPost, BlogListQuery, BlogAuthor } from '../types'

// ---------------------------------------------------------------------------
// Supabase-backed blog provider (public/website read side).
//
// Reads PUBLISHED posts from the anon-safe view public.v_public_blog_posts
// (see src/migrations/001_blog.sql §4), scoped to a tenant. The backoffice
// writes to plg_blog_posts directly via the generic CRUD provider; here we only
// read the published, column-whitelisted view — safe under the publishable key.
//
// The tenant is taken from the configured tenantId (anon site) or, failing that,
// the active session tenant. Without a client or a tenant we return nothing, and
// createSafeDataProvider falls back to the mock/seed provider.
// ---------------------------------------------------------------------------

const PUBLIC_VIEW = 'v_public_blog_posts'

export interface SupabaseBlogProviderOptions {
  /** Tenant whose published posts to read (anon website). Defaults to the active session tenant. */
  tenantId?: string
}

function getClient() {
  const supabase = getSupabaseClientOptional() as {
    from: (t: string) => any
  } | null
  if (!supabase) throw new Error('[plugin-blog] Supabase client not initialized')
  return supabase
}

/** Human month-year label (pt-BR) derived from an ISO date, e.g. "Janeiro 2025". */
function humanDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function toPost(row: Record<string, any>): BlogPost {
  const author: BlogAuthor = {
    name: row.author_name ?? 'Equipe',
    avatarUrl: row.author_avatar_url ?? undefined,
    role: row.author_role ?? undefined,
    bio: row.author_bio ?? undefined,
  }
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    tag: row.tag ?? '',
    readTime: row.read_time ?? '',
    date: humanDate(row.published_at),
    publishedAt: row.published_at ?? undefined,
    image: row.cover_image ?? '',
    author,
  }
}

export function createSupabaseBlogProvider(options?: SupabaseBlogProviderOptions): BlogDataProvider {
  const resolveTenantId = (): string | undefined => options?.tenantId ?? getActiveTenantId() ?? undefined

  return {
    async listPosts(query?: BlogListQuery): Promise<BlogPost[]> {
      const tenantId = resolveTenantId()
      if (!tenantId) return []
      let q = getClient()
        .from(PUBLIC_VIEW)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('published_at', { ascending: false, nullsFirst: false })
      if (query?.tag) q = q.eq('tag', query.tag)
      if (query?.limit != null) q = q.limit(query.limit)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(toPost)
    },

    async getPost(slug: string): Promise<BlogPost | null> {
      const tenantId = resolveTenantId()
      if (!tenantId) return null
      const { data, error } = await getClient()
        .from(PUBLIC_VIEW)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw error
      return data ? toPost(data) : null
    },
  }
}
