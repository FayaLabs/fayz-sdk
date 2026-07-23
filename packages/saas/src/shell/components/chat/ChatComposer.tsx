import * as React from 'react'
import { ArrowUp, Loader2, Mic, Sparkles, Square } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { useDictation } from '../../hooks/useDictation'
import { useMicLevels } from '../../hooks/useMicLevels'
import { useChatStore } from '../../stores/chat.store'
import type { ChatVoiceConfig } from '../../../app/config'

interface ChatComposerProps {
  onSend: (text: string) => void
  isStreaming: boolean
  isConfigured: boolean
  blocked: boolean
  voice?: ChatVoiceConfig
  hasSuggestions: boolean
  suggestionsOpen: boolean
  onToggleSuggestions: () => void
}

const MAX_ROWS = 5
const LINE_HEIGHT = 20

/**
 * The composer. Three ways in — type, talk, or pick a suggestion — and one
 * rule: whatever the assistant is about to receive is visible in the field
 * first. Dictation writes interim words straight into the textarea so the user
 * watches it being heard, and only sends once the transcript settles.
 */
export function ChatComposer({
  onSend,
  isStreaming,
  isConfigured,
  blocked,
  voice,
  hasSuggestions,
  suggestionsOpen,
  onToggleSuggestions,
}: ChatComposerProps) {
  const { t } = useTranslation()
  const [input, setInput] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const voiceStartRequested = useChatStore((s) => s.voiceStartRequested)
  const consumeVoiceStart = useChatStore((s) => s.consumeVoiceStart)
  const draft = useChatStore((s) => s.draft)
  const setDraft = useChatStore((s) => s.setDraft)

  // Dictation is speech-to-TEXT: the transcript lands in the field and the
  // user sends it. Auto-send is opt-in, never the default — a mishearing
  // that ships itself is not something you can take back.
  const autoSend = voice?.autoSend === true
  const micEnabled = voice?.input !== false

  const submit = React.useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming || !isConfigured || blocked) return
      setInput('')
      onSend(trimmed)
    },
    [blocked, isConfigured, isStreaming, onSend],
  )

  const dictation = useDictation({
    locale: voice?.locale,
    transcribeEndpoint: voice?.transcribeEndpoint,
    onInterim: (text) => setInput(text),
    onTranscript: (text) => {
      if (autoSend) {
        submit(text)
        return
      }
      setInput(text)
      const el = textareaRef.current
      if (el) {
        el.focus()
        requestAnimationFrame(() => el.setSelectionRange(text.length, text.length))
      }
    },
  })

  const listening = dictation.state === 'listening'
  const transcribing = dictation.state === 'transcribing'
  const micBusy = listening || transcribing
  const showMic = micEnabled && dictation.supported
  const WAVEFORM_BANDS = 28
  const { levelsRef, available: levelsAvailable } = useMicLevels(listening, WAVEFORM_BANDS)

  // "Talk" tapped from outside the panel (the FAB's mic) — start listening as
  // soon as the composer exists, so one tap goes from anywhere to speaking.
  React.useEffect(() => {
    if (!voiceStartRequested) return
    consumeVoiceStart()
    if (showMic) dictation.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceStartRequested, showMic])

  // A suggestion loads its text HERE for the user to confirm, edit or discard —
  // clicking a chip is not the same as pressing send.
  React.useEffect(() => {
    if (!draft) return
    setInput(draft)
    setDraft('')
    const el = textareaRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(draft.length, draft.length)
    }
  }, [draft, setDraft])

  // Auto-grow: a dictated paragraph should not scroll inside a one-line box.
  // Measured from height 0, not `auto`: `auto` let the browser report the
  // height already set, so one tall measurement pinned the box open forever.
  // An empty box is one line — no measurement can say otherwise, and asking the
  // browser for `scrollHeight` here reported the clamp and pinned it open.
  // Measuring is only for content that might wrap.
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    // border-box: the height set here INCLUDES padding, so one line of text
    // needs the padding added or the glyphs get clipped.
    const style = getComputedStyle(el)
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    if (!input) {
      el.style.height = `${LINE_HEIGHT + padding}px`
      return
    }
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT * MAX_ROWS + padding)}px`
  }, [input])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit(input)
    } else if (event.key === 'Escape' && micBusy) {
      event.preventDefault()
      dictation.cancel()
      setInput('')
    }
  }

  const placeholder = blocked
    ? t('chat.confirmAction.blocked')
    : listening
      ? t('chat.voice.listening')
      : transcribing
        ? t('chat.voice.transcribing')
        : t('chat.messagePlaceholder')

  const errorMessage =
    dictation.error === 'denied'
      ? t('chat.voice.denied')
      : dictation.error === 'network'
        ? t('chat.voice.network')
        : dictation.error === 'failed'
          ? t('chat.voice.failed')
          : null

  return (
    <div className="border-t border-border/40 bg-card/80 p-2 backdrop-blur">
      {errorMessage && (
        <div
          role="status"
          className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
        >
          <span className="min-w-0 flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={dictation.clearError}
            className="shrink-0 font-medium underline-offset-2 hover:underline"
          >
            {t('common.done')}
          </button>
        </div>
      )}

      {listening && (
        <p
          role="status"
          className="mb-1 line-clamp-2 px-2.5 text-[12px] leading-snug text-muted-foreground"
        >
          {input.trim() || t('chat.voice.listening')}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit(input)
        }}
        className={cn(
          'flex items-end gap-1 rounded-3xl border bg-background py-1 pl-2 pr-1 transition-all duration-200',
          listening
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border focus-within:border-foreground/25',
        )}
      >
        {hasSuggestions && (
          <button
            type="button"
            onClick={onToggleSuggestions}
            aria-pressed={suggestionsOpen}
            aria-label={suggestionsOpen ? t('chat.suggestions.hide') : t('chat.suggestions.show')}
            title={suggestionsOpen ? t('chat.suggestions.hide') : t('chat.suggestions.show')}
            className={cn(
              'mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              suggestionsOpen
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}

        {/* While the mic is open the field steps aside: an empty text box says
            nothing about whether the assistant can hear you, and the waveform
            says it continuously. What was heard so far sits above the form, so
            nothing is ever sent that the user did not see first. */}
        {listening ? (
          <div className="min-w-0 flex-1 self-center px-1 py-1.5">
            <LiveWaveform levelsRef={levelsRef} bands={WAVEFORM_BANDS} live={levelsAvailable} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={t('chat.messagePlaceholder')}
            className={cn(
              'min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-[13.5px] leading-5 text-foreground',
              'placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed',
            )}
            disabled={isStreaming || !isConfigured || blocked}
          />
        )}

        {showMic && (
          <button
            type="button"
            onClick={dictation.toggle}
            disabled={!isConfigured || blocked || isStreaming || transcribing}
            aria-pressed={listening}
            aria-label={listening ? t('chat.voice.stop') : t('chat.voice.start')}
            title={listening ? t('chat.voice.stop') : t('chat.voice.start')}
            className={cn(
              'mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30',
              listening
                ? 'bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : listening ? (
              <Square className="h-3 w-3 fill-current" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim() || isStreaming || !isConfigured || blocked}
          className={cn(
            'mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:bg-muted disabled:text-muted-foreground/50',
          )}
          aria-label={t('chat.send')}
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}

/**
 * The microphone signal, drawn where the text field was.
 *
 * The rAF loop writes `scaleY` straight onto the bars. Routing 28 values
 * through React state sixty times a second would re-render the whole composer
 * for a decoration — and the decoration is the only part that changes.
 *
 * `live: false` (permission for the analysis stream refused) falls back to a
 * gentle idle animation: still honest — it says "the mic is open" and no
 * longer claims to show what it hears.
 */
function LiveWaveform({
  levelsRef,
  bands,
  live,
}: {
  levelsRef: React.MutableRefObject<Float32Array>
  bands: number
  live: boolean
}) {
  const barsRef = React.useRef<Array<HTMLSpanElement | null>>([])

  React.useEffect(() => {
    if (!live) return
    let frame = 0
    const draw = () => {
      const levels = levelsRef.current
      for (let i = 0; i < bands; i++) {
        const bar = barsRef.current[i]
        if (!bar) continue
        // Floor keeps a visible line at silence, so the row never looks broken.
        bar.style.transform = `scaleY(${0.12 + Math.min(1, (levels[i] ?? 0) * 1.9) * 0.88})`
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [live, bands, levelsRef])

  return (
    <div className="flex h-5 items-center justify-center gap-[2px]" aria-hidden>
      {Array.from({ length: bands }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el
          }}
          className={cn(
            'h-full w-[2px] shrink-0 origin-center rounded-full bg-primary/70',
            live ? 'will-change-transform' : 'motion-safe:animate-pulse',
          )}
          style={
            live
              ? { transform: 'scaleY(0.12)' }
              : { transform: `scaleY(${[0.3, 0.55, 0.8, 0.5, 0.35][i % 5]})`, animationDelay: `${(i % 5) * 110}ms`, animationDuration: '900ms' }
          }
        />
      ))}
    </div>
  )
}
