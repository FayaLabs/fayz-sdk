import { create } from 'zustand'
import type { AuthUser, AuthSession, AuthState } from '../types'

interface AuthStore extends AuthState {
  setUser: (user: AuthUser | null) => void
  setSession: (session: AuthSession | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setPendingEmailVerification: (pending: boolean) => void
  reset: () => void
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  initialized: false,
  pendingEmailVerification: false,
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null, pendingEmailVerification: false }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setPendingEmailVerification: (pendingEmailVerification) => set({ pendingEmailVerification }),
  reset: () => set(initialState),
}))
