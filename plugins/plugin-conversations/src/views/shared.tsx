import React from 'react'
import { cn } from '@fayz-ai/ui'
import { CHANNEL_ACCENT, CHANNEL_ICON, CHANNEL_LABELS } from '../channel'
import type { Channel } from '../types'

// ---------------------------------------------------------------------------
// Small presentational helpers shared across the inbox panes.
// ---------------------------------------------------------------------------

/** Reactive media-query match — drives the responsive list/thread/panel layout. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function initialsOf(name: string): string {
  return name.replace('@', '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function Avatar({ name, accent, size = 'md', channel }: {
  name: string
  accent: string
  size?: 'sm' | 'md' | 'lg'
  /** When set, renders a small channel glyph badge over the avatar. */
  channel?: Channel
}) {
  const dims = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
  const Icon = channel ? CHANNEL_ICON[channel] : null
  return (
    <div className="relative shrink-0">
      <div
        className={cn('flex items-center justify-center rounded-full font-semibold text-white', dims)}
        style={{ backgroundColor: accent }}
      >
        {initialsOf(name)}
      </div>
      {Icon && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card"
          style={{ backgroundColor: CHANNEL_ACCENT[channel!].color }}
        >
          <Icon className="h-2.5 w-2.5 text-white" />
        </span>
      )}
    </div>
  )
}

export function ChannelBadge({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = CHANNEL_ICON[channel]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        CHANNEL_ACCENT[channel].badge,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {CHANNEL_LABELS[channel]}
    </span>
  )
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.round(days / 7)}w`
}

/** Day label for the thread date separators. */
export function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (dayDiff <= 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: now.getFullYear() === d.getFullYear() ? undefined : 'numeric' })
}
