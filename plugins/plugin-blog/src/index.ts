import { createElement, type FC, type ReactNode } from 'react'
import type { PluginManifest } from '@fayz-ai/core'
import { createSafeDataProvider } from '@fayz-ai/core'
import { resolveConfig, type BlogPluginOptions } from './config'
import { createMockBlogProvider } from './data/mock'
import { createSupabaseBlogProvider } from './data/supabase'
import { BlogProvider, type BlogContextValue } from './context'
import { BlogList } from './components/BlogList'
import { PostDetail } from './components/PostDetail'
import { MIGRATIONS } from './migrations'

// ---------------------------------------------------------------------------
// @fayz-ai/plugin-blog — website-surface blog/articles plugin.
//
// First real consumer of scaffolds:['website']. Ships public routes (/blog,
// /blog/:slug) + data hooks (useBlogPosts/usePost). A bespoke host site feeds
// its own card markup from the hooks and mounts the routes inside its chrome.
// See createBlogPlugin's return: a { manifest, Provider } bundle the host reads
// uniformly (manifest.routes for mounting, Provider for the app-root context).
// ---------------------------------------------------------------------------

export interface BlogWebsitePlugin {
  /** Standard plugin manifest (routes + metadata). */
  manifest: PluginManifest
  /** App-root context provider, pre-bound to this plugin's resolved provider/config. */
  Provider: FC<{ children: ReactNode }>
  /** The resolved data provider (exposed for advanced host wiring/tests). */
  dataProvider: BlogContextValue['provider']
}

export function createBlogPlugin(options?: BlogPluginOptions): BlogWebsitePlugin {
  const config = resolveConfig(options)
  const provider =
    options?.dataProvider ??
    createSafeDataProvider(
      () => createSupabaseBlogProvider({ tenantId: options?.tenantId }),
      () => createMockBlogProvider({ seed: options?.seed, defaultAuthor: options?.defaultAuthor }),
    )

  const value: BlogContextValue = { provider, config }
  const Provider: FC<{ children: ReactNode }> = ({ children }) =>
    createElement(BlogProvider, { value, children })
  Provider.displayName = 'BlogPluginProvider'

  const manifest: PluginManifest = {
    id: 'blog',
    name: 'Blog',
    icon: 'Newspaper',
    version: '0.1.0',
    scope: options?.scope ?? 'universal',
    verticalId: options?.verticalId,
    scaffolds: ['website', 'landing_page'],
    defaultEnabled: true,
    dependencies: [],
    declaredFeatures: [{ id: 'blog', label: 'Blog', group: 'Attract' }],
    // Blog posts count against the plan cap. The create UI lives in the
    // marketing "Blog" backoffice, which writes to this plugin's posts table.
    declaredLimits: [{ key: 'blog_posts', label: 'Blog posts', table: 'plg_blog_posts' }],
    // Host owns website nav; no admin nav in M1.
    navigation: [],
    routes: [
      { path: config.basePath, component: BlogList, guard: 'public' },
      { path: `${config.basePath}/:slug`, component: PostDetail, guard: 'public' },
    ],
    widgets: [],
    // Owns the blog domain tables (categories + posts + anon-read view). The
    // marketing "Blog" backoffice writes to these; the website reads them.
    migrations: MIGRATIONS.map((m) => ({
      id: `blog-${m.id}`,
      version: '1.0.0',
      sql: m.sql,
      description: 'Blog content model (plg_blog_categories, plg_blog_posts) + anon-read view',
    })),
  }

  return { manifest, Provider, dataProvider: provider }
}

// Public API
export type { BlogPluginOptions, ResolvedBlogConfig } from './config'
export type { BlogPost, BlogListQuery, BlogAuthor, BlogCategory } from './types'
export type { BlogDataProvider } from './data/types'
export { createMockBlogProvider, createSupabaseBlogProvider } from './data'
export type { BlogSeed, BlogSeedPost } from './data/mock'
export { BlogProvider, useBlogContext } from './context'
export type { BlogContextValue } from './context'
export { useBlogPosts, usePost } from './hooks'
export type { UseBlogPostsResult, UsePostResult } from './hooks'
export { BlogList } from './components/BlogList'
export { PostDetail } from './components/PostDetail'
export { PostCard } from './components/PostCard'
export { AuthorAvatar } from './components/AuthorAvatar'
