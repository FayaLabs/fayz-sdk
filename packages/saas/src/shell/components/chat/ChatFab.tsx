import * as React from 'react'
import { Mic, Sparkles, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useChatStore } from '../../stores/chat.store'
import { useOrganizationStore } from '../../stores/organization.store'
import { useAITools, type ResolvedSuggestion } from '../../hooks/useAITools'
import { useChat } from '../../hooks/useChat'
import { useTranslation } from '../../hooks/useTranslation'
import { isDictationSupported } from '../../lib/speech'
import type { FayzAgentConnectionConfig } from '../../lib/fayz-agent'
import type { ChatVoiceConfig } from '../../../app/config'

interface ChatFabProps {
  className?: string
  apiEndpoint?: string
  systemPrompt?: string
  agent?: FayzAgentConnectionConfig | false
  voice?: ChatVoiceConfig
  /** Also render on phones. An app with a bottom bar owns that entry point
   *  (and that corner of the screen); an app without one has no other way in,
   *  which quietly made the assistant desktop-only. */
  mobile?: boolean
}

// --- Teaser budget ----------------------------------------------------------
// The pill used to fire on every route change, forever. A hint that always
// appears stops being a hint and becomes noise — so it gets a session budget,
// never repeats a suggestion, and a dismiss silences it for good. The panel's
// own Sparkles button is how suggestions come back, on demand.
const TEASER_MAX_PER_SESSION = 2
const KEY_DISMISSED = 'fayz.agent.teaser.dismissed'
const KEY_SHOWN = 'fayz.agent.teaser.shown'
const KEY_SEEN = 'fayz.agent.teaser.seen'

function session(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}
function teaserDismissed(): boolean {
  return session()?.getItem(KEY_DISMISSED) === '1'
}
function teaserShownCount(): number {
  return Number(session()?.getItem(KEY_SHOWN) ?? '0') || 0
}
function teaserSeen(): string[] {
  try {
    return JSON.parse(session()?.getItem(KEY_SEEN) ?? '[]') as string[]
  } catch {
    return []
  }
}
function recordTeaser(label: string): void {
  const store = session()
  if (!store) return
  store.setItem(KEY_SHOWN, String(teaserShownCount() + 1))
  store.setItem(KEY_SEEN, JSON.stringify([...teaserSeen(), label].slice(-12)))
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

function TypewriterText({ text, speed = 26, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = React.useState('')
  const indexRef = React.useRef(0)

  React.useEffect(() => {
    // Reduced motion: the point is the words, not the typing.
    if (prefersReducedMotion()) {
      setDisplayed(text)
      onDone?.()
      return
    }
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
        <span className="ml-0.5 -mb-px inline-block h-3 w-[2px] bg-current/60 motion-safe:animate-pulse" />
      )}
    </span>
  )
}

/** Injected once — the pill grows out of the FAB circle and shrinks back into it. */
const STYLE_ID = 'chat-fab-anims'
function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes fabPillGrow {
      0%   { max-width: 3rem; opacity: 0.6; }
      40%  { opacity: 1; }
      100% { max-width: 22rem; opacity: 1; }
    }
    @keyframes fabPillShrink {
      0%   { max-width: 22rem; opacity: 1; }
      60%  { opacity: 0.6; }
      100% { max-width: 3rem; opacity: 0; }
    }
    @keyframes fabHalo {
      0%, 100% { transform: scale(1); opacity: 0.45; }
      50%      { transform: scale(1.35); opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

export function ChatFab({ className, apiEndpoint, systemPrompt, agent, voice, mobile }: ChatFabProps) {
  const { isOpen, toggleOpen, setOpen } = useChatStore()
  const isStreaming = useChatStore((s) => s.isStreaming)
  const hasMessages = useChatStore((s) => s.messages.length > 0)
  const requestVoiceStart = useChatStore((s) => s.requestVoiceStart)
  const currentOrg = useOrganizationStore((s) => s.currentOrg)
  const { contextualSuggestions } = useAITools()
  const { sendMessage } = useChat({ apiEndpoint, systemPrompt, agent })
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

  // Budget check runs on every candidate: once the user has talked to the
  // assistant this session, the assistant stops advertising itself.
  const teaserAllowed =
    !hasMessages && !teaserDismissed() && teaserShownCount() < TEASER_MAX_PER_SESSION

  React.useEffect(() => {
    if (isOpen || !topSuggestion || !topLabel || !teaserAllowed || teaserSeen().includes(topLabel)) {
      if (phase !== 'idle') { clearTimers(); setPhase('collapsing'); addTimer(() => setPhase('idle'), 450) }
      prevSuggestionRef.current = null
      return
    }
    if (prevSuggestionRef.current === topLabel) return
    prevSuggestionRef.current = topLabel
    clearTimers()

    const startExpand = () => {
      recordTeaser(topLabel)
      setActiveSuggestion(topSuggestion)
      setPhase('expanding')
      // Start typing while the pill is still growing
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
  }, [topLabel, isOpen, teaserAllowed])

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

  const dismissTeaser = (event: React.MouseEvent) => {
    event.stopPropagation()
    session()?.setItem(KEY_DISMISSED, '1')
    clearTimers()
    setPhase('collapsing')
    addTimer(() => setPhase('idle'), 400)
  }

  const showPill = phase === 'expanding' || phase === 'typing' || phase === 'visible'
  const micAvailable =
    !isOpen && voice?.input !== false && isDictationSupported(!!voice?.transcribeEndpoint)

  return (
    <div
      className={cn(
        'fixed right-4 z-50 md:block md:bottom-4',
        // On a phone the open panel is full-screen and carries its own close
        // button — a floating FAB there only lands on top of the composer.
        mobile && !isOpen
          ? 'block bottom-[calc(1rem+env(safe-area-inset-bottom))]'
          : 'hidden bottom-4',
        className,
      )}
    >
      {/* Suggestion teaser — grows out of the FAB circle */}
      {(showPill || phase === 'collapsing') && !isOpen && (
        <div
          className={cn(
            'absolute bottom-0 right-0 flex items-center overflow-hidden rounded-full shadow-lg',
            // Same fill as the FAB: the pill is the FAB stretching out, not a
            // second black object parked next to a purple one. Reserving
            // exactly the circle's width also closes the dead gap the dismiss
            // button used to float in.
            'bg-primary text-primary-foreground',
          )}
          style={{
            paddingRight: '3rem',
            height: '3rem',
            animation: showPill
              ? 'fabPillGrow 650ms cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'fabPillShrink 400ms cubic-bezier(0.55, 0, 1, 0.45) forwards',
          }}
        >
          <button
            onClick={handleSuggestionClick}
            className="flex min-w-0 flex-1 flex-col items-start justify-center py-1 pl-5 pr-1 text-left transition-opacity hover:opacity-90"
          >
            <span className="text-[7px] font-semibold uppercase tracking-widest opacity-50">
              {t('chat.fab.tryIt')}
            </span>
            <span
              className={cn(
                'min-h-[1.15em] whitespace-nowrap text-[13px] font-medium transition-opacity',
                phase === 'expanding' ? 'opacity-0 duration-200' : 'opacity-100 duration-300',
              )}
            >
              {phase === 'typing' && activeSuggestion ? (
                <TypewriterText text={`"${activeLabel}"`} onDone={() => setPhase('visible')} />
              ) : phase === 'visible' && activeSuggestion ? (
                `"${activeLabel}"`
              ) : (
                ' '
              )}
            </span>
          </button>
          <button
            onClick={dismissTeaser}
            aria-label={t('chat.fab.dismiss')}
            title={t('chat.fab.dismiss')}
            className="mr-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-50 transition-opacity hover:bg-black/10 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Talk shortcut — one tap from anywhere to speaking */}
      {micAvailable && !showPill && phase !== 'collapsing' && (
        <button
          onClick={requestVoiceStart}
          aria-label={t('chat.voice.start')}
          title={t('chat.voice.start')}
          className={cn(
            'absolute -top-11 right-1 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full',
            'border border-border/60 bg-card text-muted-foreground shadow-md transition-all duration-200',
            'hover:scale-105 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Mic className="h-4 w-4" />
        </button>
      )}

      {/* FAB circle */}
      <button
        onClick={toggleOpen}
        className={cn(
          'relative z-10 flex h-12 w-12 items-center justify-center transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isOpen
            ? 'rounded-bl-full rounded-br-full rounded-tl-none rounded-tr-lg border border-t-0 border-border/50 bg-card text-muted-foreground shadow-lg'
            : 'rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 hover:shadow-xl',
        )}
        aria-label={isOpen ? t('chat.fab.close') : t('chat.fab.open')}
        aria-expanded={isOpen}
      >
        {/* Working in the background — the halo is the only thing that says so
            while the panel is shut. */}
        {isStreaming && !isOpen && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary motion-safe:[animation:fabHalo_1.8s_ease-out_infinite]"
          />
        )}
        {isOpen ? <X className="h-4 w-4" /> : <Sparkles className="relative h-5 w-5" />}
      </button>
    </div>
  )
}
