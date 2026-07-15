import { Link, useParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { usePost } from '../hooks/usePost'
import { useBlogContext } from '../context'
import { AuthorAvatar } from './AuthorAvatar'
import { useSeo, articleJsonLd, postUrl } from '../seo'

/**
 * /blog/:slug detail screen. Reads the slug from the router and renders the
 * article inside the host chrome. Token-only for theme inheritance. Sets rich
 * SEO/JSON-LD per article (BlogPosting + BreadcrumbList).
 */
export function PostDetail() {
  const { config } = useBlogContext()
  const { slug } = useParams<{ slug: string }>()
  const { post, loading, error } = usePost(slug)

  useSeo(
    post
      ? {
          title: `${post.title}${config.siteName ? ` · ${config.siteName}` : ''}`,
          description: post.excerpt,
          canonical: postUrl(config.basePath, post.slug),
          image: post.image,
          type: 'article',
          siteName: config.siteName,
          jsonLd: articleJsonLd(post, { basePath: config.basePath, siteName: config.siteName }),
        }
      : { title: config.siteName || 'Blog' },
  )

  const paragraphs = post?.body ? post.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : []

  return (
    <article className="py-16 bg-background">
      <div className="container mx-auto px-6 max-w-3xl">
        <Link to={config.basePath} className="text-sm font-medium text-primary hover:underline">
          {config.labels.backToList}
        </Link>

        {loading ? (
          <p className="mt-10 text-muted-foreground">Carregando…</p>
        ) : error || !post ? (
          <div className="mt-10">
            <h1 className="font-heading text-3xl font-bold text-foreground">Artigo não encontrado</h1>
            <p className="mt-2 text-muted-foreground">Este artigo pode ter sido movido ou removido.</p>
          </div>
        ) : (
          <>
            <h1 className="mt-8 font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight">
              {post.title}
            </h1>

            {/* Medium-style byline */}
            <div className="mt-6 flex items-center gap-3">
              <AuthorAvatar author={post.author} className="h-11 w-11 text-base" />
              <div>
                <p className="font-semibold text-foreground">{post.author.name}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  {post.author.role ? <span>{post.author.role}<span aria-hidden> · </span></span> : null}
                  <time dateTime={post.publishedAt}>{post.date}</time>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime} de leitura</span>
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl">
              <img src={post.image} alt={post.title} className="w-full object-cover" loading="lazy" />
            </div>

            <div className="mt-8 space-y-5">
              <p className="text-lg text-foreground/90 leading-relaxed font-medium">{post.excerpt}</p>
              {paragraphs.map((para, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            {/* Category tag — at the bottom, Medium-style */}
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Link
                to={config.basePath}
                className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-accent/70"
              >
                {post.tag}
              </Link>
            </div>

            {/* About the author */}
            {post.author.bio ? (
              <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-muted/40 p-6">
                <AuthorAvatar author={post.author} className="h-14 w-14 text-lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Escrito por</p>
                  <p className="font-heading text-lg font-bold text-foreground">{post.author.name}</p>
                  {post.author.role ? <p className="text-sm text-primary">{post.author.role}</p> : null}
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{post.author.bio}</p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}
