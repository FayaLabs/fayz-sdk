import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroSlide } from '../../sections'
import type { HeroVariant } from '../../theme'
import { bannerPlaceholder } from '../../sections'
import { prefersReducedMotion } from '../../motion'
import { Link } from '../../router'
import { TID } from '../../testids'

function slideImage(slide: HeroSlide, w = 1600, h = 700): string {
  return slide.image ?? bannerPlaceholder(slide.title, slide.hue ?? 200, (slide.hue ?? 200) + 40, w, h)
}

function SlideCopy({ slide, active }: { slide: HeroSlide; active: boolean }) {
  const stagger = (i: number) =>
    active ? { className: 'animate-fade-up', style: { animationDelay: `${i * 120}ms` } } : { className: 'opacity-0' }

  const inner = (
    <>
      <h2 className={`sf-heading text-3xl font-bold leading-tight tracking-tight sm:text-5xl ${stagger(0).className}`} style={stagger(0).style}>
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p className={`mt-3 max-w-md text-base sm:text-lg ${stagger(1).className}`} style={stagger(1).style}>
          {slide.subtitle}
        </p>
      )}
      {slide.cta && (
        <div className={stagger(2).className} style={stagger(2).style}>
          <Link
            to={slide.href ?? '/catalog'}
            className="sf-cta mt-6 inline-block bg-primary px-8 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{ borderRadius: 'var(--sf-radius-button)' }}
          >
            {slide.cta}
          </Link>
        </div>
      )}
    </>
  )
  if (slide.boxed) {
    return (
      <div className="border border-foreground/30 bg-background/90 p-8 backdrop-blur-sm sm:p-10">{inner}</div>
    )
  }
  return <div className="text-white">{inner}</div>
}

export function HeroSection({
  variant,
  slides,
  height = 'tall',
}: {
  variant: HeroVariant
  slides: HeroSlide[]
  height?: 'tall' | 'medium'
}) {
  const [index, setIndex] = useState(0)
  const interacted = useRef(false)
  const hClass = height === 'tall' ? 'h-[72vh] min-h-[440px]' : 'h-[48vh] min-h-[340px]'

  // Auto-advance until the visitor takes over; never under reduced motion.
  useEffect(() => {
    if (variant !== 'slider' || slides.length < 2 || prefersReducedMotion()) return
    const timer = setInterval(() => {
      if (!interacted.current) setIndex((i) => (i + 1) % slides.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [variant, slides.length])

  const goTo = (i: number) => {
    interacted.current = true
    setIndex((i + slides.length) % slides.length)
  }

  if (slides.length === 0) return null

  if (variant === 'split') {
    return (
      <section data-testid={TID.hero} className="grid gap-px sm:grid-cols-2">
        {slides.slice(0, 2).map((slide, i) => (
          <Link
            key={i}
            to={slide.href ?? '/catalog'}
            className="group relative block h-[42vh] min-h-[320px] overflow-hidden"
          >
            <img
              src={slideImage(slide, 900, 700)}
              alt={slide.title}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/65 via-black/25 to-black/10 p-6 text-center text-white">
              <h2
                className="sf-heading animate-fade-up text-3xl font-bold uppercase tracking-wide drop-shadow-md sm:text-4xl"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className="animate-fade-up mt-2 max-w-sm drop-shadow" style={{ animationDelay: `${i * 150 + 120}ms` }}>
                  {slide.subtitle}
                </p>
              )}
              <span className="mt-4 inline-block border-b-2 border-white/0 pb-0.5 text-sm font-semibold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:border-white group-hover:opacity-100">
                Explorar →
              </span>
            </div>
          </Link>
        ))}
      </section>
    )
  }

  const active = slides[Math.min(index, slides.length - 1)]!

  return (
    <section data-testid={TID.hero} className={`relative w-full overflow-hidden ${hClass}`}>
      {/* stacked slides, crossfade + Ken Burns on the active one */}
      {slides.map((slide, i) => (
        <img
          key={i}
          src={slideImage(slide)}
          alt={slide.title}
          aria-hidden={i !== index}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === index ? 'animate-kenburns opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div
        className={`absolute inset-0 flex items-end p-6 sm:p-12 ${
          active.boxed ? '' : 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'
        }`}
      >
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-xl">
            <SlideCopy key={index} slide={active} active />
          </div>
        </div>
      </div>

      {variant === 'slider' && slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide anterior"
            data-testid={TID.heroPrev}
            onClick={() => goTo(index - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2.5 shadow transition-transform hover:scale-110 hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5 text-gray-900" />
          </button>
          <button
            type="button"
            aria-label="Próximo slide"
            data-testid={TID.heroNext}
            onClick={() => goTo(index + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2.5 shadow transition-transform hover:scale-110 hover:bg-white"
          >
            <ChevronRight className="h-5 w-5 text-gray-900" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
