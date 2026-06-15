import React, { createContext, useContext, useEffect, useRef } from 'react'
import type { AuthAdapter, AuthProvider as OAuthProvider, AuthSession } from '@fayz-ai/core'
import { useAuthStore } from './store'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  signIn: (email: string, password: string) => Promise<AuthSession>
  signUp: (email: string, password: string, fullName: string) => Promise<AuthSession>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AuthProviderProps {
  adapter: AuthAdapter
  children: React.ReactNode
}

export function AuthProvider({ adapter, children }: AuthProviderProps) {
  const { setSession, setLoading, setError, reset } = useAuthStore()

  // Keep a stable ref to the adapter so the effect only runs once on mount
  const adapterRef = useRef(adapter)
  adapterRef.current = adapter

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    async function init() {
      try {
        setLoading(true)
        const result = await adapterRef.current.getSession()
        setSession(result?.session ?? null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }

      // Subscribe to future auth state changes
      unsubscribe = adapterRef.current.onAuthStateChange((user) => {
        if (!user) {
          reset()
          // Keep isLoading false after an explicit sign-out
          setLoading(false)
        }
        // Positive auth state changes are handled via setSession after signIn/signUp
      })
    }

    void init()

    return () => {
      unsubscribe?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: AuthContextValue = {
    async signIn(email, password) {
      setError(null)
      try {
        const session = await adapterRef.current.signIn(email, password)
        setSession(session)
        return session
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },

    async signUp(email, password, fullName) {
      setError(null)
      try {
        const session = await adapterRef.current.signUp(email, password, fullName)
        setSession(session)
        return session
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },

    async signOut() {
      setError(null)
      try {
        await adapterRef.current.signOut()
        reset()
        setLoading(false)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },

    async signInWithOAuth(provider) {
      setError(null)
      try {
        await adapterRef.current.signInWithOAuth(provider)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },

    async resetPassword(email) {
      setError(null)
      try {
        await adapterRef.current.resetPassword(email)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }

  const { user, session, isLoading, isAuthenticated, error } = useAuthStore()

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    signIn: ctx.signIn,
    signUp: ctx.signUp,
    signOut: ctx.signOut,
    signInWithOAuth: ctx.signInWithOAuth,
    resetPassword: ctx.resetPassword,
  }
}
