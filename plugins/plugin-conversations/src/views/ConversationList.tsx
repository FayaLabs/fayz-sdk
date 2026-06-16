import React from 'react'
import { Search, Inbox as InboxIcon } from 'lucide-react'
import { Input, cn } from '@fayz-ai/ui'
import { useConversationsStore } from '../ConversationsContext'
import type { Channel } from '../types'
import { Avatar, ChannelBadge, relativeTime } from './shared'

const FILTERS: Array<{ id: Channel | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'Email' },
  { id: 'webchat', label: 'Web' },
]

export function ConversationList({ className }: { className?: string }) {
  const {
    conversations, selectedId, channelFilter, search, loading,
    select, setChannelFilter, setSearch,
  } = useConversationsStore((s) => s)

  return (
    <aside className={cn('w-full shrink-0 flex-col border-r border-border bg-card lg:w-[320px]', className)}>
      <div className="border-b border-border px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="pl-8"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setChannelFilter(f.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                channelFilter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && conversations.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        )}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <InboxIcon className="h-6 w-6" />
            <p className="text-sm">No conversations</p>
          </div>
        )}
        {conversations.map((c) => {
          const active = c.id === selectedId
          const unread = c.unreadCount > 0
          return (
            <button
              key={c.id}
              onClick={() => select(c.id)}
              className={cn(
                'flex w-full items-start gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors',
                active ? 'bg-accent' : 'hover:bg-muted/50',
              )}
            >
              <Avatar name={c.contactName} accent={c.accent} channel={c.channel} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('truncate text-sm text-foreground', unread ? 'font-semibold' : 'font-medium')}>
                    {c.contactName}
                  </span>
                  <span className={cn('shrink-0 text-[11px]', unread ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                    {relativeTime(c.lastMessageAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ChannelBadge channel={c.channel} />
                  {c.status !== 'open' && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{c.status}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={cn('truncate text-xs', unread ? 'text-foreground' : 'text-muted-foreground')}>
                    {c.lastMessagePreview}
                  </span>
                  {unread && (
                    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
