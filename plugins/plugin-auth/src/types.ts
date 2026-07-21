import type React from 'react'
import type { AuthAdapter, AuthProvider } from '@fayz-ai/core'
import type { SupabaseAuthConfig } from '@fayz-ai/auth'

export type AuthProviderKey = 'supabase' | 'mock' | (string & {})
export type AuthLayout = 'split' | 'centered'

/** A product ambassador rendered as a floating circular photo bubble on the
 *  split-login decorative panel. `image` may be a local path or a data URI. */
export interface LoginAmbassador {
  name: string
  role?: string
  image: string
}

export interface AuthRoutesConfig {
  login?: string
  callback?: string
  resetPassword?: string
  afterSignIn?: string
}

export interface AuthOAuthConfig {
  enabled?: boolean
  providers?: Exclude<AuthProvider, 'email'>[]
}

export interface AuthSupabaseConfig {
  url?: string
  anonKey?: string
  client?: SupabaseAuthConfig['supabaseClient']
  callbackUrl?: string
  resetPasswordUrl?: string
}

export interface AuthPluginOptions {
  provider?: AuthProviderKey | AuthAdapter
  adapter?: AuthProviderKey | AuthAdapter
  supabase?: AuthSupabaseConfig
  requireAuth?: boolean
  layout?: AuthLayout
  logo?: React.ReactNode
  tagline?: string
  description?: string
  loginAmbassadors?: LoginAmbassador[]
  loginAmbassadorsLabel?: string
  oauth?: AuthOAuthConfig
  routes?: AuthRoutesConfig
}

export interface ResolvedAuthPlugin {
  kind: 'auth'
  adapter: AuthAdapter
  requireAuth: boolean
  layout: AuthLayout
  logo?: React.ReactNode
  tagline?: string
  description?: string
  loginAmbassadors?: LoginAmbassador[]
  loginAmbassadorsLabel?: string
  oauth: Required<AuthOAuthConfig>
  routes: Required<AuthRoutesConfig>
}

export type AuthFormView = 'login' | 'signup' | 'recovery'
