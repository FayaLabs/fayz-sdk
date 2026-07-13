import type { BlogAuthor } from '../types'

/** Round author avatar with a name-initial fallback (token-only). */
export function AuthorAvatar({ author, className = 'h-8 w-8 text-xs' }: { author: BlogAuthor; className?: string }) {
  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={author.name}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary ${className}`}>
      {author.name.charAt(0).toUpperCase()}
    </span>
  )
}
