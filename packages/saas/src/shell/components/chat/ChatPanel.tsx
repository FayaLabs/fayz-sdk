import * as React from 'react'
import { ArrowUp, Settings2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useChatStore, type ChatMessage } from '../../stores/chat.store'
import { useChat } from '../../hooks/useChat'
import { useAITools } from '../../hooks/useAITools'
import { ChatSuggestions, ChatToolsPanel } from './ChatSuggestions'

interface ChatPanelProps {
  title?: string
  apiEndpoint?: string
  systemPrompt?: string
  className?: string
}

export function ChatPanel({
  title = 'Assistant',
  apiEndpoint,
  systemPrompt,
  className,
}: ChatPanelProps) {
  const { isOpen, messages, isStreaming } = useChatStore()
  const { sendMessage } = useChat({ apiEndpoint, systemPrompt })
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

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
    setShowTools(false)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
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
        {totalTools > 0 && (
          <button
            onClick={() => setShowTools(!showTools)}
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

      {/* Tools panel overlay */}
      {showTools ? (
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
            <ChatSuggestions
              suggestions={suggestions}
              onSelect={(suggestion) => {
                setInput('')
                sendMessage(suggestion.prompt ?? suggestion.label)
              }}
            />
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border/40 p-2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-3.5 pr-1 transition-colors focus-within:border-foreground/20">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chat.messagePlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
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

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-foreground text-background'
            : 'rounded-bl-sm bg-muted text-foreground'
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
