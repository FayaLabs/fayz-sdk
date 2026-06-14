import { create } from 'zustand'
import type { AuthUser, AuthSession } from '@fayz-ai/core'

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
  error: Error | null
}

export interface AuthStore extends AuthState {
  setUser: (user: AuthUser | null) => void
  setSession: (session: AuthSession | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  reset: () => void
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: session !== null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))
