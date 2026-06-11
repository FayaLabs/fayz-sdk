import { createClient } from '@supabase/supabase-js'
import type { AuthAdapter, AuthUser, AuthSession, AuthProvider } from '@fayz/core'

export interface SupabaseAuthConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

function mapSupabaseUser(supabaseUser: {
  id: string
  email?: string | null
  created_at?: string
  updated_at?: string | null
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown>
  app_metadata?: { providers?: string[]; provider?: string }
}): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    fullName:
      (supabaseUser.user_metadata?.['full_name'] as string | undefined) ??
      (supabaseUser.user_metadata?.['name'] as string | undefined) ??
      '',
    avatarUrl: supabaseUser.user_metadata?.['avatar_url'] as string | undefined,
  }
}

function mapSupabaseSession(session: {
  access_token: string
  refresh_token?: string
  expires_at?: number
  expires_in?: number
  user: Parameters<typeof mapSupabaseUser>[0]
}): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:
      session.expires_at ??
      Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    user: mapSupabaseUser(session.user),
  }
}

export function createSupabaseAuthAdapter(config: SupabaseAuthConfig): AuthAdapter {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)

  return {
    async getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return null
      const mapped = mapSupabaseSession(session)
      return { user: mapped.user, session: mapped }
    },

    onAuthStateChange(cb) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(session ? mapSupabaseUser(session.user) : null)
      })
      return () => subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return mapSupabaseSession(data.session)
    },

    async signUp(email, password, fullName) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error

      // When email confirmation is required, session is null
      if (!data.session) {
        if (!data.user) throw new Error('Signup failed: no user returned')
        return {
          accessToken: '',
          refreshToken: '',
          expiresAt: 0,
          user: mapSupabaseUser(data.user),
        }
      }

      return mapSupabaseSession(data.session)
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },

    async signInWithOAuth(provider: AuthProvider) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'github' | 'apple',
        options: {
          redirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      })
      if (error) throw error
    },

    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/reset-password`
            : undefined,
      })
      if (error) throw error
    },
  }
}
