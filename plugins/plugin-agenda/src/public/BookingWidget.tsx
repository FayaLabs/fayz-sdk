import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Calendar, Clock, Check, ChevronLeft, ChevronRight, ChevronDown, Loader2,
  MapPin, CreditCard, ShieldCheck, User, Video, QrCode, Copy, CalendarCheck, Plus,
} from 'lucide-react'
import { COUNTRIES, DEFAULT_COUNTRY, getCountry, maskPhone, unmaskPhone } from '@fayz-ai/core'
import type { PixCharge } from '@fayz-ai/core'
import { useBooking } from './context'
import { useAvailableSlots, useCreateBooking } from './hooks'
import type { PublicService } from './types'

type Step = 'overview' | 'datetime' | 'contact' | 'payment' | 'success'
type StepState = 'done' | 'active' | 'todo'

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday-first, like the reference

function useFormatters(locale: string, currency: string) {
  return useMemo(
    () => ({
      price: new Intl.NumberFormat(locale, { style: 'currency', currency }),
      time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
      dayNum: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }),
      longDay: new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long' }),
      dateShort: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      month: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    }),
    [locale, currency],
  )
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Read a preselected service id from the URL (?service=…), router-agnostic. */
function readServiceParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('service')
}

interface DayCell {
  iso: string
  date: Date
  isToday: boolean
}

/** 7 consecutive days starting `weekOffset*7` days from today. */
function buildWeek(weekOffset: number): DayCell[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const cells: DayCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + weekOffset * 7 + i)
    cells.push({ iso: toIso(d), date: d, isToday: weekOffset === 0 && i === 0 })
  }
  return cells
}

/** "13/07/2026 – 21:30 até 22:00 (30min)" */
function formatSlotRange(startIso: string, durationMin: number, fmt: ReturnType<typeof useFormatters>): string {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + durationMin * 60_000)
  return `${fmt.dateShort.format(start)} – ${fmt.time.format(start)} até ${fmt.time.format(end)} (${durationMin}min)`
}

// Static, realistic-looking Pix payload for the POC copia-e-cola field.
const PIX_PAYLOAD =
  '00020126840014br.gov.bcb.pix2562qrcode.hempdent.com.br/pix/v2/9d8f7a6b-consulta-canabica5204000053039865802BR5913HEMPDENT6009SAO PAULO62070503***6304AB12'

/** Deterministic QR-looking placeholder rendered from a payload (POC visual). */
function QrPlaceholder({ data }: { data: string }) {
  const size = 25
  // Seed the data-cell pattern from the payload so different charges look different.
  let seed = 0
  for (let i = 0; i < data.length; i++) seed = (seed * 31 + data.charCodeAt(i)) % 100000
  const cells: { x: number; y: number }[] = []
  const isFinder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7
    return inBox(0, 0) || inBox(size - 7, 0) || inBox(0, size - 7)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFinder(x, y)) {
        const ring = x === 0 || y === 0 || x === size - 1 || y === size - 1
        // draw finder squares (outer ring + inner block) deterministically
        const local = (bx: number, by: number) => ({ lx: x - bx, ly: y - by })
        const corner = x < 7 && y < 7 ? { bx: 0, by: 0 } : x >= size - 7 && y < 7 ? { bx: size - 7, by: 0 } : { bx: 0, by: size - 7 }
        const { lx, ly } = local(corner.bx, corner.by)
        const outer = lx === 0 || lx === 6 || ly === 0 || ly === 6
        const inner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
        if (outer || inner) cells.push({ x, y })
        void ring
      } else if ((x * 31 + y * 17 + x * y + seed) % 3 === 0) {
        cells.push({ x, y })
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40" role="img" aria-label="QR Code Pix (demonstração)">
      <rect width={size} height={size} fill="white" />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="currentColor" className="text-foreground" />
      ))}
    </svg>
  )
}

/** Brand header shown above every booking view. */
function BrandHeader() {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
        H
      </span>
      <div>
        <p className="font-heading text-base font-bold text-foreground">HempDent · Consulta Canábica</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Agendamento online seguro · CRO-SP 166513
        </p>
      </div>
    </div>
  )
}

/** A service row (used on the overview and reused elsewhere). */
function ServiceRow({
  service, featured, onSelect, fmt,
}: {
  service: PublicService
  featured?: boolean
  onSelect: () => void
  fmt: ReturnType<typeof useFormatters>
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Video className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{service.name}</span>
          {featured ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Mais procurado
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {service.durationMinutes} min · Online
        </span>
        {service.description ? (
          <span className="mt-1 block text-sm text-muted-foreground">{service.description}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-semibold tabular-nums text-primary">{fmt.price.format(service.price)}</span>
        <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

/** One row in the wizard's right-hand progress rail. */
function StepRail({
  n, label, state, children,
}: { n: number; label: string; state: StepState; children?: ReactNode }) {
  return (
    <li className="relative pl-11">
      <span aria-hidden className="absolute left-[15px] top-8 bottom-[-18px] w-px bg-border last:hidden" />
      <span
        className={[
          'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
          state === 'done'
            ? 'bg-primary text-primary-foreground'
            : state === 'active'
              ? 'bg-accent text-primary ring-2 ring-primary'
              : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        {state === 'done' ? <Check className="h-4 w-4" /> : n}
      </span>
      <p className={`pt-1 text-sm font-semibold ${state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </p>
      {children ? <div className="mt-2">{children}</div> : null}
    </li>
  )
}

/**
 * Customer-facing booking surface. Default view is an overview (services +
 * opening hours + CTA) like Quaddro; picking a service — or landing with
 * ?service=… — enters a stepped flow (date → time → contact → confirmation)
 * with a live progress + summary rail. Token-only, keyboard-accessible, 44px
 * targets. Runs on mock slots today; real availability is a provider swap.
 */
export function BookingWidget() {
  const {
    services, professionalName, businessHours, payment, paymentProvider, onIdentityVerified,
    labels, window: bookingWindow, locale, currency,
  } = useBooking()
  const fmt = useFormatters(locale, currency)

  const preselected = useMemo(() => {
    const q = readServiceParam()
    if (q && services.some((s) => s.id === q)) return q
    return null
  }, [services])
  const todayIso = useMemo(() => toIso(new Date()), [])

  const [step, setStep] = useState<Step>(preselected ? 'datetime' : 'overview')
  const [serviceId, setServiceId] = useState<string | null>(preselected)
  const [weekOffset, setWeekOffset] = useState(0)
  const [date, setDate] = useState<string | null>(todayIso)
  const [slotStart, setSlotStart] = useState<string | null>(null)
  const [contact, setContact] = useState({ name: '', phone: '', email: '', notes: '' })
  // Contact step is phone-verification-first (like Quaddro): phone → code → details.
  const [contactStep, setContactStep] = useState<'phone' | 'code' | 'details'>('phone')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  // Payment sub-flow: choose method → Pix QR ("aguardando pagamento").
  const [paymentStep, setPaymentStep] = useState<'choose' | 'pix'>('choose')
  const [copied, setCopied] = useState(false)
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY)
  const country = getCountry(countryIso)
  // Pix charge from the injected payment provider (null → self-mocked fallback).
  const [charge, setCharge] = useState<PixCharge | null>(null)
  const [charging, setCharging] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll the charge status while on the Pix screen; settle → success.
  useEffect(() => {
    if (!(step === 'payment' && paymentStep === 'pix' && charge && paymentProvider)) return
    let active = true
    const clear = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
    const tick = () => {
      paymentProvider.getChargeStatus(charge.chargeId).then((s) => {
        if (!active) return
        if (s === 'paid') { clear(); setStep('success') }
        else if (s === 'expired' || s === 'failed') clear()
      }).catch(() => { /* keep polling on transient errors */ })
    }
    tick()
    pollRef.current = setInterval(tick, 2500)
    return () => { active = false; clear() }
  }, [step, paymentStep, charge, paymentProvider])

  const week = useMemo(() => buildWeek(weekOffset), [weekOffset])
  const { slots, loading: slotsLoading } = useAvailableSlots({ serviceId, date })
  const { submit, submitting, error } = useCreateBooking()

  const minTime = Date.now() + bookingWindow.minAdvanceHours * 3600_000
  const bookableSlots = slots.filter((s) => new Date(s.start).getTime() >= minTime)
  const service = services.find((s) => s.id === serviceId) ?? null
  const maxWeekOffset = Math.floor(bookingWindow.maxAdvanceDays / 7)
  const openDays = new Set(businessHours.daysOfWeek)

  function startBooking(id?: string) {
    setServiceId(id ?? serviceId ?? services[0]?.id ?? null)
    setDate(todayIso)
    setSlotStart(null)
    setStep('datetime')
  }

  async function handleConfirm() {
    if (!serviceId || !slotStart || !contact.name.trim()) return
    try {
      await submit({ serviceId, startsAt: slotStart, contact })
      setStep('success')
    } catch {
      /* error surfaced inline */
    }
  }

  function emitIdentity() {
    onIdentityVerified?.({
      name: contact.name,
      phone: `${country.dial} ${contact.phone}`,
      email: contact.email || undefined,
    })
  }

  // Contact sub-step submit handlers (also used by Enter via <form onSubmit>).
  function sendCode() {
    if (unmaskPhone(contact.phone).length < 8) return
    setCode(''); setCodeError(false); setContactStep('code')
  }
  function confirmCode() {
    if (code.trim() === '0000') {
      setCodeError(false)
      emitIdentity() // phone verified → host signs the user in
      setContactStep('details')
    } else {
      setCodeError(true)
    }
  }
  function submitDetails() {
    if (!contact.name.trim() || submitting) return
    emitIdentity() // re-fire with the full name to enrich the account
    if (payment) { setPaymentStep('choose'); setStep('payment') } else void handleConfirm()
  }
  async function payWithPix(fee: number, svcId: string, svcName: string) {
    if (charging) return
    setCharging(true)
    try {
      await submit({ serviceId: svcId, startsAt: slotStart!, contact })
      if (paymentProvider) {
        const c = await paymentProvider.createCharge({
          amount: fee, currency, method: 'pix', description: svcName,
          customer: { name: contact.name, email: contact.email || undefined, phone: contact.phone || undefined },
        })
        setCharge(c)
      }
      setPaymentStep('pix')
    } catch {
      /* error surfaced inline */
    } finally {
      setCharging(false)
    }
  }

  // ---- OVERVIEW (default view, no service chosen) ----
  if (step === 'overview') {
    return (
      <div className="mx-auto max-w-4xl">
        <BrandHeader />
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            {/* Serviços */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-heading text-lg font-bold text-foreground">Serviços</h3>
              <div className="space-y-3">
                {services.map((s, i) => (
                  <ServiceRow key={s.id} service={s} featured={i === 0} onSelect={() => startBooking(s.id)} fmt={fmt} />
                ))}
              </div>
            </section>

            {/* Sobre — horário de funcionamento */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-heading text-lg font-bold text-foreground">Sobre</h3>
              <p className="mt-3 mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" /> Horário de funcionamento
              </p>
              <ul className="divide-y divide-border border-l-2 border-primary/20 pl-4">
                {WEEK_ORDER.map((day) => {
                  const open = openDays.has(day)
                  return (
                    <li key={day} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-foreground">{DAY_NAMES[day]}</span>
                      <span className={open ? 'tabular-nums text-foreground' : 'text-muted-foreground'}>
                        {open ? `${businessHours.start} – ${businessHours.end}` : 'Fechado'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* Sidebar CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <button
                type="button"
                onClick={() => startBooking()}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Agendar agora
              </button>
              <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Video className="h-3.5 w-3.5 text-primary" /> Consulta 100% online</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Atende todo o Brasil</p>
                <p className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-primary" /> Aceitamos Pix</p>
                <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-primary" /> {professionalName}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // ---- WIZARD (datetime → contact → success) ----
  const railState = {
    service: 'done' as StepState,
    professional: 'done' as StepState,
    datetime: (slotStart ? 'done' : step === 'datetime' ? 'active' : 'todo') as StepState,
    contact: (step === 'payment' || step === 'success' ? 'done' : step === 'contact' ? 'active' : 'todo') as StepState,
    payment: (step === 'success' ? 'done' : step === 'payment' ? 'active' : 'todo') as StepState,
  }
  const railTitle = step === 'payment' && paymentStep === 'pix' ? 'Aguardando pagamento' : 'Passos para agendar'

  return (
    <div className="mx-auto max-w-4xl">
      <BrandHeader />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* LEFT — step panel */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-1.5 lg:hidden">
            {(['datetime', 'contact'] as const).map((s) => (
              <span key={s} className={`h-1.5 flex-1 rounded-full ${railState[s] !== 'todo' ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {step !== 'success' ? (
            <button
              type="button"
              onClick={() => setStep(step === 'payment' ? 'contact' : step === 'contact' ? 'datetime' : 'overview')}
              className="mb-4 inline-flex items-center gap-1 rounded text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" /> {step === 'datetime' ? 'Serviços' : 'Voltar'}
            </button>
          ) : null}

          {/* STEP: datetime */}
          {step === 'datetime' ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-heading text-xl font-bold text-foreground">{labels.dateStep}</h3>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Fuso: Horário de Brasília
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-foreground">{fmt.month.format(week[0].date)}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={weekOffset === 0}
                    onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Semana anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={weekOffset >= maxWeekOffset}
                    onClick={() => setWeekOffset((w) => Math.min(maxWeekOffset, w + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Próxima semana"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {week.map((d) => {
                  const selected = date === d.iso
                  const closed = !openDays.has(d.date.getDay())
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      disabled={closed}
                      onClick={() => { setDate(d.iso); setSlotStart(null) }}
                      className={[
                        'flex flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        closed
                          ? 'cursor-not-allowed border-transparent text-muted-foreground/40'
                          : selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-foreground hover:border-primary/60 hover:bg-accent/40',
                      ].join(' ')}
                    >
                      <span className="text-[11px] font-medium capitalize opacity-80">
                        {fmt.weekday.format(d.date).replace('.', '')}
                      </span>
                      <span className="text-sm font-bold tabular-nums">{fmt.dayNum.format(d.date)}</span>
                    </button>
                  )
                })}
              </div>

              {date ? (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-foreground">Horários disponíveis</p>
                  {slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                      ))}
                    </div>
                  ) : bookableSlots.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhum horário disponível neste dia. Tente outra data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {bookableSlots.map((s) => {
                        const selected = slotStart === s.start
                        return (
                          <button
                            key={s.start}
                            type="button"
                            onClick={() => setSlotStart(s.start)}
                            className={[
                              'rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-foreground hover:border-primary/60 hover:bg-accent/40',
                            ].join(' ')}
                          >
                            {fmt.time.format(new Date(s.start))}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              <button
                type="button"
                disabled={!slotStart}
                onClick={() => setStep('contact')}
                className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Continuar
              </button>
            </div>
          ) : null}

          {/* STEP: contact — phone verification first, then details */}
          {step === 'contact' ? (
            <div>
              <h3 className="font-heading text-xl font-bold text-foreground">{labels.contactStep}</h3>

              {/* Sub-step: phone */}
              {contactStep === 'phone' ? (
                <form onSubmit={(e) => { e.preventDefault(); sendCode() }}>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Preencha as informações abaixo para que seu agendamento seja identificado.
                  </p>
                  <div className="mt-5">
                    <label htmlFor="bk-phone" className="mb-1 block text-sm font-medium text-foreground">Celular</label>
                    <div className="flex">
                      <div className="relative">
                        <select
                          aria-label="País"
                          value={countryIso}
                          onChange={(e) => {
                            const c = getCountry(e.target.value)
                            setCountryIso(c.iso2)
                            setContact({ ...contact, phone: maskPhone(unmaskPhone(contact.phone), c.mask) })
                          }}
                          className="h-full appearance-none rounded-l-xl border border-r-0 border-border bg-muted py-3 pl-3 pr-8 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.iso2} value={c.iso2}>{c.flag} {c.dial}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <input
                        id="bk-phone" type="tel" autoComplete="tel" inputMode="tel" value={contact.phone}
                        onChange={(e) => setContact({ ...contact, phone: maskPhone(e.target.value, country.mask) })}
                        className="w-full rounded-r-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder={`Ex.: ${maskPhone('11987654321', country.mask)}`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Enviaremos um código para confirmar que o número de telefone é seu. Usaremos este número para associar as suas informações à sua conta.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={unmaskPhone(contact.phone).length < 8}
                    className="mt-5 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Enviar código via WhatsApp
                  </button>
                </form>
              ) : null}

              {/* Sub-step: details (after verification) */}
              {contactStep === 'details' ? (
                <form onSubmit={(e) => { e.preventDefault(); submitDetails() }}>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Preencha as informações abaixo para que seu agendamento seja identificado.
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Celular verificado · {country.flag} {country.dial} {contact.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => setContactStep('phone')}
                      className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Trocar telefone
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label htmlFor="bk-name" className="mb-1 block text-sm font-medium text-foreground">Nome completo *</label>
                      <input
                        id="bk-name" type="text" autoComplete="name" value={contact.name}
                        onChange={(e) => setContact({ ...contact, name: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label htmlFor="bk-email" className="mb-1 block text-sm font-medium text-foreground">E-mail</label>
                      <input
                        id="bk-email" type="email" autoComplete="email" inputMode="email" value={contact.email}
                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="voce@email.com"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Enviaremos uma confirmação e um lembrete antes do agendamento.</p>
                    </div>
                    <div>
                      <label htmlFor="bk-notes" className="mb-1 block text-sm font-medium text-foreground">Observação</label>
                      <textarea
                        id="bk-notes" rows={3} value={contact.notes}
                        onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Use esse espaço para deixar uma observação sobre este agendamento"
                      />
                    </div>
                  </div>
                  {error ? (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      Não foi possível concluir o agendamento. Tente novamente.
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!contact.name.trim() || submitting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {payment ? 'Salvar e continuar' : labels.confirmCta}
                  </button>
                  {!payment ? (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" /> Pagamento via Pix · Sem cobrança agora
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : null}

          {/* Code verification modal */}
          {step === 'contact' && contactStep === 'code' ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Verificação de código">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <h4 className="font-heading text-lg font-bold text-foreground">Insira o código</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enviamos um código via WhatsApp para você confirmar seu número.
                </p>
                <form onSubmit={(e) => { e.preventDefault(); confirmCode() }}>
                  <input
                    type="text" inputMode="numeric" value={code} autoFocus
                    onChange={(e) => { setCode(e.target.value); setCodeError(false) }}
                    className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring placeholder:text-sm placeholder:tracking-normal"
                    placeholder="Digite o código"
                  />
                  {codeError ? (
                    <p role="alert" className="mt-2 text-sm text-destructive">Código inválido. Para testar, use 0000.</p>
                  ) : null}
                  <button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Confirmar
                  </button>
                </form>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Reenviar código via WhatsApp em 28 segundos.</span>
                  <button type="button" onClick={() => setContactStep('phone')} className="font-medium text-primary hover:underline">
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP: payment */}
          {step === 'payment' && service ? (() => {
            const feePct = payment?.reservationFeePercent ?? 100
            const fee = Math.round(service.price * feePct) / 100
            const remaining = Math.round((service.price - fee) * 100) / 100
            return (
              <div>
                {paymentStep === 'choose' ? (
                  <div>
                    {/* Order summary */}
                    <div className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>{service.name}</span>
                        <span className="tabular-nums">{fmt.price.format(service.price)}</span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-foreground">
                          <span className="flex items-center gap-2">
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>
                            Taxa de reserva <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{feePct}%</span>
                          </span>
                          <span className="tabular-nums">{fmt.price.format(fee)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded border border-border" /> Valor restante
                          </span>
                          <span className="tabular-nums">{remaining <= 0 ? 'Grátis' : fmt.price.format(remaining)}</span>
                        </div>
                        <button type="button" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                          <Plus className="h-3.5 w-3.5" /> Adicionar cupom
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3 font-semibold text-foreground">
                        <span>Valor total</span>
                        <span className="tabular-nums">{fmt.price.format(service.price)}</span>
                      </div>
                    </div>

                    {/* Method */}
                    <div className="mt-6 flex items-center justify-between">
                      <h3 className="font-heading text-lg font-bold text-foreground">Escolha como pagar</h3>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro</span>
                    </div>
                    <div className="mt-3 rounded-2xl border-2 border-primary bg-accent/20 p-4">
                      <p className="flex items-center gap-2 font-semibold text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>
                        Pix
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                          { icon: Check, t: 'Finalize o agendamento clicando em "Pagar com Pix".' },
                          { icon: QrCode, t: 'Mostraremos um QR Code e o Pix copia-e-cola.' },
                          { icon: CalendarCheck, t: 'Após o pagamento, seu agendamento é reservado.' },
                        ].map((s, i) => (
                          <div key={i} className="text-sm text-muted-foreground">
                            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary"><s.icon className="h-4 w-4" /></span>
                            <span className="font-semibold text-foreground">{i + 1}.</span> {s.t}
                          </div>
                        ))}
                      </div>
                    </div>

                    {error ? <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível iniciar o pagamento. Tente novamente.</p> : null}
                    <button
                      type="button"
                      disabled={submitting || charging}
                      onClick={() => void payWithPix(fee, service.id, service.name)}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {submitting || charging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Pagar {fmt.price.format(fee)} com Pix
                    </button>
                  </div>
                ) : (
                  /* Pix QR — aguardando pagamento */
                  <div>
                    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-950/30">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Realize o pagamento para finalizar
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Este código Pix é válido por somente 5 minutos. Não feche esta página até receber a confirmação do pagamento.
                      </p>
                    </div>
                    <h3 className="mt-6 font-heading text-lg font-bold text-foreground">Escaneie ou copie este código para pagar</h3>
                    <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>1. Acesse o app do seu banco, pagamentos ou Internet Banking.</li>
                      <li>2. Escolha pagar via Pix.</li>
                      <li>3. Escaneie o QR Code ou use o Pix copia-e-cola:</li>
                    </ol>
                    <div className="mt-4 w-fit rounded-xl border border-border bg-white p-3">
                      <QrPlaceholder data={charge?.pixQrCode ?? PIX_PAYLOAD} />
                    </div>
                    <div className="mt-4 flex max-w-md items-center gap-2">
                      <code className="flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">{charge?.pixCopyPaste ?? PIX_PAYLOAD}</code>
                      <button
                        type="button"
                        onClick={() => {
                          const payload = charge?.pixCopyPaste ?? PIX_PAYLOAD
                          try { void navigator.clipboard?.writeText(payload); setCopied(true) } catch { setCopied(true) }
                        }}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    {/* POC shortcut — the mock provider also auto-confirms via polling after a few seconds. */}
                    <button
                      type="button"
                      onClick={() => setStep('success')}
                      className="mt-6 w-full rounded-xl border border-primary py-3 font-semibold text-primary transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Já paguei — confirmar (simulação)
                    </button>
                  </div>
                )}
              </div>
            )
          })() : null}

          {/* STEP: success */}
          {step === 'success' ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground">{labels.successTitle}</h3>
              <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{labels.successBody}</p>
              {service && slotStart ? (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-muted/50 p-4 text-left">
                  <p className="font-semibold text-foreground">{service.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" /> {formatSlotRange(slotStart, service.durationMinutes, fmt)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-4 w-4 text-primary" /> {professionalName}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* RIGHT — progress + summary rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-5 font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {railTitle}
            </p>
            <ol className="space-y-6">
              <StepRail n={1} label="Serviço" state={railState.service}>
                {service ? (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="truncate text-sm font-semibold text-foreground">{service.name}</p>
                    <p className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Online · {service.durationMinutes} min</span>
                      <span className="font-semibold tabular-nums text-primary">{fmt.price.format(service.price)}</span>
                    </p>
                  </div>
                ) : null}
              </StepRail>

              <StepRail n={2} label="Profissional" state={railState.professional}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {professionalName.charAt(0)}
                  </span>
                  <span className="text-sm text-foreground">{professionalName}</span>
                </div>
              </StepRail>

              <StepRail n={3} label="Data e horário" state={railState.datetime}>
                {slotStart && service ? (
                  <p className="text-sm tabular-nums text-foreground">
                    {formatSlotRange(slotStart, service.durationMinutes, fmt)}
                  </p>
                ) : null}
              </StepRail>

              <StepRail n={4} label="Informações pessoais" state={railState.contact}>
                {(contact.name || contact.phone) && (step === 'payment' || step === 'success' || contactStep === 'details') ? (
                  <p className="text-sm text-foreground">
                    {contact.name || 'Contato'}{contact.phone ? ` · ${country.dial} ${contact.phone}` : ''}
                  </p>
                ) : null}
              </StepRail>

              {payment ? (
                <StepRail n={5} label="Pagamento" state={railState.payment}>
                  {step === 'payment' || step === 'success' ? (
                    <p className="flex items-center gap-1.5 text-sm text-foreground"><CreditCard className="h-3.5 w-3.5 text-primary" /> Pix à vista</p>
                  ) : null}
                </StepRail>
              ) : null}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
