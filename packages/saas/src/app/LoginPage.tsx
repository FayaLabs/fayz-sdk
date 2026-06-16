import * as React from 'react'
import { Button, Input } from '@fayz-ai/ui'
import { useAuth } from '@fayz-ai/auth'
import { useTranslation } from '@fayz-ai/core'
import type { AuthProvider } from '@fayz-ai/core'

export interface LoginPageProps {
  appName?: string
  logo?: React.ReactNode
  loginLogo?: React.ReactNode
  layout?: 'split' | 'centered'
  tagline?: string
  description?: string
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
}

type View = 'login' | 'signup' | 'recovery'

function providerLabel(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function LoginPage({
  appName = 'Fayz',
  logo,
  loginLogo,
  layout = 'split',
  tagline,
  description,
  showOAuth = false,
  oauthProviders = ['google'],
}: LoginPageProps) {
  const t = useTranslation()
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key || v.includes('{{') ? fallback : v
  }
  const { signIn, signUp, signInWithOAuth, resetPassword, isLoading, error } = useAuth()
  const [view, setView] = React.useState<View>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [notice, setNotice] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const busy = submitting || isLoading
  const brandLogo = loginLogo ?? logo
  const heading = view === 'login'
    ? tr('auth.login.title', 'Welcome back')
    : view === 'signup'
      ? tr('auth.signup.title', 'Create account')
      : tr('auth.recovery.title', 'Reset password')
  const subtitle = view === 'login'
    ? tr('auth.login.enterCredentials', 'Enter your credentials to continue')
    : view === 'signup'
      ? tr('auth.signup.getStarted', 'Create your account to get started')
      : tr('auth.recovery.resetSubtitle', 'Enter your email and we will send reset instructions')

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch {
      // error is surfaced by useAuth().error
    } finally {
      setSubmitting(false)
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault()
    setNotice(null)
    setSubmitting(true)
    try {
      await signUp(email, password, fullName)
    } catch {
      // error is surfaced by useAuth().error
    } finally {
      setSubmitting(false)
    }
  }

  async function submitRecovery(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await resetPassword(email)
      setNotice(tr('auth.recovery.sent', 'Password reset instructions sent.'))
    } catch {
      // error is surfaced by useAuth().error
    } finally {
      setSubmitting(false)
    }
  }

  async function submitOAuth(provider: AuthProvider) {
    setSubmitting(true)
    try {
      await signInWithOAuth(provider)
    } finally {
      setSubmitting(false)
    }
  }

  const LoginForm = (
    <form onSubmit={view === 'signup' ? submitSignup : view === 'recovery' ? submitRecovery : submitLogin} className="space-y-4">
      {view === 'signup' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="login-name">
            {tr('auth.fullName', 'Full name')}
          </label>
          <Input id="login-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={busy} />
        </div>
      )}
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
          disabled={busy}
        />
      </div>
      {view !== 'recovery' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-foreground" htmlFor="login-password">
              {tr('auth.password', 'Password')}
            </label>
            {view === 'login' && (
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setView('recovery')}>
                {tr('auth.forgotPassword', 'Forgot password?')}
              </button>
            )}
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{String(error.message ?? error)}</p>}
      {notice && <p className="text-sm text-success">{notice}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy
          ? tr('common.loading', 'Loading...')
          : view === 'signup'
            ? tr('auth.signUp', 'Sign up')
            : view === 'recovery'
              ? tr('auth.recovery.submit', 'Send reset link')
              : tr('auth.signIn', 'Sign in')}
      </Button>
      {showOAuth && view === 'login' && oauthProviders.length > 0 && (
        <div className="space-y-2">
          {oauthProviders.map((provider) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => { void submitOAuth(provider) }}
            >
              {tr(`auth.oauth.${provider}`, `Continue with ${providerLabel(provider)}`)}
            </Button>
          ))}
        </div>
      )}
    </form>
  )

  const viewSwitch = view === 'login' ? (
    <p className="text-center text-sm text-muted-foreground">
      {tr('auth.login.noAccount', 'Do not have an account?')}{' '}
      <button type="button" onClick={() => setView('signup')} className="font-medium text-primary hover:underline">
        {tr('auth.signUp', 'Sign up')}
      </button>
    </p>
  ) : (
    <p className="text-center text-sm text-muted-foreground">
      {view === 'signup' ? tr('auth.signup.hasAccount', 'Already have an account?') : tr('auth.recovery.remembered', 'Remembered your password?')}{' '}
      <button type="button" onClick={() => setView('login')} className="font-medium text-primary hover:underline">
        {tr('auth.signIn', 'Sign in')}
      </button>
    </p>
  )

  if (layout === 'centered') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-2xl sm:p-10">
          <div className="mb-8 text-center">
            {brandLogo && <div className="mb-4 flex justify-center">{brandLogo}</div>}
            <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="space-y-6">
            {LoginForm}
            {viewSwitch}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-sidebar">
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-accent/50 via-transparent to-sidebar/80" />
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary/10" />
        <div className="absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-primary/5" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-primary/5" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="space-y-4">
            <p className="text-sm font-medium text-sidebar-muted">{appName}</p>
            <h2 className="text-3xl font-bold text-sidebar-foreground">
              {tagline ?? tr('auth.login.welcomeTo', `Welcome to ${appName}`)}
            </h2>
            {description && <p className="max-w-md text-sm leading-relaxed text-sidebar-muted">{description}</p>}
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-4">
              <div className="flex -space-x-2">
                {['bg-primary', 'bg-success', 'bg-warning'].map((bg, i) => (
                  <div key={i} className={`${bg} h-8 w-8 rounded-full border-2 border-sidebar`} />
                ))}
              </div>
              <p className="text-xs text-sidebar-foreground/80">
                {tr('auth.login.socialProof', `${appName} keeps your operation moving.`)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col lg:p-3 lg:pl-3">
        <div className="flex flex-1 flex-col justify-center bg-background px-6 py-12 lg:rounded-[1.25rem] lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            {brandLogo && <div className="mb-8">{brandLogo}</div>}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="space-y-6">
              {LoginForm}
              {viewSwitch}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
LoginPage.displayName = 'AdminLoginPage'
