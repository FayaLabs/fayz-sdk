import * as React from 'react'

/** Live mic amplitude for the composer's waveform. Its own analysis-only
 *  `getUserMedia` stream, because neither dictation transport exposes one; a
 *  refused stream just reports `available: false`. Values land in a ref — the
 *  render loop belongs to the waveform, not to React at 60fps. */
export function useMicLevels(active: boolean, bandCount = 28) {
  const levelsRef = React.useRef<Float32Array>(new Float32Array(bandCount))
  const [available, setAvailable] = React.useState(false)

  React.useEffect(() => {
    if (!active) {
      levelsRef.current.fill(0)
      setAvailable(false)
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return

    let cancelled = false
    let stream: MediaStream | null = null
    let context: AudioContext | null = null
    let frame = 0

    const AudioCtor: typeof AudioContext | undefined =
      typeof window === 'undefined'
        ? undefined
        : window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((granted) => {
        if (cancelled) {
          granted.getTracks().forEach((track) => track.stop())
          return
        }
        stream = granted
        context = new AudioCtor()
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6
        context.createMediaStreamSource(granted).connect(analyser)

        const spectrum = new Uint8Array(analyser.frequencyBinCount)
        // Speech lives low in the spectrum; the top bins would sit flat.
        const usableBins = Math.floor(analyser.frequencyBinCount * 0.55)
        const perBand = Math.max(1, Math.floor(usableBins / bandCount))
        setAvailable(true)

        const tick = () => {
          if (cancelled) return
          analyser.getByteFrequencyData(spectrum)
          for (let band = 0; band < bandCount; band++) {
            let sum = 0
            const from = band * perBand
            for (let i = from; i < from + perBand; i++) sum += spectrum[i] ?? 0
            const value = sum / perBand / 255
            const previous = levelsRef.current[band]
            // Rise fast, fall slow — snapping to zero between words reads as a dropout.
            levelsRef.current[band] = value > previous ? value : previous * 0.82 + value * 0.18
          }
          frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      })
      .catch(() => {
        if (!cancelled) setAvailable(false)
      })

    return () => {
      cancelled = true
      if (frame) cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      void context?.close().catch(() => {})
      levelsRef.current.fill(0)
      setAvailable(false)
    }
  }, [active, bandCount])

  return { levelsRef, available }
}
