import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { DEFAULT_COUNTRY, getCountry, maskPhone, unmaskPhone } from '@fayz-ai/core'
import type { PixCharge } from '@fayz-ai/core'
import { useBooking } from './context'
import { useAvailableSlots, useCreateBooking } from './hooks'
import { buildWeek, toIso, readServiceParam, useFormatters } from './format'
import type { StepState } from './types'
import { OverviewStep } from './steps/OverviewStep'
import { DateTimeStep } from './steps/DateTimeStep'
import { ContactStep, type ContactDraft } from './steps/ContactStep'
import { PaymentStep, PIX_PAYLOAD } from './steps/PaymentStep'
import { SummaryRail, type RailState } from './components/SummaryRail'

type Step = 'overview' | 'datetime' | 'contact' | 'payment' | 'success'

/**
 * Customer-facing booking surface. Default view is an overview (services +
 * opening hours + CTA) like Quaddro; picking a service — or landing with
 * ?service=… — enters a stepped flow (date → time → contact → [payment])
 * with a live progress + summary rail. Token-only, keyboard-accessible, 44px
 * targets. Brand-visible parts render via the host-overridable
 * `components`/`brand` seams; data flows through PublicBookingDataProvider
 * (mock seed or Supabase RPCs — same calls).
 */
export function BookingWidget() {
  const {
    services, servicesLoading, professionalName, businessHours, payment, paymentProvider,
    onIdentityVerified, labels, brand, components: C, window: bookingWindow, locale, currency,
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
  const [contact, setContact] = useState<ContactDraft>({ name: '', phone: '', email: '', notes: '' })
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

  // ?service=… deep link: enter the flow once the (possibly async) catalog resolves.
  useEffect(() => {
    if (preselected && step === 'overview') {
      setServiceId(preselected)
      setStep('datetime')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected])

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

  /** Contact with the full international phone, as real backends expect. */
  function contactForSubmit(): ContactDraft {
    return { ...contact, phone: `${country.dial} ${contact.phone}` }
  }

  function startBooking(id?: string) {
    setServiceId(id ?? serviceId ?? services[0]?.id ?? null)
    setDate(todayIso)
    setSlotStart(null)
    setStep('datetime')
  }

  async function handleConfirm() {
    if (!serviceId || !slotStart || !contact.name.trim()) return
    try {
      await submit({ serviceId, startsAt: slotStart, contact: contactForSubmit() })
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
  async function payWithPix(fee: number) {
    if (charging || !service || !slotStart) return
    setCharging(true)
    try {
      await submit({ serviceId: service.id, startsAt: slotStart, contact: contactForSubmit() })
      if (paymentProvider) {
        const c = await paymentProvider.createCharge({
          amount: fee, currency, method: 'pix', description: service.name,
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
  function copyPixPayload() {
    const payload = charge?.pixCopyPaste ?? PIX_PAYLOAD
    try { void navigator.clipboard?.writeText(payload); setCopied(true) } catch { setCopied(true) }
  }

  // ---- OVERVIEW (default view, no service chosen) ----
  if (step === 'overview') {
    return (
      <div className="mx-auto max-w-4xl">
        <C.BrandHeader brand={brand} />
        <OverviewStep
          services={services}
          servicesLoading={servicesLoading}
          businessHours={businessHours}
          professionalName={professionalName}
          labels={labels}
          brand={brand}
          fmt={fmt}
          components={C}
          onStartBooking={startBooking}
        />
      </div>
    )
  }

  // ---- WIZARD (datetime → contact → [payment] → success) ----
  const railState: RailState = {
    service: 'done',
    professional: 'done',
    datetime: (slotStart ? 'done' : step === 'datetime' ? 'active' : 'todo') as StepState,
    contact: (step === 'payment' || step === 'success' ? 'done' : step === 'contact' ? 'active' : 'todo') as StepState,
    payment: (step === 'success' ? 'done' : step === 'payment' ? 'active' : 'todo') as StepState,
  }
  const railTitle = step === 'payment' && paymentStep === 'pix' ? labels.railWaitingPayment : labels.railTitle
  const contactSummary =
    (contact.name || contact.phone) && (step === 'payment' || step === 'success' || contactStep === 'details')
      ? `${contact.name || 'Contato'}${contact.phone ? ` · ${country.dial} ${contact.phone}` : ''}`
      : null

  return (
    <div className="mx-auto max-w-4xl">
      <C.BrandHeader brand={brand} />
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
              <ChevronLeft className="h-4 w-4" /> {step === 'datetime' ? labels.backToServices : labels.back}
            </button>
          ) : null}

          {step === 'datetime' ? (
            <DateTimeStep
              labels={labels}
              fmt={fmt}
              week={week}
              weekOffset={weekOffset}
              maxWeekOffset={maxWeekOffset}
              onWeekOffset={setWeekOffset}
              businessHours={businessHours}
              date={date}
              onSelectDate={(iso) => { setDate(iso); setSlotStart(null) }}
              slots={bookableSlots}
              slotsLoading={slotsLoading}
              slotStart={slotStart}
              onSelectSlot={setSlotStart}
              onContinue={() => setStep('contact')}
            />
          ) : null}

          {step === 'contact' ? (
            <ContactStep
              labels={labels}
              contact={contact}
              onContactChange={setContact}
              contactStep={contactStep}
              country={country}
              onCountryChange={(iso2) => {
                const c = getCountry(iso2)
                setCountryIso(c.iso2)
                setContact((prev) => ({ ...prev, phone: maskPhone(unmaskPhone(prev.phone), c.mask) }))
              }}
              code={code}
              onCodeChange={(v) => { setCode(v); setCodeError(false) }}
              codeError={codeError}
              onSendCode={sendCode}
              onConfirmCode={confirmCode}
              onBackToPhone={() => setContactStep('phone')}
              onSubmitDetails={submitDetails}
              payment={payment}
              submitting={submitting}
              error={error}
            />
          ) : null}

          {step === 'payment' && service && payment ? (
            <PaymentStep
              service={service}
              payment={payment}
              paymentStep={paymentStep}
              charge={charge}
              busy={submitting || charging}
              error={error}
              copied={copied}
              fmt={fmt}
              onPayWithPix={(fee) => void payWithPix(fee)}
              onCopy={copyPixPayload}
              onSimulatePaid={() => setStep('success')}
            />
          ) : null}

          {step === 'success' ? (
            <C.SuccessPanel
              service={service}
              slotStart={slotStart}
              professionalName={professionalName}
              labels={labels}
              fmt={fmt}
            />
          ) : null}
        </div>

        {/* RIGHT — progress + summary rail */}
        <aside className="hidden lg:block">
          <SummaryRail
            title={railTitle}
            railState={railState}
            service={service}
            professionalName={professionalName}
            slotStart={slotStart}
            contactSummary={contactSummary}
            payment={payment}
            paymentReached={step === 'payment' || step === 'success'}
            labels={labels}
            fmt={fmt}
            components={C}
            serviceMeta={brand.serviceMeta}
          />
        </aside>
      </div>
    </div>
  )
}
