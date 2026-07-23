import * as React from 'react'
import {
  isDictationSupported,
  startDictation,
  stopSpeaking,
  type DictationSession,
} from '../lib/speech'

export type DictationState = 'idle' | 'listening' | 'transcribing' | 'error'
export type DictationError = 'denied' | 'unsupported' | 'network' | 'no-speech' | 'failed'

interface UseDictationOptions {
  /** BCP-47 tag for recognition. Defaults to the browser's language. */
  locale?: string
  /** POST endpoint that returns `{ text }` — the Whisper seam. */
  transcribeEndpoint?: string
  /** Settled transcript, non-empty. */
  onTranscript: (text: string) => void
  /** Partial words while speaking, so the composer shows it working. */
  onInterim?: (text: string) => void
}

/**
 * Push-to-talk state machine for the composer's mic.
 *
 * One rule shapes it: the user must always see what was heard BEFORE it is
 * sent. Interim words land in the composer while speaking; the settled
 * transcript is handed back for the caller to send.
 */
export function useDictation({
  locale,
  transcribeEndpoint,
  onTranscript,
  onInterim,
}: UseDictationOptions) {
  // Whoever is holding the microphone decides the language, not the app: a
  // pt-BR app used by an English speaker still has to hear English. An
  // explicit `voice.locale` is the deliberate override.
  const resolvedLocale =
    locale ?? (typeof navigator !== 'undefined' ? navigator.language || 'pt-BR' : 'pt-BR')

  const [state, setState] = React.useState<DictationState>('idle')
  const [error, setError] = React.useState<DictationError | null>(null)
  const sessionRef = React.useRef<DictationSession | null>(null)
  const callbacks = React.useRef({ onTranscript, onInterim })
  callbacks.current = { onTranscript, onInterim }

  const supported = React.useMemo(
    () => isDictationSupported(!!transcribeEndpoint),
    [transcribeEndpoint],
  )

  const finish = React.useCallback(() => {
    sessionRef.current = null
    setState('idle')
  }, [])

  const start = React.useCallback(() => {
    if (sessionRef.current || !supported) return
    // The assistant must not listen to its own voice.
    stopSpeaking()
    setError(null)
    setState('listening')
    sessionRef.current = startDictation(
      { locale: resolvedLocale, transcribeEndpoint },
      {
        onInterim: (text) => callbacks.current.onInterim?.(text),
        onFinal: (text) => {
          finish()
          if (text) callbacks.current.onTranscript(text)
        },
        onError: (code) => {
          sessionRef.current = null
          setError(code)
          setState('error')
        },
      },
    )
  }, [finish, resolvedLocale, supported, transcribeEndpoint])

  const stop = React.useCallback(() => {
    if (!sessionRef.current) return
    // A recorded clip still has to travel to the transcriber; native
    // recognition settles locally and returns through onFinal.
    if (transcribeEndpoint) setState('transcribing')
    sessionRef.current.stop()
  }, [transcribeEndpoint])

  const cancel = React.useCallback(() => {
    sessionRef.current?.cancel()
    sessionRef.current = null
    setState('idle')
    setError(null)
  }, [])

  const toggle = React.useCallback(() => {
    if (state === 'listening' || state === 'transcribing') stop()
    else start()
  }, [state, start, stop])

  // Never leave the mic open behind a closed panel.
  React.useEffect(() => () => sessionRef.current?.cancel(), [])

  return { supported, state, error, start, stop, cancel, toggle, clearError: () => setError(null) }
}
