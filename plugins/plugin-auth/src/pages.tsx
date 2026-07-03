import * as React from 'react'
import { useAuth } from '@fayz-ai/auth'
import type { AuthProvider } from '@fayz-ai/core'
import { ForgotPasswordForm, LoginForm, ResetPasswordForm, SignupForm } from './forms'
import type { AuthFormView, AuthLayout } from './types'

export interface LoginPageProps {
  appName?: string
  logo?: React.ReactNode
  loginLogo?: React.ReactNode
  layout?: AuthLayout
  tagline?: string
  description?: string
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
  resetPasswordUrl?: string
  onSuccess?: () => void
}

export function LoginPage({
  appName = 'App',
  logo,
  loginLogo,
  layout = 'split',
  tagline,
  description,
  showOAuth,
  oauthProviders,
  resetPasswordUrl,
  onSuccess,
}: LoginPageProps) {
  const [view, setView] = React.useState<AuthFormView>('login')
  const brandLogo = loginLogo ?? logo
  const heading = view === 'login' ? 'Welcome back' : view === 'signup' ? 'Create account' : 'Reset password'
  const subtitle =
    view === 'login'
      ? 'Enter your credentials to continue'
      : view === 'signup'
        ? 'Create your account to get started'
        : 'Enter your email and we will send reset instructions'
  const form =
    view === 'login' ? (
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={() => setView('recovery')}
        showOAuth={showOAuth}
        oauthProviders={oauthProviders}
      />
    ) : view === 'signup' ? (
      <SignupForm onSuccess={onSuccess} />
    ) : (
      <ForgotPasswordForm redirectTo={resetPasswordUrl} onBackToLogin={() => setView('login')} />
    )
  const switcher =
    view === 'login' ? (
      <p className="text-center text-sm text-muted-foreground">
        Do not have an account?{' '}
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => setView('signup')}>
          Sign up
        </button>
      </p>
    ) : (
      <p className="text-center text-sm text-muted-foreground">
        {view === 'signup' ? 'Already have an account?' : 'Remembered your password?'}{' '}
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => setView('login')}>
          Sign in
        </button>
      </p>
    )

  if (layout === 'centered') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-2xl sm:p-10">
          <div className="mb-8 text-center">
            {brandLogo && <div className="mb-4 flex justify-center">{brandLogo}</div>}
            <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="space-y-6">
            {form}
            {switcher}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-sidebar">
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-accent/50 via-transparent to-sidebar/80" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="space-y-4">
            <p className="text-sm font-medium text-sidebar-muted">{appName}</p>
            <h2 className="text-3xl font-bold text-sidebar-foreground">{tagline ?? `Welcome to ${appName}`}</h2>
            {description && <p className="max-w-md text-sm leading-relaxed text-sidebar-muted">{description}</p>}
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
              {form}
              {switcher}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export interface AuthGateProps extends LoginPageProps {
  requireAuth?: boolean
  loadingFallback?: React.ReactNode
  children: React.ReactNode
}

export function AuthGate({ requireAuth = true, loadingFallback, children, ...loginProps }: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth()
  if (!requireAuth || isAuthenticated) return <>{children}</>
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </>
    )
  }
  return <LoginPage {...loginProps} />
}

export interface AuthCallbackPageProps {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function AuthCallbackPage({ onSuccess, onError }: AuthCallbackPageProps) {
  const { handleCallback } = useAuth()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    handleCallback(typeof window === 'undefined' ? undefined : window.location.href)
      .then(() => {
        if (!cancelled) onSuccess?.()
      })
      .catch((err: unknown) => {
        const errorObject = err instanceof Error ? err : new Error(String(err))
        if (!cancelled) {
          setError(errorObject.message)
          onError?.(errorObject)
        }
      })
    return () => {
      cancelled = true
    }
  }, [handleCallback, onError, onSuccess])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{error ? 'Authentication failed' : 'Completing sign in...'}</h1>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

export interface ResetPasswordPageProps {
  onSuccess?: () => void
}

export function ResetPasswordPage({ onSuccess }: ResetPasswordPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Update password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>
        <ResetPasswordForm onSuccess={onSuccess} />
      </div>
    </div>
  )
}
