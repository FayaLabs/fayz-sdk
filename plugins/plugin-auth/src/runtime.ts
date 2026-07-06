import type { AuthAdapter } from '@fayz-ai/core'
import { createMockAuthAdapter, createSupabaseAuthAdapter } from '@fayz-ai/auth'
import type { AuthPluginOptions, ResolvedAuthPlugin } from './types'

function absoluteUrl(path: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (/^https?:\/\//.test(path)) return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function resolveAuthAdapter(options: AuthPluginOptions = {}): AuthAdapter {
  const configured = options.adapter ?? options.provider
  if (configured && typeof configured === 'object') return configured

  const provider = configured ?? (options.supabase?.url ? 'supabase' : 'mock')
  if (provider === 'supabase') {
    const url = options.supabase?.url
    const anonKey = options.supabase?.anonKey
    if (!url || !anonKey) {
      throw new Error('plugin-auth provider="supabase" requires supabase.url and supabase.anonKey.')
    }
    return createSupabaseAuthAdapter({
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
      supabaseClient: options.supabase?.client,
      callbackUrl: options.supabase?.callbackUrl ?? absoluteUrl(options.routes?.callback ?? '/auth/callback'),
      resetPasswordUrl:
        options.supabase?.resetPasswordUrl ?? absoluteUrl(options.routes?.resetPassword ?? '/auth/reset-password'),
    })
  }

  return createMockAuthAdapter()
}

export function createAuthRuntime(options: AuthPluginOptions = {}): ResolvedAuthPlugin {
  return {
    kind: 'auth',
    adapter: resolveAuthAdapter(options),
    requireAuth: options.requireAuth ?? true,
    layout: options.layout ?? 'split',
    logo: options.logo,
    tagline: options.tagline,
    description: options.description,
    oauth: {
      enabled: options.oauth?.enabled ?? false,
      providers: options.oauth?.providers ?? ['google'],
    },
    routes: {
      login: options.routes?.login ?? '/login',
      callback: options.routes?.callback ?? '/auth/callback',
      resetPassword: options.routes?.resetPassword ?? '/auth/reset-password',
      afterSignIn: options.routes?.afterSignIn ?? '/',
    },
  }
}

export function createAuthPlugin(options: AuthPluginOptions = {}): ResolvedAuthPlugin {
  return createAuthRuntime(options)
}
