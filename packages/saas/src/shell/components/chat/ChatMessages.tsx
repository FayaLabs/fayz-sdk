import * as React from 'react'
import { Check, ChevronRight, Infinity as InfinityIcon, Loader2, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import type { ChatMessage, ChatToolCall } from '../../stores/chat.store'
import { ChatMarkdown } from './markdown'
import { RecordChip } from './RecordChip'
// NOTE: src/lib copy — the one AdminShell's setEntityRouteMap fills. The
// shell/lib duplicate is a legacy shim nobody populates ('two of everything').
import { resolveEntityRoute } from '../../../lib/entity-routes'

/** `agenda_create_appointment` → `Agenda create appointment`. The raw name is
 *  still there, one expand away — the person reading is a salon manager. */
export function humanizeToolName(name: string): string {
  const spaced = name
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function ToolCallRow({ call }: { call: ChatToolCall }) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const failed = call.declined || /"error"\s*:/.test(call.result ?? '')

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-muted/60"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        <span
          className={cn(
            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
            failed ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success',
          )}
        >
          {failed ? <X className="h-2 w-2" strokeWidth={3} /> : <Check className="h-2 w-2" strokeWidth={3} />}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[11px]',
            call.declined ? 'text-muted-foreground line-through' : 'text-muted-foreground',
          )}
        >
          {humanizeToolName(call.name)}
        </span>
        {call.autoApproved && (
          <span
            title={t('chat.confirmAction.autoApprovedHint')}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-medium text-primary"
          >
            <InfinityIcon className="h-2.5 w-2.5" />
            {t('chat.confirmAction.autoApproved')}
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-1 border-t border-border/50 px-2 py-1.5">
          <code className="block font-mono text-[9.5px] text-muted-foreground/70">{call.name}</code>
          {call.args && (
            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-snug text-muted-foreground">
              {call.args}
            </pre>
          )}
          {call.result && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-background/70 p-1.5 font-mono text-[9px] leading-snug text-foreground/80">
              {call.result}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  // Unroutable chips are dropped here — a goto row exists to be clicked.
  const routedLinks = React.useMemo(
    () => (message.links ?? []).filter((l) => !!resolveEntityRoute(l.archetype, l.kind, l.entityKey)),
    [message.links],
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-1 motion-safe:animate-slide-in-from-bottom',
        isUser ? 'items-end' : 'items-start',
      )}
    >
      {/* Chronological order: the work happened BEFORE the reply — trace on
          top, answer below, goto buttons (the next step) underneath. */}
      {!isUser && (message.toolCalls?.length ?? 0) > 0 && (
        <div className="flex w-full max-w-[88%] flex-col gap-1">
          {message.toolCalls!.map((call, i) => (
            <ToolCallRow key={`${call.name}-${i}`} call={call} />
          ))}
        </div>
      )}
      {(isUser || message.content) && (
        <div
          className={cn(
            'max-w-[88%] text-[13.5px] leading-relaxed',
            isUser
              ? 'rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground shadow-sm'
              : 'rounded-2xl rounded-bl-md border border-border/50 bg-muted/50 px-3.5 py-2 text-foreground',
          )}
        >
          {isUser ? message.content : <ChatMarkdown content={message.content} />}
        </div>
      )}
      {!isUser && routedLinks.length > 0 && (
        <div className="flex max-w-[88%] flex-wrap gap-1">
          {routedLinks.map((link) => (
            <RecordChip key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Which tools are running right now — the agent's work made visible instead
 *  of a silent pause. */
export function ActiveToolChips({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.06] px-2 py-0.5 text-[10.5px] text-primary"
        >
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {humanizeToolName(name)}
        </span>
      ))}
    </div>
  )
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 140}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  )
}
