import React, { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Core motion primitives — every storefront inherits these; stores never
// implement animation ad hoc. All effects respect prefers-reduced-motion.
// ---------------------------------------------------------------------------

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** True once the element has entered the viewport (one-shot). */
export function useInView<T extends HTMLElement>(margin = '0px 0px -8% 0px'): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: margin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, margin])

  return [ref, inView]
}

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stagger delay in ms */
  delay?: number
  children: React.ReactNode
}

/** Plays a fade-up entrance when the element scrolls into view.
 *  Content is VISIBLE by default — never pre-hidden — so screenshots,
 *  crawlers and environments without IntersectionObserver always see it;
 *  the animation's own from-state handles the fade. */
export function Reveal({ delay = 0, children, className, style, ...rest }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`${inView ? 'animate-fade-up' : ''} ${className ?? ''}`}
      style={{ ...style, animationDelay: delay ? `${delay}ms` : undefined }}
      {...rest}
    >
      {children}
    </div>
  )
}

/** True after the window has scrolled past the threshold (header treatments). */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

/** Re-triggers a CSS animation class whenever `value` changes (cart badge pop). */
export function usePopOnChange(value: number): boolean {
  const [pop, setPop] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && value > 0) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 400)
      return () => clearTimeout(t)
    }
    prev.current = value
    return undefined
  }, [value])
  useEffect(() => {
    prev.current = value
  })
  return pop
}
