import React, { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { RecoveryForm } from './RecoveryForm'
import { useTranslation } from '../../hooks/useTranslation'
import type { AuthProvider } from '../../types'

interface SplitLoginProps {
  appName: string
  logo?: React.ReactNode
  tagline?: string
  description?: string
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
  onSuccess?: () => void
}

type View = 'login' | 'signup' | 'recovery'

export function SplitLogin({ appName, logo, tagline, description, showOAuth, oauthProviders, onSuccess }: SplitLoginProps) {
  const [view, setView] = useState<View>('login')
  const { t } = useTranslation()

  const heading = view === 'login' ? t('auth.login.title') : view === 'signup' ? t('auth.signup.title') : t('auth.recovery.title')
  const subtitle = view === 'login'
    ? t('auth.login.enterCredentials')
    : view === 'signup'
      ? t('auth.signup.getStarted')
      : t('auth.recovery.resetSubtitle')

  return (
    <div className="flex min-h-screen bg-sidebar">
      {/* Left — Brand Panel (hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-accent/50 via-transparent to-sidebar/80" />

        {/* Decorative circles */}
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary/10" />
        <div className="absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-primary/5" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-primary/5" />

        {/* Content */}
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="space-y-4">
            <p className="text-sm font-medium text-sidebar-muted">{appName}</p>
            <h2 className="text-3xl font-bold text-sidebar-foreground">
              {tagline ?? t('auth.login.welcomeTo', { appName })}
            </h2>
            {description && (
              <p className="max-w-md text-sm leading-relaxed text-sidebar-muted">
                {description}
              </p>
            )}

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-4">
              <div className="flex -space-x-2">
                {['bg-primary', 'bg-success', 'bg-warning'].map((bg, i) => (
                  <div key={i} className={`h-8 w-8 rounded-full ${bg} border-2 border-sidebar`} />
                ))}
              </div>
              <p className="text-xs text-sidebar-foreground/80">
                {t('auth.login.socialProof', { appName })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form in rounded frame */}
      <div className="flex flex-1 flex-col p-3 pl-0 lg:pl-3">
        <div className="flex flex-1 flex-col justify-center rounded-[1.25rem] bg-background px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            {logo}
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">{heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Form */}
          {view === 'login' && (
            <div className="space-y-6">
              <LoginForm
                onSuccess={onSuccess}
                onForgotPassword={() => setView('recovery')}
                showOAuth={showOAuth}
                oauthProviders={oauthProviders}
              />
              <p className="text-center text-sm text-muted-foreground">
                {t('auth.login.noAccount')}{' '}
                <button type="button" onClick={() => setView('signup')} className="font-medium text-primary hover:underline">
                  {t('auth.signUp')}
                </button>
              </p>
            </div>
          )}

          {view === 'signup' && (
            <div className="space-y-6">
              <SignupForm onSuccess={onSuccess} />
              <p className="text-center text-sm text-muted-foreground">
                {t('auth.signup.hasAccount')}{' '}
                <button type="button" onClick={() => setView('login')} className="font-medium text-primary hover:underline">
                  {t('auth.signIn')}
                </button>
              </p>
            </div>
          )}

          {view === 'recovery' && (
            <RecoveryForm onBackToLogin={() => setView('login')} />
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
