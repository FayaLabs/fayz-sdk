import React from 'react'
import { cn } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import type { PostFormat, PostStatus } from '../../data/contentTypes'
import { PLATFORMS, POST_STATUS_ORDER } from '../../data/contentTypes'
import { PlatformIcon } from '../../components/icons'

export const POST_FORMATS: PostFormat[] = ['reel', 'static', 'carousel', 'story', 'video', 'live', 'article']
export { POST_STATUS_ORDER }

const FORMAT_STYLE: Record<PostFormat, string> = {
  reel: 'bg-violet-100 text-violet-700',
  static: 'bg-sky-100 text-sky-700',
  carousel: 'bg-amber-100 text-amber-700',
  story: 'bg-pink-100 text-pink-700',
  video: 'bg-red-100 text-red-700',
  live: 'bg-rose-100 text-rose-700',
  article: 'bg-teal-100 text-teal-700',
}

// Status dot colors — same palette/semantics as plugin-agenda's booking
// statuses (config.ts): gray backlog, indigo planned, warm amber/orange while
// in production, blue when scheduled, emerald when done.
export const POST_STATUS_COLOR: Record<PostStatus, string> = {
  idea: '#6b7280',
  script: '#6366f1',
  recording: '#f59e0b',
  editing: '#f97316',
  scheduled: '#3b82f6',
  published: '#10b981',
}

/** Small status dot (agenda/CRM convention) for selects and lists. */
export function StatusDot({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn('h-2 w-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: POST_STATUS_COLOR[status] }}
    />
  )
}

const STATUS_STYLE: Record<PostStatus, string> = {
  idea: 'bg-slate-100 text-slate-600',
  script: 'bg-indigo-100 text-indigo-700',
  recording: 'bg-amber-100 text-amber-700',
  editing: 'bg-orange-100 text-orange-700',
  scheduled: 'bg-sky-100 text-sky-700',
  published: 'bg-emerald-100 text-emerald-700',
}

export function FormatBadge({ format }: { format: PostFormat }) {
  const t = useTranslation()
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', FORMAT_STYLE[format])}>
      {t(`marketing.content.format.${format}`)}
    </span>
  )
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const t = useTranslation()
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>
      {t(`marketing.content.status.${status}`)}
    </span>
  )
}

/** Compact row of platform glyphs (post targets or account connections). */
export function PlatformBadges({ platforms, className }: { platforms: string[]; className?: string }) {
  if (platforms.length === 0) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-muted-foreground', className)}>
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} className="h-3.5 w-3.5" />
      ))}
    </span>
  )
}

/** Toggleable platform chips — used by the add-account form and the post page. */
export function PlatformPicker({ value, onChange }: {
  value: string[]
  onChange: (platforms: string[]) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PLATFORMS.map((platform) => {
        const selected = value.includes(platform)
        return (
          <button
            key={platform}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((p) => p !== platform) : [...value, platform])
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors',
              selected
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/40',
            )}
          >
            <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
            {platform}
          </button>
        )
      })}
    </div>
  )
}

