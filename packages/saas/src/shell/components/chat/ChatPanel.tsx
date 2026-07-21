import * as React from 'react'
import { ArrowUp, Check, ExternalLink, History, Loader2, Pencil, Plus, Settings2, Wrench } from 'lucide-react'
import { Markdown } from '@fayz-ai/ui'
import { useRouter } from '../../lib/router'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useChatStore, type ChatMessage } from '../../stores/chat.store'
import { useChat } from '../../hooks/useChat'
import { useAITools } from '../../hooks/useAITools'
import { ChatSuggestions, ChatToolsPanel } from './ChatSuggestions'
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
    sendMessage,
    isConfigured,
    history,
    conversationId,
    loadHistory,
    openConversation,
    renameConversation,
    startNewConversation,
  } = useChat({ apiEndpoint, systemPrompt, agent })
  const [showHistory, setShowHistory] = React.useState(false)
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameDraft, setRenameDraft] = React.useState('')
  const { t } = useTranslation()
  const { suggestions, toolGroups } = useAITools()
  const [input, setInput] = React.useState('')
  const [showTools, setShowTools] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const hasMessages = messages.length > 0
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Load once per open. Keyed on a ref rather than on loadHistory's identity so
  // a re-created callback can never turn this into a fetch loop.
  const historyLoadedRef = React.useRef(false)
  React.useEffect(() => {
    if (isOpen) {
      if (!historyLoadedRef.current) {
        historyLoadedRef.current = true
        // Past conversations are why the panel does not open blank; fetch them
        // on open so "resume" is one click away.
        void loadHistory()
      }
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
    historyLoadedRef.current = false
    setShowTools(false)
    setShowHistory(false)
  }, [isOpen, loadHistory])

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
        {history.length > 0 && (
          <button
            onClick={() => { setShowHistory((v) => !v); setShowTools(false) }}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors',
              showHistory ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
            title={t('chat.history')}
          >
            <History className="h-3 w-3" />
          </button>
        )}
        {messages.length > 0 && (
          <button
            onClick={() => { startNewConversation(); setShowHistory(false); void loadHistory() }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title={t('chat.newConversation')}
          >
            <Plus className="h-3 w-3" />
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

      {/* History drawer — resume a past conversation or start a clean one */}
      {showHistory ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button
            onClick={() => { startNewConversation(); setShowHistory(false) }}
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted/60"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {t('chat.newConversation')}
          </button>
          {history.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                'group flex items-center gap-1 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60',
                conv.id === conversationId && 'bg-muted/60',
              )}
            >
              {renamingId === conv.id ? (
                <>
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenamingId(null)
                      if (e.key === 'Enter' && renameDraft.trim()) {
                        void renameConversation(conv.id, renameDraft.trim())
                        setRenamingId(null)
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (renameDraft.trim()) void renameConversation(conv.id, renameDraft.trim())
                      setRenamingId(null)
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={t('chat.saveTitle')}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { void openConversation(conv.id); setShowHistory(false) }}
                    className="min-w-0 flex-1 truncate text-left text-[13px] text-foreground"
                  >
                    {conv.title || t('chat.untitledConversation')}
                  </button>
                  <button
                    onClick={() => { setRenamingId(conv.id); setRenameDraft(conv.title ?? '') }}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    aria-label={t('chat.renameConversation')}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
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
          {isStreaming && messages[messages.length - 1]?.content === '' && (
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
            placeholder={isConfigured ? t('chat.messagePlaceholder') : t('chat.notConfigured')}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed"
            disabled={isStreaming || !isConfigured}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || !isConfigured}
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const router = useRouter()

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-foreground px-3 py-1.5 text-[13px] leading-relaxed text-background">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {/* What it ran, live. Same activity the Fayz dashboard shows after the
          fact — surfacing it here is what makes a multi-second answer legible
          instead of looking frozen. */}
      {message.activity && message.activity.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {message.activity.map((step, i) => (
            <span
              key={`${step.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {step.status === 'running' ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Wrench className="h-2.5 w-2.5" />
              )}
              {step.name}
            </span>
          ))}
        </div>
      )}

      {message.content && (
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-1.5 text-[13px] leading-relaxed text-foreground">
          {/* Answers come back as markdown; rendering it raw showed users
              literal ** around every field. */}
          <Markdown source={message.content} className="space-y-2 text-[13px]" />
        </div>
      )}

      {/* Records the answer refers to, as links straight to their page. */}
      {message.links && message.links.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {message.links.map((link) => (
            <button
              key={link.url}
              onClick={() => router.navigate(link.url)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
              {link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
