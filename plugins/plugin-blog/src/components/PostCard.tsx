import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import type { BlogPost } from '../types'
import { AuthorAvatar } from './AuthorAvatar'

/**
 * Default post card — token-only so it inherits the host theme. Optional: a host
 * with bespoke card markup can ignore this and map `useBlogPosts()` itself.
 */
export function PostCard({ post, basePath = '/blog' }: { post: BlogPost; basePath?: string }) {
  return (
    <Link
      to={`${basePath}/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="overflow-hidden h-48">
        <img
          src={post.image}
          alt={post.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col flex-1 p-6">
        <span className="inline-block rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-primary mb-3 w-fit">
          {post.tag}
        </span>
        <h3 className="font-heading text-lg font-semibold text-foreground leading-snug mb-3 group-hover:text-primary transition-colors duration-200">
          {post.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-2.5 pt-4 border-t border-border">
          <AuthorAvatar author={post.author} className="h-7 w-7 text-xs" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{post.author.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {post.date}<span aria-hidden>·</span><Clock className="h-3 w-3" />{post.readTime}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
