import type { AuthAdapter } from '../../types/auth-adapter'
import type { AuthUser, AuthSession, AuthProvider } from '../../types/auth'
import { getSupabaseClient } from '../supabase'

function mapSupabaseUser(supabaseUser: any): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    fullName: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? '',
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
    providers: (supabaseUser.app_metadata?.providers ?? [supabaseUser.app_metadata?.provider]).filter(Boolean) as AuthProvider[],
    emailVerified: !!supabaseUser.email_confirmed_at,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at ?? supabaseUser.created_at,
  }
}

function mapSupabaseSession(session: any): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    user: mapSupabaseUser(session.user),
  }
}

export function createSupabaseAuthAdapter(): AuthAdapter {
  const supabase = getSupabaseClient()

  return {
    async getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      const mapped = mapSupabaseSession(session)
      return { user: mapped.user, session: mapped }
    },

    onAuthStateChange(cb) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

      // When email confirmation is enabled, session is null
      if (!data.session) {
        if (!data.user) throw new Error('Signup failed: no user returned')
        // Return a partial session so the UI can show "check your email"
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
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      })
      if (error) throw error
    },

    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined,
      })
      if (error) throw error
    },
  }
}
