import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Smartphone, ArrowLeft } from 'lucide-react'
import { COUNTRIES, DEFAULT_COUNTRY, getCountry, maskPhone, unmaskPhone } from '@fayz-ai/core'
import { useAuth } from '@fayz-ai/auth'
import { phoneToEmail } from './phone'

export interface PhoneAuthModalConfig {
  /** Business/brand name shown in the copy. */
  brand?: string
  title?: string
}

type Mode = 'signin' | 'signup'

/**
 * Default phone sign-in / sign-up modal for dogfood Fayz sites. Built on Radix
 * Dialog (backdrop, focus-trap, Esc, scroll-lock, enter/exit animation via
 * tailwindcss-animate) — no reinvented modal chrome. Entrar / Criar conta
 * toggle, phone → WhatsApp code (POC bypass `0000`) → signs the user in via the
 * mounted auth adapter (phone = account). Token-only; render inside <AuthProvider>.
 */
export function PhoneAuthModal({
  open, onClose, config,
}: { open: boolean; onClose: () => void; config?: PhoneAuthModalConfig }) {
  const { signUp } = useAuth()

  const [mode, setMode] = useState<Mode>('signup')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY)
  const country = getCountry(countryIso)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [busy, setBusy] = useState(false)

  // Fresh flow each time it opens.
  useEffect(() => {
    if (open) { setStep('phone'); setCode(''); setCodeError(false); setBusy(false) }
  }, [open])

  function sendCode() {
    if (unmaskPhone(phone).length < 8) return
    setCode(''); setCodeError(false); setStep('code')
  }

  async function confirmCode() {
    if (code.trim() !== '0000') { setCodeError(true); return }
    setBusy(true)
    try {
      await signUp(phoneToEmail(`${country.dial} ${phone}`), unmaskPhone(phone), name.trim() || 'Cliente')
      onClose()
    } catch {
      setCodeError(true)
    } finally {
      setBusy(false)
    }
  }

  const brandLabel = config?.brand ? ` na ${config.brand}` : ''

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-2 motion-reduce:animate-none"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {config?.title ?? 'Acessar sua conta'}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                {mode === 'signup' ? `Crie sua conta${brandLabel} em segundos` : `Bem-vindo de volta${brandLabel}`}
              </Dialog.Description>
            </div>
          </div>

          <Dialog.Close
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>

          {/* Mode toggle (only on the phone step) */}
          {step === 'phone' ? (
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md py-1.5 font-medium transition-colors ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {m === 'signin' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
          ) : null}

          {step === 'phone' ? (
            <form onSubmit={(e) => { e.preventDefault(); sendCode() }} className="mt-4 space-y-3">
              {mode === 'signup' ? (
                <div>
                  <label htmlFor="auth-name" className="mb-1 block text-sm font-medium text-foreground">Nome</label>
                  <input
                    id="auth-name" type="text" autoComplete="name" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Seu nome"
                  />
                </div>
              ) : null}
              <div>
                <label htmlFor="auth-phone" className="mb-1 block text-sm font-medium text-foreground">Celular</label>
                <div className="flex">
                  <select
                    aria-label="País"
                    value={countryIso}
                    onChange={(e) => { const c = getCountry(e.target.value); setCountryIso(c.iso2); setPhone(maskPhone(unmaskPhone(phone), c.mask)) }}
                    className="appearance-none rounded-l-xl border border-r-0 border-border bg-muted py-2.5 pl-3 pr-6 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.flag} {c.dial}</option>)}
                  </select>
                  <input
                    id="auth-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} autoFocus
                    onChange={(e) => setPhone(maskPhone(e.target.value, country.mask))}
                    className="w-full rounded-r-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={`Ex.: ${maskPhone('11987654321', country.mask)}`}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={unmaskPhone(phone).length < 8}
                className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Enviar código via WhatsApp
              </button>
              <p className="text-center text-xs text-muted-foreground">Enviaremos um código para confirmar seu número.</p>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void confirmCode() }} className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Enviamos um código via WhatsApp para <span className="font-medium text-foreground">{country.flag} {country.dial} {phone}</span>.
              </p>
              <input
                type="text" inputMode="numeric" value={code} autoFocus
                onChange={(e) => { setCode(e.target.value); setCodeError(false) }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring placeholder:text-sm placeholder:tracking-normal"
                placeholder="Digite o código"
              />
              {codeError ? <p role="alert" className="text-sm text-destructive">Código inválido. Para testar, use 0000.</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {busy ? 'Entrando…' : mode === 'signup' ? 'Criar conta e entrar' : 'Confirmar e entrar'}
              </button>
              <button type="button" onClick={() => setStep('phone')} className="mx-auto flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Trocar número
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
