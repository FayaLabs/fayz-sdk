import * as React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
// NOTE: src/lib copy — the one AdminShell's setEntityRouteMap fills. The
// shell/lib duplicate is a legacy shim nobody populates ('two of everything').
import { resolveEntityRoute, openEntity } from '../../../lib/entity-routes'
import { useChatStore, type ChatRecordLink } from '../../stores/chat.store'

/** A record's name, clickable when this app's route map resolves its
 *  archetype. Unroutable renders as plain text — a missing link is correct, an
 *  invented one is a dead end. */
export function RecordChip({
  link,
  variant = 'button',
  className,
}: {
  link: ChatRecordLink
  /** `button` — standalone chip under a reply. `inline` — inside a card row. */
  variant?: 'button' | 'inline'
  className?: string
}) {
  const setOpen = useChatStore((s) => s.setOpen)
  const routed = !!resolveEntityRoute(link.archetype, link.kind, link.entityKey)

  if (!routed) {
    return (
      <span className={cn('text-foreground', className)} title={link.id}>
        {link.label}
      </span>
    )
  }

  const go = () => {
    openEntity(link.id, link.archetype, link.kind, undefined, link.entityKey)
    // On a phone the panel covers the whole screen — navigating "somewhere"
    // the user cannot see is the same as not navigating.
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches) {
      setOpen(false)
    }
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={go}
        title={link.id}
        className={cn(
          'inline-flex max-w-full items-center gap-0.5 text-left font-medium text-foreground',
          'underline decoration-dashed decoration-muted-foreground/40 underline-offset-2',
          'transition-colors hover:text-primary hover:decoration-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          className,
        )}
      >
        <span className="truncate">{link.label}</span>
        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-50" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={go}
      title={link.id}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1',
        'text-[11px] font-medium text-foreground shadow-sm transition-all duration-200',
        'hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {link.label}
      <ArrowUpRight className="h-3 w-3" />
    </button>
  )
}
