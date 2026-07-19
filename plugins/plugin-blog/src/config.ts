import type { PluginScope, VerticalId } from '@fayz-ai/core'
import type { BlogDataProvider } from './data/types'
import type { BlogSeed } from './data/mock'
import type { BlogAuthor } from './types'

export interface BlogPluginOptions {
  /** Base path the plugin mounts its public routes under. Default '/blog'. */
  basePath?: string
  /** Seed posts for the mock provider (used until a real backend is wired). */
  seed?: BlogSeed
  /** Default byline author, applied to any post that doesn't specify its own. */
  defaultAuthor?: BlogAuthor
  /** Publisher/brand name — used for SEO (og:site_name, JSON-LD publisher). */
  siteName?: string
  /** Inject a custom provider (e.g. a CMS). Overrides the safe mock/Supabase resolver. */
  dataProvider?: BlogDataProvider
  /** Tenant whose PUBLISHED posts the public (anon) site reads from Supabase.
   *  Required for the Supabase provider on an anon website (mirrors how the
   *  public booking plugin takes an explicit tenantId). Without it the safe
   *  resolver falls back to the mock/seed provider. */
  tenantId?: string
  /** Section eyebrow / labels for the default list screen. */
  labels?: {
    /** Title shown at the top of the /blog list screen. */
    listTitle?: string
    /** Subtitle under the list title. */
    listSubtitle?: string
    /** "Back to blog" link label on the detail screen. */
    backToList?: string
  }
  scope?: PluginScope
  verticalId?: VerticalId
}

export interface ResolvedBlogConfig {
  basePath: string
  siteName: string
  labels: {
    listTitle: string
    listSubtitle: string
    backToList: string
  }
}

export function resolveConfig(options?: BlogPluginOptions): ResolvedBlogConfig {
  return {
    basePath: options?.basePath ?? '/blog',
    siteName: options?.siteName ?? '',
    labels: {
      listTitle: options?.labels?.listTitle ?? 'Blog',
      listSubtitle: options?.labels?.listSubtitle ?? '',
      backToList: options?.labels?.backToList ?? '← Voltar ao blog',
    },
  }
}
