import { Check, ChevronDown, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { COUNTRIES, maskPhone, unmaskPhone, type CountryDef } from '@fayz-ai/core'
import type { PublicBookingLabels, ResolvedPayment } from '../types'

export interface ContactDraft {
  name: string
  phone: string
  email: string
  notes: string
}

interface ContactStepProps {
  labels: PublicBookingLabels
  contact: ContactDraft
  onContactChange: (contact: ContactDraft) => void
  contactStep: 'phone' | 'code' | 'details'
  country: CountryDef
  onCountryChange: (iso2: string) => void
  code: string
  onCodeChange: (code: string) => void
  codeError: boolean
  onSendCode: () => void
  onConfirmCode: () => void
  onBackToPhone: () => void
  onSubmitDetails: () => void
  payment: ResolvedPayment | null
  submitting: boolean
  error: Error | null
}

/** Contact step — phone verification first (Quaddro-style), then details. */
export function ContactStep({
  labels, contact, onContactChange, contactStep, country, onCountryChange,
  code, onCodeChange, codeError, onSendCode, onConfirmCode, onBackToPhone,
  onSubmitDetails, payment, submitting, error,
}: ContactStepProps) {
  return (
    <div>
      <h3 className="font-heading text-xl font-bold text-foreground">{labels.contactStep}</h3>

      {/* Sub-step: phone */}
      {contactStep === 'phone' ? (
        <form onSubmit={(e) => { e.preventDefault(); onSendCode() }}>
          <p className="mt-1 text-sm text-muted-foreground">{labels.contactIntro}</p>
          <div className="mt-5">
            <label htmlFor="bk-phone" className="mb-1 block text-sm font-medium text-foreground">{labels.phoneLabel}</label>
            <div className="flex">
              <div className="relative">
                <select
                  aria-label="País"
                  value={country.iso2}
                  onChange={(e) => onCountryChange(e.target.value)}
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
                onChange={(e) => onContactChange({ ...contact, phone: maskPhone(e.target.value, country.mask) })}
                className="w-full rounded-r-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={`Ex.: ${maskPhone('11987654321', country.mask)}`}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{labels.phoneHint}</p>
          </div>
          <button
            type="submit"
            disabled={unmaskPhone(contact.phone).length < 8}
            className="mt-5 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {labels.sendCodeCta}
          </button>
        </form>
      ) : null}

      {/* Sub-step: details (after verification) */}
      {contactStep === 'details' ? (
        <form onSubmit={(e) => { e.preventDefault(); onSubmitDetails() }}>
          <p className="mt-1 text-sm text-muted-foreground">{labels.contactIntro}</p>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> {labels.phoneVerified} · {country.flag} {country.dial} {contact.phone}
            </span>
            <button
              type="button"
              onClick={onBackToPhone}
              className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {labels.changePhone}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="bk-name" className="mb-1 block text-sm font-medium text-foreground">{labels.nameLabel}</label>
              <input
                id="bk-name" type="text" autoComplete="name" value={contact.name}
                onChange={(e) => onContactChange({ ...contact, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={labels.namePlaceholder}
              />
            </div>
            <div>
              <label htmlFor="bk-email" className="mb-1 block text-sm font-medium text-foreground">{labels.emailLabel}</label>
              <input
                id="bk-email" type="email" autoComplete="email" inputMode="email" value={contact.email}
                onChange={(e) => onContactChange({ ...contact, email: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={labels.emailPlaceholder}
              />
              <p className="mt-1 text-xs text-muted-foreground">{labels.emailHint}</p>
            </div>
            <div>
              <label htmlFor="bk-notes" className="mb-1 block text-sm font-medium text-foreground">{labels.notesLabel}</label>
              <textarea
                id="bk-notes" rows={3} value={contact.notes}
                onChange={(e) => onContactChange({ ...contact, notes: e.target.value })}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={labels.notesPlaceholder}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">{labels.submitError}</p>
          ) : null}
          <button
            type="submit"
            disabled={!contact.name.trim() || submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {payment ? labels.saveAndContinueCta : labels.confirmCta}
          </button>
          {!payment ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" /> {labels.noChargeNote}
            </p>
          ) : null}
        </form>
      ) : null}

      {/* Code verification modal */}
      {contactStep === 'code' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label={labels.codeTitle}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h4 className="font-heading text-lg font-bold text-foreground">{labels.codeTitle}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{labels.codeBody}</p>
            <form onSubmit={(e) => { e.preventDefault(); onConfirmCode() }}>
              <input
                type="text" inputMode="numeric" value={code} autoFocus
                onChange={(e) => onCodeChange(e.target.value)}
                className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring placeholder:text-sm placeholder:tracking-normal"
                placeholder="Digite o código"
              />
              {codeError ? (
                <p role="alert" className="mt-2 text-sm text-destructive">{labels.codeInvalid}</p>
              ) : null}
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {labels.codeConfirmCta}
              </button>
            </form>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{labels.codeResendHint}</span>
              <button type="button" onClick={onBackToPhone} className="font-medium text-primary hover:underline">
                {labels.back}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
