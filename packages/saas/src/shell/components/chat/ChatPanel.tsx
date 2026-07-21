import * as React from 'react'
import { ArrowUp, ChevronDown, History, Loader2, SquarePen, Settings2, Wrench } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useChatStore, type ChatMessage, type ChatToolCall } from '../../stores/chat.store'
import { useChat } from '../../hooks/useChat'
import { useAITools } from '../../hooks/useAITools'
import { ChatSuggestions, ChatToolsPanel } from './ChatSuggestions'
import { ConfirmActionCard } from './ConfirmActionCard'
import { ChatMarkdown } from './markdown'
import type { FayzAgentConnectionConfig } from '../../lib/fayz-agent'

interface ChatPanelProps {
  title?: string
  apiEndpoint?: string
  systemPrompt?: string
  agent?: FayzAgentConnectionConfig | false
  className?: string
}

export function ChatPanel({
  title = 'Assistant',
  apiEndpoint,
  systemPrompt,
  agent,
  className,
}: ChatPanelProps) {
  const { isOpen, messages, isStreaming } = useChatStore()
  const {
    sendMessage, isConfigured, pendingAction, resolvePendingAction,
    activeTools, conversations, loadConversations, resumeConversation, startNewConversation,
  } = useChat({ apiEndpoint, systemPrompt, agent })
  const { t } = useTranslation()
  const { suggestions, toolGroups } = useAITools()
  const [input, setInput] = React.useState('')
  const [showTools, setShowTools] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const hasMessages = messages.length > 0
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  React.useEffect(() => {
    if (isOpen) {
      loadConversations()
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
    setShowTools(false)
    setShowHistory(false)
  }, [isOpen, loadConversations])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming || !isConfigured) return
    setInput('')
    setShowTools(false)
    sendMessage(text)
  }

  return (
    <div
      className={cn(
        'fixed z-40 flex flex-col overflow-hidden bg-card shadow-2xl',
        // Mobile: below header, above bottom nav
        'inset-x-0 top-12 bottom-16 rounded-none border-0',
        // Desktop: floating card — sits just above the FAB, touching it
        'md:inset-auto md:bottom-[3.75rem] md:right-4 md:w-[22rem] md:max-h-[min(70vh,520px)] md:rounded-2xl md:rounded-br-none md:border md:border-border/50',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-150',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
        {hasMessages && (
          <button
            onClick={startNewConversation}
            className="inline-flex items-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title={t('chat.newConversation')}
          >
            <SquarePen className="h-3 w-3" />
          </button>
        )}
        {conversations.length > 0 && (
          <button
            onClick={() => { setShowHistory(!showHistory); setShowTools(false) }}
            className={cn(
              'inline-flex items-center rounded-md p-1.5 transition-colors',
              showHistory ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title={t('chat.history')}
          >
            <History className="h-3 w-3" />
          </button>
        )}
        {totalTools > 0 && (
          <button
            onClick={() => { setShowTools(!showTools); setShowHistory(false) }}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors',
              showTools
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            title="Available tools"
          >
            <Settings2 className="h-3 w-3" />
            <span className="font-medium">{totalTools}</span>
          </button>
        )}
        </div>
      </div>

      {/* History drawer */}
      {showHistory ? (
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setShowHistory(false)
                resumeConversation(c.id)
              }}
              className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <span className="line-clamp-1 text-[13px] text-foreground">
                {c.title ?? t('chat.newConversation')}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.updatedAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      ) : showTools ? (
        <ChatToolsPanel toolGroups={toolGroups} onClose={() => setShowTools(false)} />
      ) : (
        /* Messages / suggestions area */
        <div
          ref={scrollRef}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto',
            hasMessages && 'space-y-2 px-3 py-3'
          )}
        >
          {!hasMessages && (
            <>
              {!isConfigured && (
                <div className="mx-3 mt-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t('chat.notConfigured')}
                </div>
              )}
              <ChatSuggestions
                suggestions={suggestions}
                onSelect={(suggestion) => {
                  setInput('')
                  sendMessage(suggestion.prompt ?? suggestion.label)
                }}
              />
            </>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {pendingAction && (
            <ConfirmActionCard action={pendingAction} onResolve={resolvePendingAction} />
          )}
          {activeTools.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 px-2 py-1">
              {activeTools.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  {name}
                </span>
              ))}
            </div>
          )}
          {isStreaming && !pendingAction && activeTools.length === 0 && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-pulse" />
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:150ms]" />
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:300ms]" />
            </div>
          )}
        </div>
      )}

      {/* Input — disabled until a real chat.apiEndpoint is configured. */}
      <form onSubmit={handleSubmit} className="border-t border-border/40 p-2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-3.5 pr-1 transition-colors focus-within:border-foreground/20">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pendingAction
                ? t('chat.confirmAction.blocked')
                : isConfigured
                  ? t('chat.messagePlaceholder')
                  : t('chat.notConfigured')
            }
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed"
            disabled={isStreaming || !isConfigured || !!pendingAction}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || !isConfigured || !!pendingAction}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-20"
            aria-label="Send message"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  )
}

function ToolCallRow({ call }: { call: ChatToolCall }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="rounded-md border border-border/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Wrench className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{call.name}</span>
        <ChevronDown className={cn('ml-auto h-2.5 w-2.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-1 border-t border-border/60 px-2 py-1.5">
          {call.args && (
            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-snug text-muted-foreground">{call.args}</pre>
          )}
          {call.result && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-1.5 font-mono text-[9px] leading-snug text-foreground/80">{call.result}</pre>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-foreground text-background'
            : 'rounded-bl-sm bg-muted text-foreground'
        )}
      >
        {isUser ? message.content : <ChatMarkdown content={message.content} />}
      </div>
      {!isUser && (message.toolCalls?.length ?? 0) > 0 && (
        <div className="flex max-w-[85%] flex-col gap-0.5 px-1">
          {message.toolCalls!.map((call, i) => (
            <ToolCallRow key={`${call.name}-${i}`} call={call} />
          ))}
        </div>
      )}
    </div>
  )
}
