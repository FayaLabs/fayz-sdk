import React from 'react'
import { SplitLogin } from './SplitLogin'
import { CenteredLogin } from './CenteredLogin'
import type { AuthProvider } from '../../types'

interface LoginPageProps {
  appName: string
  logo?: React.ReactNode
  layout?: 'split' | 'centered'
  tagline?: string
  description?: string
  showOAuth?: boolean
  oauthProviders?: Exclude<AuthProvider, 'email'>[]
  onSuccess?: () => void
}

export function LoginPage({ layout = 'split', ...props }: LoginPageProps) {
  if (layout === 'centered') {
    return <CenteredLogin {...props} />
  }
  return <SplitLogin {...props} />
}
