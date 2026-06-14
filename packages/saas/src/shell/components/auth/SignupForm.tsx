import React, { useState } from 'react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from '../../hooks/useTranslation'

interface SignupFormProps {
  onSuccess?: () => void
  termsUrl?: string
  privacyUrl?: string
  className?: string
}

export function SignupForm({
  onSuccess,
  termsUrl,
  privacyUrl,
  className,
}: SignupFormProps) {
  const { signUp, loading } = useAuth()
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError(t('auth.signup.passwordsMismatch'))
      return
    }

    if (password.length < 8) {
      setError(t('auth.signup.passwordMinLength'))
      return
    }

    try {
      const result = await signUp(email, password, fullName)
      if (result.requiresEmailVerification) {
        setSuccess(t('auth.signup.emailVerification', { email }))
        setPassword('')
        setConfirmPassword('')
        return
      }
      onSuccess?.()
    } catch (err: any) {
      setError(err.message ?? t('auth.signup.failedDefault'))
    }
  }

  const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-4 w-full max-w-sm', className)}
    >
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-name" className="text-sm font-medium text-foreground">
          {t('auth.signup.fullName')}
        </label>
        <input
          id="signup-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('auth.signup.placeholder.name')}
          required
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
          {t('auth.email')}
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.login.placeholder.email')}
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
          {t('auth.password')}
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.signup.placeholder.password')}
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">
          {t('auth.signup.confirmPassword')}
        </label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('auth.signup.placeholder.confirm')}
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {(termsUrl || privacyUrl) && (
        <p className="text-xs text-muted-foreground">
          {t('auth.signup.termsAgreement')}{' '}
          {termsUrl && (
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              {t('auth.signup.termsOfService')}
            </a>
          )}
          {termsUrl && privacyUrl && ' and '}
          {privacyUrl && (
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              {t('auth.signup.privacyPolicy')}
            </a>
          )}
          .
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-primary border border-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? t('auth.signup.creating') : t('auth.signup.title')}
      </button>
    </form>
  )
}
