import * as React from 'react'
import { MessageSquare, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'

export interface ChatConversationSummary {
  id: string
  title: string | null
  updatedAt: string
}

interface ChatHistoryProps {
  conversations: ChatConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
}

type Bucket = 'today' | 'yesterday' | 'week' | 'older'

function bucketOf(iso: string): Bucket {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'older'
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - then.getTime()) / 86_400_000)
  if (days < 0) return 'today'
  if (days === 0) return 'yesterday'
  if (days < 7) return 'week'
  return 'older'
}

const ORDER: Bucket[] = ['today', 'yesterday', 'week', 'older']

/** Past threads, grouped the way people remember them (today / yesterday /
 *  this week), searchable once there are enough to scroll. */
export function ChatHistory({ conversations, activeId, onSelect }: ChatHistoryProps) {
  const { t } = useTranslation()
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return conversations
    return conversations.filter((c) => (c.title ?? '').toLowerCase().includes(needle))
  }, [conversations, query])

  const groups = React.useMemo(() => {
    const map = new Map<Bucket, ChatConversationSummary[]>()
    for (const conversation of filtered) {
      const bucket = bucketOf(conversation.updatedAt)
      const list = map.get(bucket)
      if (list) list.push(conversation)
      else map.set(bucket, [conversation])
    }
    return ORDER.filter((bucket) => map.has(bucket)).map((bucket) => ({
      bucket,
      items: map.get(bucket)!,
    }))
  }, [filtered])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {conversations.length > 6 && (
        <div className="border-b border-border/40 px-3 py-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 focus-within:border-foreground/25">
            <Search className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('chat.history.search')}
              aria-label={t('chat.history.search')}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {groups.length === 0 && (
          <p className="px-4 py-6 text-center text-[11.5px] text-muted-foreground">
            {t('chat.history.empty')}
          </p>
        )}
        {groups.map(({ bucket, items }) => (
          <div key={bucket} className="pb-1">
            <span className="block px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {t(`chat.history.${bucket}`)}
            </span>
            {items.map((conversation) => {
              const active = conversation.id === activeId
              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    'flex w-full items-start gap-2 px-4 py-1.5 text-left transition-colors',
                    active ? 'bg-primary/[0.06]' : 'hover:bg-muted/50',
                  )}
                >
                  <MessageSquare
                    className={cn(
                      'mt-0.5 h-3 w-3 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground/40',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'line-clamp-1 block text-[12.5px]',
                        active ? 'font-medium text-foreground' : 'text-foreground/90',
                      )}
                    >
                      {conversation.title ?? t('chat.untitledConversation')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatWhen(conversation.updatedAt)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const sameDay = new Date().toDateString() === date.toDateString()
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}
