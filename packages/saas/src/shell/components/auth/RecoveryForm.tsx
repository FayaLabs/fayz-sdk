import React, { useState } from 'react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from '../../hooks/useTranslation'

interface RecoveryFormProps {
  onSuccess?: () => void
  onBackToLogin?: () => void
  className?: string
}

export function RecoveryForm({
  onSuccess,
  onBackToLogin,
  className,
}: RecoveryFormProps) {
  const { resetPassword, loading } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await resetPassword(email)
      setSubmitted(true)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message ?? t('auth.recovery.failedDefault'))
    }
  }

  if (submitted) {
    return (
      <div className={cn('flex flex-col gap-4 w-full max-w-sm text-center', className)}>
        <div className="rounded-md bg-success/10 border border-success/30 px-4 py-6">
          <h3 className="text-sm font-medium text-success mb-1">
            {t('auth.recovery.checkEmail')}
          </h3>
          <p className="text-sm text-success">
            {t('auth.recovery.resetLinkSent', { email })}
          </p>
        </div>
        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('auth.recovery.backToLogin')}
          </button>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-4 w-full max-w-sm', className)}
    >
      <p className="text-sm text-muted-foreground">
        {t('auth.recovery.description')}
      </p>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="recovery-email" className="text-sm font-medium text-foreground">
          {t('auth.email')}
        </label>
        <input
          id="recovery-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.login.placeholder.email')}
          required
          autoComplete="email"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-primary border border-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 shadow-button-primary active:shadow-button-inset transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? t('auth.recovery.sending') : t('auth.recovery.sendResetLink')}
      </button>

      {onBackToLogin && (
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('auth.recovery.backToLogin')}
        </button>
      )}
    </form>
  )
}
