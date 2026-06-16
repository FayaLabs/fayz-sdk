import React, { useEffect, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { establishCustomerSession } from '../auth'
import { useSessionStore } from '../stores/session.store'
import { Link } from '../router'

interface SignInModalProps {
  /** Prefill the email field (e.g. from a checkout contact field). */
  defaultEmail?: string
  onClose: () => void
  /** Called after a successful sign-in, with the resolved session. */
  onSignedIn?: (session: { email: string | null; name: string | null }) => void
}

/**
 * Customer sign-in as a focused modal dialog. Used from checkout ("Já tem
 * conta? Entrar") so a returning buyer can authenticate without leaving the
 * page. Auth goes through the shared establishCustomerSession path.
 */
export function SignInModal({ defaultEmail = '', onClose, onSignedIn }: SignInModalProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) return
    setBusy(true)
    setError(null)
    try {
      await establishCustomerSession(email, { password })
      const session = useSessionStore.getState()
      onSignedIn?.({ email: session.email, name: session.name })
      onClose()
    } catch {
      setError('Não foi possível entrar. Verifique seu e-mail e senha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Entrar na sua conta"
    >
      <div className="absolute inset-0 animate-fade-in bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm animate-fade-up border bg-card p-6 shadow-2xl"
        style={{ borderRadius: 'var(--sf-radius-card)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="sf-heading text-lg font-semibold leading-tight">Entrar na sua conta</h2>
            <p className="text-xs text-muted-foreground">Use seus dados salvos e acompanhe pedidos.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            autoFocus
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            style={{ borderRadius: 'var(--sf-radius-input)' }}
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            style={{ borderRadius: 'var(--sf-radius-input)' }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="sf-cta w-full bg-primary py-3 font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            style={{ borderRadius: 'var(--sf-radius-button)' }}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link to="/account" onClick={onClose} className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
