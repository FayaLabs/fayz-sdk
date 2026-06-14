import * as React from 'react'
import { Button, Input } from '@fayz-ai/ui'
import { useAuth } from '@fayz-ai/auth'
import { useTranslation } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Native admin login — minimal email/password form against the auth adapter.
// With the mock adapter any non-empty credentials sign in. Replaces the
// saas-core LoginPage; the only thing the auth gate needs.
// ---------------------------------------------------------------------------

export function LoginPage({ appName }: { appName?: string }) {
  const t = useTranslation()
  // t() returns the key itself when a translation is missing — fall back then.
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }
  const { signIn, isLoading, error } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch {
      /* error surfaced via useAuth().error */
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || isLoading

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground">{appName ?? 'Fayz'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr('auth.signInToContinue', 'Sign in to continue')}
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="login-email">
              {tr('auth.email', 'Email')}
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="login-password">
              {tr('auth.password', 'Password')}
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{String(error)}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? tr('common.loading', 'Loading…') : tr('auth.signIn', 'Sign in')}
          </Button>
        </form>
      </div>
    </div>
  )
}
LoginPage.displayName = 'AdminLoginPage'
