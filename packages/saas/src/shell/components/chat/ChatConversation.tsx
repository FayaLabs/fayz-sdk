import * as React from 'react'
import {
  ArrowDown,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Settings2,
  SquarePen,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useChatStore } from '../../stores/chat.store'
import { useChat } from '../../hooks/useChat'
import { useAITools } from '../../hooks/useAITools'
import { useAuthStore } from '@fayz-ai/auth'
import { ChatSuggestions, ChatToolsPanel } from './ChatSuggestions'
import { ChatComposer } from './ChatComposer'
import { ActiveToolChips, MessageBubble } from './ChatMessages'
import { ConfirmActionCard } from './ConfirmActionCard'
import { stopSpeaking } from '../../lib/speech'
import { useAccessOptional } from '../../../access/context'
import { UpgradeOverlay } from '../billing/UpgradeOverlay'
import { ASSISTANT_FEATURE } from '../../lib/assistant-feature'
import { resolveFayzAgentConnection, type FayzAgentConnectionConfig } from '../../lib/fayz-agent'
import type { ChatVoiceConfig } from '../../../app/config'

/** Injected once — the idle view rises in as a stagger, elements carrying their
 *  own animationDelay. Motion-gated in CSS so reduced-motion gets it static. */
const INTRO_STYLE_ID = 'chat-panel-anims'
function ensureIntroStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(INTRO_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = INTRO_STYLE_ID
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      @keyframes chatIntroUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .chat-intro { animation: chatIntroUp 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    }
  `
  document.head.appendChild(style)
}

/** The conversation with no box around it — status row, history/tools drawers,
 *  transcript, confirmation card, suggestions, composer. Owns no position, so
 *  any surface can mount it. */
export interface ChatConversationProps {
  apiEndpoint?: string
  systemPrompt?: string
  agent?: FayzAgentConnectionConfig | false
  voice?: ChatVoiceConfig
  /** Enables the discreet "continuar no WhatsApp" hand-off under the composer. */
  whatsapp?: { number: string; message?: string }
  className?: string
}

type Drawer = 'none' | 'tools'

export function ChatConversation({
  apiEndpoint,
  systemPrompt,
  agent,
  voice,
  whatsapp,
  className,
}: ChatConversationProps) {
  const { messages, isStreaming, conversationId } = useChatStore()
  const {
    sendMessage, isConfigured, pendingAction, resolvePendingAction,
    activeTools, conversations, loadConversations, resumeConversation, startNewConversation,
  } = useChat({ apiEndpoint, systemPrompt, agent })
  const { t } = useTranslation()
  const { suggestions, toolGroups } = useAITools()
  const user = useAuthStore((s) => s.user)
  const setDraft = useChatStore((s) => s.setDraft)
  const suggestionsOpen = useChatStore((s) => s.suggestionsOpen)
  const setSuggestionsOpen = useChatStore((s) => s.setSuggestionsOpen)
  // A plan gates the assistant only with an explicit `features.assistant:false`,
  // so an app that never heard of it stays open.
  const planLocked = !useAccessOptional().entitled(ASSISTANT_FEATURE)
  const usable = isConfigured && !planLocked

  React.useEffect(ensureIntroStyles, [])

  // Skeleton only makes sense when a Fayz agent backs the history — a custom
  // apiEndpoint has no thread list, so its first load would never settle.
  const conversationsLoaded = useChatStore((s) => s.conversationsLoaded)
  const hasHistoryBackend = React.useMemo(
    () => !apiEndpoint && !!resolveFayzAgentConnection(agent),
    [apiEndpoint, agent],
  )
  const conversationsPending = hasHistoryBackend && !conversationsLoaded

  // Two views in one tab: the open thread, and the list you came from. The
  // panel remounts on every open, so `messages` (which survive in the store)
  // decide where you land — reopening returns you to what you were doing.
  const [view, setView] = React.useState<'thread' | 'list'>(
    () => (useChatStore.getState().messages.length > 0 ? 'thread' : 'list'),
  )
  const [drawer, setDrawer] = React.useState<Drawer>('none')
  const [atBottom, setAtBottom] = React.useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // Only autoscroll while the user is at the bottom; the jump pill covers the rest.
  React.useEffect(() => {
    if (atBottom) scrollToBottom()
  }, [messages, activeTools, pendingAction, atBottom, scrollToBottom])

  React.useEffect(() => {
    loadConversations()
    // Coming back to a live thread, the suggestion strip is noise in front of
    // it; the composer's Sparkles button brings it back.
    setSuggestionsOpen(useChatStore.getState().messages.length === 0)
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48)
  }

  const send = (text: string) => {
    setView('thread')
    setAtBottom(true)
    setSuggestionsOpen(false)
    sendMessage(text)
  }

  // Delegated work ("resolver com IA"): the user already said go elsewhere —
  // fire it the moment the conversation can. Locked/unconfigured drops the
  // queue; the paywall or offline note on screen explains why.
  const queuedPrompt = useChatStore((s) => s.queuedPrompt)
  const consumeQueuedPrompt = useChatStore((s) => s.consumeQueuedPrompt)
  React.useEffect(() => {
    if (!queuedPrompt) return
    const prompt = consumeQueuedPrompt()
    if (prompt && usable) send(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedPrompt, usable])

  const toggleDrawer = (next: Drawer) => setDrawer((current) => (current === next ? 'none' : next))

  const greetingName = (user?.fullName || user?.email || '').split(/[\s@]/)[0]
  const showSuggestions = usable && suggestions.length > 0 && suggestionsOpen

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      {/* Status + actions. The surface around it owns the title and the close. */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-card/95 px-2 py-1 backdrop-blur">
        {view === 'thread' && hasMessages ? (
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[11.5px]',
              'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('chat.backToConversations')}</span>
          </button>
        ) : (
          <p className="min-w-0 flex-1 truncate px-1 text-[11px] leading-tight text-muted-foreground">
            {isStreaming ? t('chat.status.working') : !isConfigured ? t('chat.status.offline') : ''}
          </p>
        )}

        <div className="flex items-center gap-0.5">
          {hasMessages && (
            <HeaderButton
              onClick={() => {
                startNewConversation()
                setView('list')
              }}
              label={t('chat.newConversation')}
            >
              <SquarePen className="h-3.5 w-3.5" />
            </HeaderButton>
          )}
          {totalTools > 0 && (
            <HeaderButton
              active={drawer === 'tools'}
              onClick={() => toggleDrawer('tools')}
              label={t('chat.toolsAvailable', { count: totalTools })}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </HeaderButton>
          )}
        </div>
      </div>

      {drawer === 'tools' ? (
        <ChatToolsPanel toolGroups={toolGroups} onClose={() => setDrawer('none')} />
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={cn('min-h-0 flex-1 overflow-y-auto', hasMessages && 'space-y-2 px-3 py-3')}
          >
            {/* Unavailable belongs HERE, not in the composer placeholder: a
                sentence explaining why nothing works reads as a hint about what
                to type when it sits in the input. */}
            {planLocked ? (
              // Same paywall pattern as the route guard: the assistant's idle
              // state (greeting + suggestions) shows behind as a blurred teaser.
              <UpgradeOverlay
                feature={ASSISTANT_FEATURE}
                overlayClassName="min-h-full py-4"
                promptClassName="px-3 py-4 sm:py-6"
              >
                <div className="flex flex-col px-3 pt-4">
                  <p className="px-0.5 text-[15px] font-semibold leading-snug text-foreground">
                    {greetingName
                      ? t('chat.greetingNamed', { name: greetingName })
                      : t('chat.greeting')}
                  </p>
                  <p className="px-0.5 text-[12px] leading-snug text-muted-foreground">
                    {t('chat.greetingHint')}
                  </p>
                  {suggestions.length > 0 && (
                    <div className="mt-4">
                      <ChatSuggestions
                        suggestions={suggestions}
                        compact
                        onDismiss={() => {}}
                        onSelect={() => {}}
                      />
                    </div>
                  )}
                </div>
              </UpgradeOverlay>
            ) : !isConfigured ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-6 py-10 text-center">
                <Sparkles className="mb-1 h-6 w-6 text-muted-foreground/40" />
                <p className="text-[13px] font-medium text-foreground">{t('chat.unavailable')}</p>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  {t('chat.notConfigured')}
                </p>
              </div>
            ) : view === 'list' || !hasMessages ? (
              <div className="flex min-h-0 flex-1 flex-col px-3 pt-4">
                <p className="chat-intro px-0.5 text-[15px] font-semibold leading-snug text-foreground">
                  {greetingName
                    ? t('chat.greetingNamed', { name: greetingName })
                    : t('chat.greeting')}
                </p>
                <p
                  className="chat-intro px-0.5 text-[12px] leading-snug text-muted-foreground"
                  style={{ animationDelay: '70ms' }}
                >
                  {t('chat.greetingHint')}
                </p>

                {conversationsPending ? (
                  <div className="chat-intro mt-4" style={{ animationDelay: '140ms' }}>
                    <span className="block px-0.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {t('chat.recentConversations')}
                    </span>
                    <div className="space-y-1 py-0.5">
                      {[76, 58, 66].map((width, index) => (
                        <div key={index} className="flex items-center gap-2 px-1 py-1.5">
                          <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-muted" />
                          <div
                            className="h-3 animate-pulse rounded bg-muted"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : conversations.length > 0 && (
                  <div className="chat-intro mt-4 min-h-0" style={{ animationDelay: '140ms' }}>
                    <span className="block px-0.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {t('chat.recentConversations')}
                    </span>
                    <div className="-mx-1">
                      {conversations.slice(0, 6).map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => {
                            setAtBottom(true)
                            setView('thread')
                            // Opening a thread puts the transcript in front;
                            // the strip would cover the tail of it.
                            setSuggestionsOpen(false)
                            resumeConversation(conversation.id)
                          }}
                          className={cn(
                            'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                            'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                        >
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/40" />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 block text-[12.5px] text-foreground/90">
                              {conversation.title ?? t('chat.untitledConversation')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {view === 'thread' &&
              messages.map((message, i) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isPending={
                    isStreaming &&
                    !pendingAction &&
                    activeTools.length === 0 &&
                    i === messages.length - 1 &&
                    message.role === 'assistant'
                  }
                />
              ))}

            {pendingAction && (
              <ConfirmActionCard action={pendingAction} onResolve={resolvePendingAction} />
            )}
            {/* Nothing runs behind the card — it is what everything is waiting on. */}
            {!pendingAction && activeTools.length > 0 && <ActiveToolChips names={activeTools} />}
          </div>

          {!atBottom && hasMessages && (
            <button
              type="button"
              onClick={() => {
                setAtBottom(true)
                scrollToBottom()
              }}
              className={cn(
                'absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card px-2.5 py-1',
                'text-[11px] font-medium text-foreground shadow-lg transition-colors hover:bg-muted',
              )}
            >
              <ArrowDown className="mr-1 inline h-3 w-3" />
              {t('chat.jumpToLatest')}
            </button>
          )}

          {showSuggestions && (
            <ChatSuggestions
              suggestions={suggestions}
              compact
              onDismiss={() => setSuggestionsOpen(false)}
              onSelect={(suggestion) => setDraft(suggestion.prompt ?? suggestion.label)}
            />
          )}
        </div>
      )}

      {drawer === 'none' && (
        <ChatComposer
          onSend={send}
          isStreaming={isStreaming}
          isConfigured={usable}
          blocked={!!pendingAction}
          voice={voice}
          hasSuggestions={suggestions.length > 0}
          suggestionsOpen={suggestionsOpen}
          onToggleSuggestions={() => setSuggestionsOpen(!suggestionsOpen)}
        />
      )}

      {/* Discreet channel hand-off — the conversation follows the user out of
          the app. Shown only when the app configured a WhatsApp number. */}
      {drawer === 'none' && whatsapp?.number && (
        <a
          href={`https://wa.me/${whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(
            whatsapp.message ?? t('chat.whatsapp.defaultMessage'),
          )}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 pb-2 text-[10.5px] text-muted-foreground/50 transition-colors hover:text-[#25D366]"
        >
          <WhatsAppGlyph className="h-3 w-3" />
          {t('chat.whatsapp.continue')}
        </a>
      )}
    </div>
  )
}

/** lucide dropped brand icons — a minimal WhatsApp glyph, currentColor. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.5 7.5 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.2.2-.3.3-.5v-.4c0-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4h-.5c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z" />
    </svg>
  )
}

function HeaderButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
