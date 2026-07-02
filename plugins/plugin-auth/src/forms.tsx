import * as React from 'react'
import { useAuth } from '@fayz-ai/auth'
import type { AuthProvider } from '@fayz-ai/core'

function providerLabel(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function fieldClass() {
  return 'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
}

function buttonClass(variant: 'primary' | 'outline' | 'ghost' = 'primary') {
  if (variant === 'outline') {
    return 'inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50'
  }
  if (variant === 'ghost') return 'text-sm font-medium text-primary hover:underline'
  return 'inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
}

export interface OAuthButtonsProps {
  providers?: Exclude<AuthProvider, 'email'>[]
  disabled?: boolean
  onProviderClick?: (provider: AuthProvider) => void | Promise<void>
}

export function OAuthButtons({ providers = ['google'], disabled, onProviderClick }: OAuthButtonsProps) {
  const { signInWithOAuth } = useAuth()
  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          className={buttonClass('outline')}
          disabled={disabled}
          onClick={() => {
            void (onProviderClick ? onProviderClick(provider) : signInWithOAuth(provider))
          }}
        >
          Continue with {providerLabel(provider)}
        </button>
      ))}
    </div>
  )
}

export interface LoginFormProps {
  onSuccess?: () => void
  onForgotPassword?: () => void
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
}

export function LoginForm({ onSuccess, onForgotPassword, showOAuth, oauthProviders }: LoginFormProps) {
  const { signIn, error, isLoading } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const disabled = busy || isLoading

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      onSuccess?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Email</span>
        <input className={fieldClass()} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span className="flex items-center justify-between gap-3">
          Password
          {onForgotPassword && (
            <button type="button" className={buttonClass('ghost')} onClick={onForgotPassword}>
              Forgot password?
            </button>
          )}
        </span>
        <input className={fieldClass()} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={disabled} />
      </label>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <button className={buttonClass()} type="submit" disabled={disabled}>
        {disabled ? 'Signing in...' : 'Sign in'}
      </button>
      {showOAuth && <OAuthButtons providers={oauthProviders} disabled={disabled} />}
    </form>
  )
}

export interface SignupFormProps {
  onSuccess?: () => void
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { signUp, error, isLoading } = useAuth()
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [localError, setLocalError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const disabled = busy || isLoading

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLocalError(null)
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await signUp(email, password, fullName)
      onSuccess?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Full name</span>
        <input className={fieldClass()} required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={disabled} />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Email</span>
        <input className={fieldClass()} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Password</span>
        <input className={fieldClass()} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={disabled} />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Confirm password</span>
        <input className={fieldClass()} type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={disabled} />
      </label>
      {(localError || error) && <p className="text-sm text-destructive">{localError ?? error?.message}</p>}
      <button className={buttonClass()} type="submit" disabled={disabled}>
        {disabled ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}

export interface ForgotPasswordFormProps {
  redirectTo?: string
  onSent?: (email: string) => void
  onBackToLogin?: () => void
}

export function ForgotPasswordForm({ redirectTo, onSent, onBackToLogin }: ForgotPasswordFormProps) {
  const { resetPassword, error, isLoading } = useAuth()
  const [email, setEmail] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const disabled = busy || isLoading

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await resetPassword(email, { redirectTo })
      setSent(true)
      onSent?.(email)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Email</span>
        <input className={fieldClass()} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
      </label>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {sent && <p className="text-sm text-emerald-600">Password reset instructions sent.</p>}
      <button className={buttonClass()} type="submit" disabled={disabled}>
        {disabled ? 'Sending...' : 'Send reset link'}
      </button>
      {onBackToLogin && (
        <button type="button" className={buttonClass('ghost')} onClick={onBackToLogin}>
          Back to login
        </button>
      )}
    </form>
  )
}

export interface ResetPasswordFormProps {
  onSuccess?: () => void
}

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const { updatePassword, error, isLoading } = useAuth()
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [localError, setLocalError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const disabled = busy || isLoading

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLocalError(null)
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      onSuccess?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">
        <span>New password</span>
        <input className={fieldClass()} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={disabled} />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Confirm password</span>
        <input className={fieldClass()} type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={disabled} />
      </label>
      {(localError || error) && <p className="text-sm text-destructive">{localError ?? error?.message}</p>}
      <button className={buttonClass()} type="submit" disabled={disabled}>
        {disabled ? 'Saving...' : 'Update password'}
      </button>
    </form>
  )
}
