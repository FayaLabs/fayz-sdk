// ---------------------------------------------------------------------------
// Speech — the assistant's ears and mouth.
//
// Two transports for dictation, one seam:
//   • `transcribeEndpoint` set  → record with MediaRecorder, POST the clip,
//     read back `{ text }`. That is where Whisper (or any STT service) plugs
//     in without touching a single component.
//   • nothing set               → the browser's own SpeechRecognition. Zero
//     infrastructure, streams interim words as the user speaks, and is enough
//     for "agenda a Maria amanhã às 10".
//
// Output is the platform speechSynthesis voice: instant, free, offline, and
// interruptible — the right fit for the short confirmations the assistant
// speaks back ("Agendamento criado"). A neural-TTS endpoint can replace
// `speak()` later behind the same call.
// ---------------------------------------------------------------------------

export interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
  length: number
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Dictation is possible here — native recognition or a recordable mic. */
export function isDictationSupported(hasEndpoint: boolean): boolean {
  if (typeof window === 'undefined') return false
  if (hasEndpoint) {
    return (
      typeof MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia
    )
  }
  return !!recognitionCtor()
}

export interface DictationCallbacks {
  /** Words so far — the composer shows them live so the user sees it working. */
  onInterim?: (text: string) => void
  /** Settled transcript. Empty string means "heard nothing". */
  onFinal: (text: string) => void
  onError: (code: 'denied' | 'unsupported' | 'network' | 'no-speech' | 'failed') => void
}

export interface DictationSession {
  /** Finish and transcribe what was captured. */
  stop: () => void
  /** Throw the capture away — no transcript, no send. */
  cancel: () => void
}

function mapRecognitionError(code: string): 'denied' | 'network' | 'no-speech' | 'failed' {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'denied'
  if (code === 'network') return 'network'
  if (code === 'no-speech') return 'no-speech'
  return 'failed'
}

/** Browser-native dictation with live interim results. */
function startNativeDictation(locale: string, cb: DictationCallbacks): DictationSession {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    cb.onError('unsupported')
    return { stop: () => {}, cancel: () => {} }
  }
  const recognition = new Ctor()
  recognition.lang = locale
  // `continuous` keeps the session open through natural pauses; the user (or
  // the browser's own silence timeout) ends it.
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  let settled = false
  let finalText = ''
  let cancelled = false

  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const text = result[0]?.transcript ?? ''
      if (result.isFinal) finalText += text
      else interim += text
    }
    cb.onInterim?.((finalText + interim).trim())
  }
  recognition.onerror = (event) => {
    if (cancelled || settled) return
    // "no-speech" after real words is just the closing silence, not a failure.
    if (event.error === 'no-speech' && finalText.trim()) return
    settled = true
    cb.onError(mapRecognitionError(event.error))
  }
  recognition.onend = () => {
    if (cancelled || settled) return
    settled = true
    cb.onFinal(finalText.trim())
  }

  try {
    recognition.start()
  } catch {
    settled = true
    cb.onError('failed')
  }

  return {
    stop: () => recognition.stop(),
    cancel: () => {
      cancelled = true
      recognition.abort()
    },
  }
}

/** Record → POST the clip → read `{ text }`. The Whisper seam. */
function startRecordedDictation(
  endpoint: string,
  locale: string,
  cb: DictationCallbacks,
): DictationSession {
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let cancelled = false
  const chunks: BlobPart[] = []

  const release = () => stream?.getTracks().forEach((track) => track.stop())

  void navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((granted) => {
      if (cancelled) {
        granted.getTracks().forEach((track) => track.stop())
        return
      }
      stream = granted
      recorder = new MediaRecorder(granted)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = async () => {
        release()
        if (cancelled) return
        const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
        if (!blob.size) return cb.onFinal('')
        try {
          const form = new FormData()
          form.append('file', blob, 'speech.webm')
          form.append('language', locale.slice(0, 2))
          const response = await fetch(endpoint, { method: 'POST', body: form })
          if (!response.ok) return cb.onError('failed')
          const data = (await response.json()) as { text?: string }
          cb.onFinal((data.text ?? '').trim())
        } catch {
          cb.onError('network')
        }
      }
      recorder.start()
    })
    .catch(() => cb.onError('denied'))

  return {
    stop: () => {
      if (recorder?.state === 'recording') recorder.stop()
      else release()
    },
    cancel: () => {
      cancelled = true
      if (recorder?.state === 'recording') recorder.stop()
      release()
    },
  }
}

export function startDictation(
  options: { locale: string; transcribeEndpoint?: string },
  cb: DictationCallbacks,
): DictationSession {
  return options.transcribeEndpoint
    ? startRecordedDictation(options.transcribeEndpoint, options.locale, cb)
    : startNativeDictation(options.locale, cb)
}

// --- Output -----------------------------------------------------------------

export function isSpeechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * What gets SPOKEN is not what gets rendered. Markdown, ids, tables and long
 * explanations are unbearable out loud, so the voice reads the first couple of
 * sentences of plain prose and stops — the screen still holds the full answer.
 */
export function spokenForm(markdown: string, maxChars = 240): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= maxChars) return plain
  const sentences = plain.match(/[^.!?]+[.!?]?/g) ?? [plain]
  let out = ''
  for (const sentence of sentences) {
    if ((out + sentence).length > maxChars) break
    out += sentence
  }
  return (out || plain.slice(0, maxChars)).trim()
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined
  const lower = locale.toLowerCase()
  const lang = lower.slice(0, 2)
  return (
    voices.find((v) => v.lang.toLowerCase() === lower && v.localService) ??
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    undefined
  )
}

export function stopSpeaking(): void {
  if (isSpeechOutputSupported()) window.speechSynthesis.cancel()
}

/** Speak a reply. Any utterance in flight is cut off — the newest answer wins. */
export function speak(text: string, options: { locale: string; onEnd?: () => void } = { locale: 'pt-BR' }): void {
  if (!isSpeechOutputSupported()) return
  const content = text.trim()
  if (!content) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(content)
  utterance.lang = options.locale
  const voice = pickVoice(options.locale)
  if (voice) utterance.voice = voice
  utterance.rate = 1.05
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = () => options.onEnd?.()
  window.speechSynthesis.speak(utterance)
}
