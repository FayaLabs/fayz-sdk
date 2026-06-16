import React from 'react'
import { MapPin, User, Tag, Link2, StickyNote, X } from 'lucide-react'
import { Button, cn } from '@fayz-ai/ui'
import { CHANNEL_LABELS } from '../channel'
import type { Conversation } from '../types'
import { Avatar, ChannelBadge } from './shared'

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border px-4 py-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </p>
      {children}
    </div>
  )
}

export function ContactPanel({ contact, onClose, className }: {
  contact: Conversation
  onClose?: () => void
  className?: string
}) {
  return (
    <aside className={cn('flex shrink-0 flex-col overflow-y-auto border-l border-border bg-card', className)}>
      {onClose && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2 xl:hidden">
          <span className="text-sm font-semibold text-foreground">Details</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex flex-col items-center gap-2 px-4 py-5 text-center">
        <Avatar name={contact.contactName} accent={contact.accent} size="lg" channel={contact.channel} />
        <div>
          <p className="text-sm font-semibold text-foreground">{contact.contactName}</p>
          <p className="text-xs text-muted-foreground">{contact.contactHandle}</p>
        </div>
        <ChannelBadge channel={contact.channel} />
      </div>

      <Section icon={User} title="Details">
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Channel</dt>
            <dd className="text-foreground">{CHANNEL_LABELS[contact.channel]}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize text-foreground">{contact.status}</dd>
          </div>
          {contact.assignedTo && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd className="text-foreground">{contact.assignedTo}</dd>
            </div>
          )}
          {contact.location && (
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> Location</dt>
              <dd className="text-foreground">{contact.location}</dd>
            </div>
          )}
        </dl>
      </Section>

      {contact.tags.length > 0 && (
        <Section icon={Tag} title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {contact.note && (
        <Section icon={StickyNote} title="Note">
          <p className="text-sm text-foreground">{contact.note}</p>
        </Section>
      )}

      <Section icon={Link2} title="Linked records">
        <p className="text-xs text-muted-foreground">No linked records yet.</p>
      </Section>
    </aside>
  )
}
