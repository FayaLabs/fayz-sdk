import React, { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { bannerPlaceholder } from '../../sections'
import { Reveal } from '../../motion'
import { Link } from '../../router'
import { TID } from '../../testids'

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]
  return C ? <C className={className} /> : null
}

export function BenefitsRow({ items }: { items: Array<{ icon: string; title: string; text?: string }> }) {
  return (
    <section data-testid={TID.benefits} className="border-y bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-9 sm:grid-cols-3 sm:px-6">
        {items.slice(0, 4).map((item, i) => (
          <Reveal key={i} delay={i * 120} className="flex items-center justify-center gap-3 text-center sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon name={item.icon} className="h-6 w-6 text-primary" />
            </span>
            <div>
              <p className="font-semibold">{item.title}</p>
              {item.text && <p className="text-sm text-muted-foreground">{item.text}</p>}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function PromoBanner({
  title,
  subtitle,
  eyebrow,
  cta,
  href,
  image,
  hue = 160,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  cta?: string
  href?: string
  image?: string
  hue?: number
}) {
  return (
    <section data-testid={TID.promoBanner} className="group relative my-12 overflow-hidden">
      <img
        src={image ?? bannerPlaceholder(title, hue, hue + 50, 1600, 420)}
        alt={title}
        className="h-80 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/65 via-black/35 to-black/20 p-6 text-center text-white">
        <Reveal>
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">{eyebrow}</p>
          )}
          <h2 className="sf-heading text-3xl font-bold drop-shadow sm:text-5xl">{title}</h2>
          {subtitle && <p className="mt-3 max-w-lg text-white/90">{subtitle}</p>}
          {cta && (
            <Link
              to={href ?? '/catalog'}
              className="sf-cta mt-6 inline-block bg-white px-8 py-3 font-semibold text-gray-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ borderRadius: 'var(--sf-radius-button)' }}
            >
              {cta}
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  )
}

export function ManifestoBlock({ title, text }: { title?: string; text: string }) {
  return (
    <section data-testid={TID.manifesto} className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
      {title && <h2 className="sf-heading mb-5 text-2xl font-bold">{title}</h2>}
      <p className="sf-heading text-xl leading-relaxed text-muted-foreground sm:text-2xl">{text}</p>
    </section>
  )
}

export function Testimonials({ title, items }: { title?: string; items: Array<{ quote: string; author: string }> }) {
  return (
    <section data-testid={TID.testimonials} className="bg-muted/50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {title && (
          <Reveal>
            <h2 className="sf-heading mb-10 text-center text-3xl font-bold">{title}</h2>
          </Reveal>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          {items.slice(0, 3).map((t, i) => (
            <Reveal key={i} delay={i * 130}>
              <figure
                className="h-full bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
                style={{ borderRadius: 'var(--sf-radius-card)' }}
              >
                <div className="mb-3 text-primary" aria-hidden>★★★★★</div>
                <blockquote className="leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-muted-foreground">— {t.author}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function NewsletterBand({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <section data-testid={TID.newsletter} className="bg-primary py-16 text-primary-foreground">
      <Reveal className="mx-auto max-w-xl px-4 text-center sm:px-6">
        <h2 className="sf-heading text-3xl font-bold">{title ?? 'Receba nossas novidades'}</h2>
        {subtitle && <p className="mt-2 opacity-90">{subtitle}</p>}
        {done ? (
          <p data-testid={TID.newsletterDone} className="mt-6 font-medium">Inscrição confirmada! 🎉</p>
        ) : (
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) setDone(true)
            }}
          >
            <input
              data-testid={TID.newsletterEmail}
              type="email"
              required
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border-0 bg-white/95 px-4 py-3 text-sm text-gray-900 outline-none"
              style={{ borderRadius: 'var(--sf-radius-input)' }}
            />
            <button
              type="submit"
              data-testid={TID.newsletterSubmit}
              className="sf-cta bg-foreground px-6 py-3 text-sm font-semibold text-background"
              style={{ borderRadius: 'var(--sf-radius-button)' }}
            >
              Assinar
            </button>
          </form>
        )}
      </Reveal>
    </section>
  )
}
