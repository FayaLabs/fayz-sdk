// AUTO-GENERATED from 001_blog.sql — regenerate with scripts/embed-migrations.mjs
// SQL files are the source of truth; this inline copy lets the manifest declare
// migrations as data. Do not edit by hand — run the embed script instead.

export const MIGRATION_001_BLOG = `-- ============================================================================
-- plugin-blog 001: blog content model + public (anon) read surface
--
-- Backs the blog backoffice (managed from the marketing plugin's "Blog" tab) and
-- the public website surface (/blog, /blog/:slug). Prefix: plg_blog_.
--   §1  plg_blog_categories — first-class category (name/slug/description)
--   §2  plg_blog_posts       — articles; category_id FK, author byline, status
--   §3  RLS: authenticated tenant CRUD on both tables (the backoffice)
--   §4  v_public_blog_posts  — anon-readable view of PUBLISHED posts (the site)
--
-- Anon-access design mirrors plugin-agenda's public booking surface: the public
-- website runs with the publishable key and no session, so canonical tenant RLS
-- yields nothing. Anon read is granted ONLY through the column-whitelisted,
-- published-only view (§4); the front provider filters it by tenant_id.
-- Idempotent + safe to re-run.
-- ============================================================================

-- §1 — categories
CREATE TABLE IF NOT EXISTS public.plg_blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_blog_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_blog_categories_tenant ON public.plg_blog_categories(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_plg_blog_categories_tenant_slug ON public.plg_blog_categories(tenant_id, slug);

-- §2 — posts
CREATE TABLE IF NOT EXISTS public.plg_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.plg_blog_categories(id) ON DELETE SET NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  cover_image text,
  author_name text,
  author_role text,
  author_avatar_url text,
  author_bio text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  read_time text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plg_blog_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_plg_blog_posts_tenant ON public.plg_blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plg_blog_posts_category ON public.plg_blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_plg_blog_posts_status ON public.plg_blog_posts(tenant_id, status, published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_plg_blog_posts_tenant_slug ON public.plg_blog_posts(tenant_id, slug);

-- §3 — RLS: authenticated tenant CRUD (the backoffice writes here)
DROP POLICY IF EXISTS plg_blog_categories_select ON public.plg_blog_categories;
DROP POLICY IF EXISTS plg_blog_categories_insert ON public.plg_blog_categories;
DROP POLICY IF EXISTS plg_blog_categories_update ON public.plg_blog_categories;
DROP POLICY IF EXISTS plg_blog_categories_delete ON public.plg_blog_categories;
CREATE POLICY plg_blog_categories_select ON public.plg_blog_categories FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_blog_categories_insert ON public.plg_blog_categories FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_blog_categories_update ON public.plg_blog_categories FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_blog_categories_delete ON public.plg_blog_categories FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_blog_categories TO authenticated;

DROP POLICY IF EXISTS plg_blog_posts_select ON public.plg_blog_posts;
DROP POLICY IF EXISTS plg_blog_posts_insert ON public.plg_blog_posts;
DROP POLICY IF EXISTS plg_blog_posts_update ON public.plg_blog_posts;
DROP POLICY IF EXISTS plg_blog_posts_delete ON public.plg_blog_posts;
CREATE POLICY plg_blog_posts_select ON public.plg_blog_posts FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_blog_posts_insert ON public.plg_blog_posts FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_blog_posts_update ON public.plg_blog_posts FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
CREATE POLICY plg_blog_posts_delete ON public.plg_blog_posts FOR DELETE TO authenticated USING (tenant_id IN (SELECT public.user_tenant_ids()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plg_blog_posts TO authenticated;

-- §4 — anon-readable public catalog (owner-rights view = deliberate, whitelisted,
-- PUBLISHED only). The front provider filters by tenant_id. Category name is
-- surfaced as \`tag\` so the website's BlogPost shape stays unchanged.
CREATE OR REPLACE VIEW public.v_public_blog_posts AS
SELECT
  p.id,
  p.tenant_id,
  p.slug,
  p.title,
  p.excerpt,
  p.body,
  COALESCE(c.name, '')  AS tag,
  p.cover_image,
  p.author_name,
  p.author_role,
  p.author_avatar_url,
  p.author_bio,
  p.read_time,
  p.published_at
FROM public.plg_blog_posts p
LEFT JOIN public.plg_blog_categories c ON c.id = p.category_id
WHERE p.status = 'published';

GRANT SELECT ON public.v_public_blog_posts TO anon, authenticated, service_role;
`

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: "001_blog", sql: MIGRATION_001_BLOG },
]
