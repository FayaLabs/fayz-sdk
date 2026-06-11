// Adapters
export { createSupabaseAuthAdapter } from './adapters/supabase'
export type { SupabaseAuthConfig } from './adapters/supabase'

export { createMockAuthAdapter } from './adapters/mock'
export type { MockUser } from './adapters/mock'

// Store
export { useAuthStore } from './store'
export type { AuthState, AuthStore } from './store'

// Context & hook
export { AuthProvider, useAuth } from './context'
export type { AuthProviderProps } from './context'
