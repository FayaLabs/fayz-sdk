import { useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/auth.store'
import { useAuthAdapterOptional } from '../lib/auth-context'
import type { AuthProvider } from '../types'

export function useAuth() {
  const store = useAuthStore()
  const adapter = useAuthAdapterOptional()

  useEffect(() => {
    if (!adapter) {
      // No adapter configured — mark as initialized (no auth flow)
      store.setInitialized(true)
      store.setLoading(false)
      return
    }

    adapter.getSession().then((result) => {
      if (result) {
        store.setSession(result.session)
      } else {
        store.setPendingEmailVerification(false)
      }
      store.setInitialized(true)
      store.setLoading(false)
    })

    const unsubscribe = adapter.onAuthStateChange((user) => {
      if (user) {
        store.setUser(user)
        store.setPendingEmailVerification(false)
      } else {
        store.setUser(null)
        store.setSession(null)
      }
      store.setLoading(false)
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!adapter) throw new Error('No auth adapter configured')
    store.setLoading(true)
    try {
      const session = await adapter.signIn(email, password)
      store.setSession(session)
      store.setPendingEmailVerification(false)
    } finally {
      store.setLoading(false)
    }
  }, [adapter, store])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!adapter) throw new Error('No auth adapter configured')
    store.setLoading(true)
    try {
      const session = await adapter.signUp(email, password, fullName)
      const requiresEmailVerification = !session.accessToken
      if (requiresEmailVerification) {
        store.setSession(null)
        store.setPendingEmailVerification(true)
        return { requiresEmailVerification: true }
      }

      store.setSession(session)
      store.setPendingEmailVerification(false)
      return { requiresEmailVerification: false }
    } finally {
      store.setLoading(false)
    }
  }, [adapter, store])

  const signOut = useCallback(async () => {
    if (!adapter) throw new Error('No auth adapter configured')
    store.setLoading(true)
    try {
      await adapter.signOut()
      store.reset()
      store.setInitialized(true)
    } finally {
      store.setLoading(false)
    }
  }, [adapter, store])

  const signInWithOAuth = useCallback(async (provider: AuthProvider) => {
    if (!adapter) throw new Error('No auth adapter configured')
    await adapter.signInWithOAuth(provider)
  }, [adapter])

  const resetPassword = useCallback(async (email: string) => {
    if (!adapter) throw new Error('No auth adapter configured')
    await adapter.resetPassword(email)
  }, [adapter])

  return {
    user: store.user,
    session: store.session,
    loading: store.loading,
    initialized: store.initialized,
    pendingEmailVerification: store.pendingEmailVerification,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    resetPassword,
  }
}
