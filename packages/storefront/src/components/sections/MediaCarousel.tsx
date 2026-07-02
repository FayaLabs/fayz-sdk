import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '../../router'
import { TID } from '../../testids'
import { prefersReducedMotion } from '../../motion'
import type { MediaCarouselItem } from '../../sections'
import { useStorefrontConfig } from '../../config'

export interface MediaCarouselProps {
  items: MediaCarouselItem[]
  height?: 'medium' | 'tall' | 'screen'
  autoplayMs?: number
  overlay?: 'dark' | 'soft' | 'none'
  className?: string
}

const heightClass = {
  medium: 'h-[58vh] min-h-[420px]',
  tall: 'h-[74vh] min-h-[520px]',
  screen: 'min-h-[calc(100vh-64px)]',
}

const alignClass = {
  start: 'items-start text-left',
  center: 'items-center text-center',
  end: 'items-end text-right',
}

export function MediaCarousel({
  items,
  height = 'tall',
  autoplayMs = 7000,
  overlay = 'dark',
  className = '',
}: MediaCarouselProps) {
  const [index, setIndex] = useState(0)
  const [loadedItems, setLoadedItems] = useState<Record<number, boolean>>({})
  const config = useStorefrontConfig()
  const interacted = useRef(false)
  const revealImages = config.imageLoading.mode !== 'none'
  const revealStyle = (loaded: boolean): React.CSSProperties | undefined =>
    revealImages
      ? {
          filter: config.imageLoading.blur && !loaded ? 'blur(10px)' : 'blur(0px)',
          transition: `opacity 700ms ease, filter ${config.imageLoading.durationMs}ms ${config.imageLoading.easing}`,
        }
      : undefined

  useEffect(() => {
    if (items.length < 2 || autoplayMs <= 0 || prefersReducedMotion()) return
    const timer = setInterval(() => {
      if (!interacted.current) setIndex((i) => (i + 1) % items.length)
    }, autoplayMs)
    return () => clearInterval(timer)
  }, [autoplayMs, items.length])

  if (items.length === 0) return null

  const active = items[Math.min(index, items.length - 1)]!
  const goTo = (next: number) => {
    interacted.current = true
    setIndex((next + items.length) % items.length)
  }
  const overlayClass =
    overlay === 'dark'
      ? 'bg-gradient-to-r from-black/70 via-black/25 to-black/25'
      : overlay === 'soft'
        ? 'bg-gradient-to-t from-black/45 via-black/10 to-transparent'
        : ''

  return (
    <section data-testid={TID.mediaCarousel} className={`relative isolate overflow-hidden ${heightClass[height]} ${className}`}>
      {items.map((item, i) => (
        <img
          key={`${item.title}-${i}`}
          src={item.image}
          alt={item.imageAlt ?? item.title}
          aria-hidden={i !== index}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoadedItems((current) => ({ ...current, [i]: true }))}
          style={revealStyle(Boolean(loadedItems[i]))}
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${
            i === index && (!revealImages || loadedItems[i]) ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className={`absolute inset-0 -z-10 ${overlayClass}`} />
      <div className={`flex h-full px-5 py-16 sm:px-10 lg:px-16 ${alignClass[active.align ?? 'start']}`}>
        <div className="my-auto max-w-2xl text-white drop-shadow-md">
          {active.eyebrow && (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">{active.eyebrow}</p>
          )}
          <h1 className="sf-heading text-5xl font-normal leading-[0.95] sm:text-7xl lg:text-8xl">{active.title}</h1>
          {active.subtitle && <p className="mt-5 max-w-xl text-base leading-8 text-white/88 sm:text-lg">{active.subtitle}</p>}
          {active.cta && (
            <Link
              to={active.href ?? '/catalog'}
              className="mt-8 inline-flex border border-white/75 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
            >
              {active.cta}
            </Link>
          )}
        </div>
      </div>
      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            data-testid={TID.mediaCarouselPrev}
            onClick={() => goTo(index - 1)}
            className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/60 bg-black/20 text-white backdrop-blur transition hover:bg-white hover:text-black"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            data-testid={TID.mediaCarouselNext}
            onClick={() => goTo(index + 1)}
            className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/60 bg-black/20 text-white backdrop-blur transition hover:bg-white hover:text-black"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {items.map((item, i) => (
              <button
                key={`${item.title}-dot-${i}`}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-white' : 'w-2 bg-white/55 hover:bg-white'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
