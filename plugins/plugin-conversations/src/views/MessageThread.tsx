import React from 'react'
import { Send, Clock, Archive, PanelRight, MessageSquare, ChevronLeft } from 'lucide-react'
import { Button, cn } from '@fayz-ai/ui'
import { useTranslation } from '@fayz-ai/core'
import { useConversationsStore } from '../ConversationsContext'
import { CHANNEL_ACCENT, CHANNEL_LABELS } from '../channel'
import type { Conversation, Message } from '../types'
import { Avatar, ChannelBadge, dayLabel } from './shared'

// Build a flat render list: day-separator rows interleaved with messages, and
// each message flagged as the start of a new sender-run (WhatsApp grouping).
type Row =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; id: string; message: Message; startsRun: boolean; endsRun: boolean }

function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = []
  let lastDay = ''
  messages.forEach((m, i) => {
    const day = new Date(m.at).toDateString()
    if (day !== lastDay) {
      rows.push({ kind: 'day', id: `day-${day}`, label: dayLabel(m.at) })
      lastDay = day
    }
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const samePrev = prev && prev.direction === m.direction && new Date(prev.at).toDateString() === day
    const sameNext = next && next.direction === m.direction && new Date(next.at).toDateString() === day
    rows.push({ kind: 'msg', id: m.id, message: m, startsRun: !samePrev, endsRun: !sameNext })
  })
  return rows
}

export function MessageThread({ selected, onTogglePanel, panelOpen, onBack, className }: {
  selected: Conversation
  onTogglePanel: () => void
  panelOpen: boolean
  onBack?: () => void
  className?: string
}) {
  const t = useTranslation()
  const { messages, sending, send, setStatus } = useConversationsStore((s) => s)
  const [draft, setDraft] = React.useState('')
  const threadRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, selected.id])

  async function handleSend() {
    if (!draft.trim()) return
    const body = draft
    setDraft('')
    await send(body)
  }

  const accent = CHANNEL_ACCENT[selected.channel]
  const rows = React.useMemo(() => buildRows(messages), [messages])

  return (
    <section className={cn('flex min-w-0 flex-1 flex-col bg-muted/20', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="-ml-1 shrink-0 lg:hidden" onClick={onBack} aria-label={t('conversations.thread.back')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar name={selected.contactName} accent={selected.accent} size="sm" channel={selected.channel} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{selected.contactName}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChannelBadge channel={selected.channel} />
              <span className="truncate">{selected.contactHandle}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setStatus('snoozed')} aria-label={t('conversations.thread.snooze')}>
            <Clock className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('conversations.thread.snooze')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStatus('closed')} aria-label={t('conversations.thread.close')}>
            <Archive className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('conversations.thread.close')}</span>
          </Button>
          <Button
            variant={panelOpen ? 'secondary' : 'ghost'}
            size="icon"
            onClick={onTogglePanel}
            aria-label={t('conversations.thread.details')}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {rows.map((row) => {
          if (row.kind === 'day') {
            return (
              <div key={row.id} className="my-3 flex items-center justify-center">
                <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {row.label}
                </span>
              </div>
            )
          }
          const m = row.message
          const outbound = m.direction === 'outbound'
          return (
            <div
              key={row.id}
              className={cn('flex', outbound ? 'justify-end' : 'justify-start', row.startsRun ? 'mt-2.5' : 'mt-0.5')}
            >
              <div
                className={cn(
                  'max-w-[68%] px-3.5 py-2 text-sm shadow-sm',
                  outbound ? 'rounded-2xl text-white' : 'rounded-2xl bg-card text-foreground',
                  // Tail only on the last bubble of a run, on the sender's side.
                  outbound && row.endsRun && 'rounded-br-sm',
                  !outbound && row.endsRun && 'rounded-bl-sm',
                )}
                style={outbound ? { backgroundColor: accent.color } : undefined}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className={cn('mt-0.5 text-right text-[10px]', outbound ? 'text-white/70' : 'text-muted-foreground')}>
                  {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-7 w-7" />
            <p className="mt-2 text-sm">{t('conversations.thread.empty')}</p>
          </div>
        )}
      </div>

      {/* Composer */}
      {/* TODO(follow-up): wire real emoji picker + attachment upload (removed the
          dead placeholder buttons rather than shipping non-functional UI). */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            rows={1}
            placeholder={t('conversations.thread.reply', { channel: CHANNEL_LABELS[selected.channel] })}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()} aria-label={t('conversations.thread.send')}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
