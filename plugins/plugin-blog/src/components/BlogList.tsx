import { useBlogPosts } from '../hooks/useBlogPosts'
import { useBlogContext } from '../context'
import { PostCard } from './PostCard'
import { useSeo, blogJsonLd } from '../seo'

/**
 * Full /blog list screen. Rendered inside the host's chrome (Header/Footer),
 * so it only owns the section body — token-only for theme inheritance.
 */
export function BlogList() {
  const { config } = useBlogContext()
  const { posts, loading, error } = useBlogPosts()

  const listTitle = config.labels.listSubtitle || config.labels.listTitle
  useSeo({
    title: `${listTitle}${config.siteName ? ` · ${config.siteName}` : ''}`,
    description: config.labels.listSubtitle || `Artigos do blog${config.siteName ? ` da ${config.siteName}` : ''}.`,
    canonical: `${typeof window !== 'undefined' ? window.location.origin : ''}${config.basePath}`,
    type: 'website',
    siteName: config.siteName,
    jsonLd: posts.length ? blogJsonLd(posts, { basePath: config.basePath, siteName: config.siteName, title: listTitle }) : undefined,
  })

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="mb-12 max-w-2xl">
          <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            {config.labels.listTitle}
          </span>
          {config.labels.listSubtitle ? (
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
              {config.labels.listSubtitle}
            </h1>
          ) : null}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando artigos…</p>
        ) : error ? (
          <p className="text-muted-foreground">Não foi possível carregar os artigos.</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">Nenhum artigo publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} basePath={config.basePath} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
