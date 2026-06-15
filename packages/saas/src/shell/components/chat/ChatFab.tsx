import * as React from 'react'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useChatStore } from '../../stores/chat.store'
import { useOrganizationStore } from '../../stores/organization.store'
import { useAITools, type ResolvedSuggestion } from '../../hooks/useAITools'
import { useChat } from '../../hooks/useChat'
import { useTranslation } from '../../hooks/useTranslation'

interface ChatFabProps {
  className?: string
  apiEndpoint?: string
  systemPrompt?: string
}

function TypewriterText({ text, speed = 28, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = React.useState('')
  const indexRef = React.useRef(0)

  React.useEffect(() => {
    setDisplayed('')
    indexRef.current = 0
    const interval = setInterval(() => {
      indexRef.current++
      if (indexRef.current > text.length) {
        clearInterval(interval)
        onDone?.()
        return
      }
      setDisplayed(text.slice(0, indexRef.current))
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-[2px] h-3 bg-current/60 animate-pulse ml-0.5 -mb-px" />
      )}
    </span>
  )
}

/** Injected once — keyframes for pill grow/shrink */
const STYLE_ID = 'chat-fab-anims'
function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes fabPillGrow {
      0%   { max-width: 2.75rem; opacity: 0.6; }
      40%  { opacity: 1; }
      100% { max-width: 22rem; opacity: 1; }
    }
    @keyframes fabPillShrink {
      0%   { max-width: 22rem; opacity: 1; }
      60%  { opacity: 0.6; }
      100% { max-width: 2.75rem; opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

export function ChatFab({ className, apiEndpoint, systemPrompt }: ChatFabProps) {
  const { isOpen, toggleOpen, setOpen } = useChatStore()
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const { contextualSuggestions } = useAITools()
  const { sendMessage } = useChat({ apiEndpoint, systemPrompt })
  const { t } = useTranslation()

  const [phase, setPhase] = React.useState<'idle' | 'expanding' | 'typing' | 'visible' | 'collapsing'>('idle')
  const [activeSuggestion, setActiveSuggestion] = React.useState<ResolvedSuggestion | null>(null)
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const prevSuggestionRef = React.useRef<string | null>(null)

  React.useEffect(ensureStyles, [])

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }
  const addTimer = (fn: () => void, ms: number) => { timersRef.current.push(setTimeout(fn, ms)) }

  const topSuggestion = contextualSuggestions[0] ?? null
  const topLabel = topSuggestion?.label ?? null

  React.useEffect(() => {
    if (isOpen || !topSuggestion || !topLabel) {
      if (phase !== 'idle') { clearTimers(); setPhase('collapsing'); addTimer(() => setPhase('idle'), 450) }
      prevSuggestionRef.current = null
      return
    }
    if (prevSuggestionRef.current === topLabel) return
    prevSuggestionRef.current = topLabel
    clearTimers()

    const startExpand = () => {
      setActiveSuggestion(topSuggestion)
      setPhase('expanding')
      // Start typing while pill is still growing
      addTimer(() => setPhase('typing'), 350)
    }

    if (phase !== 'idle') {
      setPhase('collapsing')
      addTimer(startExpand, 500)
    } else {
      addTimer(startExpand, 800)
    }

    addTimer(() => {
      setPhase('collapsing')
      addTimer(() => setPhase('idle'), 450)
    }, 9000)

    return clearTimers
  }, [topLabel, isOpen])

  React.useEffect(() => {
    if (isOpen && phase !== 'idle') { clearTimers(); setPhase('idle') }
  }, [isOpen])

  if (!currentOrg) return null

  // Resolve translated label for a suggestion (same logic as ChatSuggestions)
  const resolveLabel = (s: ResolvedSuggestion, index: number) => {
    const key = `chat.suggestion.${s.toolId}.${index}`
    const translated = t(key)
    return translated === key ? s.label : translated
  }

  const activeLabel = activeSuggestion ? resolveLabel(activeSuggestion, 0) : ''

  const handleSuggestionClick = () => {
    if (!activeSuggestion) return
    clearTimers()
    setPhase('idle')
    setOpen(true)
    setTimeout(() => { sendMessage(activeSuggestion.prompt ?? activeLabel) }, 150)
  }

  const showPill = phase === 'expanding' || phase === 'typing' || phase === 'visible'

  return (
    <div className={cn('fixed bottom-4 right-4 z-50 hidden md:block', className)}>
      {/* Pill — grows from FAB circle size outward */}
      {(showPill || phase === 'collapsing') && !isOpen && (
        <button
          onClick={handleSuggestionClick}
          className="absolute right-0 bottom-0 flex flex-col items-start justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-95 cursor-pointer pl-5 py-2 overflow-hidden"
          style={{
            paddingRight: '3.25rem',
            minHeight: '2.75rem',
            animation: showPill
              ? 'fabPillGrow 650ms cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'fabPillShrink 400ms cubic-bezier(0.55, 0, 1, 0.45) forwards',
          }}
        >
          <span className="text-[7px] font-semibold uppercase tracking-widest opacity-40">
            {t('chat.fab.tryIt')}
          </span>
          <span className={cn(
            'text-[13px] font-medium whitespace-nowrap min-h-[1.15em] transition-opacity',
            phase === 'expanding' ? 'opacity-0 duration-200' : 'opacity-100 duration-300',
          )}>
            {phase === 'typing' && activeSuggestion ? (
              <TypewriterText
                text={`"${activeLabel}"`}
                onDone={() => setPhase('visible')}
              />
            ) : (phase === 'visible') && activeSuggestion ? (
              `"${activeLabel}"`
            ) : (
              '\u00A0'
            )}
          </span>
        </button>
      )}

      {/* FAB circle */}
      <button
        onClick={toggleOpen}
        className={cn(
          'relative z-10 h-11 w-11 flex items-center justify-center transition-all hover:opacity-90 focus:outline-none',
          isOpen
            ? 'rounded-tl-none rounded-tr-lg rounded-br-full rounded-bl-full bg-card text-muted-foreground border border-border/50 border-t-0 shadow-lg'
            : 'rounded-full bg-foreground text-background shadow-lg',
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
      </button>
    </div>
  )
}
