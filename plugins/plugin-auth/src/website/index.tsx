// ---------------------------------------------------------------------------
// @fayz-ai/plugin-auth/website — lean website auth surface (no @fayz-ai/ui).
//
// Ships the DEFAULT phone sign-in/sign-up modal for dogfood Fayz sites +
// AuthModalProvider (openAuthModal control) + the canonical phone→email helper.
// Re-exports the auth runtime from @fayz-ai/auth for one-stop host wiring.
// ---------------------------------------------------------------------------

export { AuthModalProvider, useAuthModal } from './AuthModalProvider'
export type { AuthModalProviderProps } from './AuthModalProvider'
export { PhoneAuthModal } from './PhoneAuthModal'
export type { PhoneAuthModalConfig } from './PhoneAuthModal'
export { phoneToEmail } from './phone'

// Convenience re-exports so hosts import auth from one place.
export { AuthProvider, useAuth, createMockAuthAdapter, createSupabaseAuthAdapter } from '@fayz-ai/auth'
export type { AuthAdapter, AuthUser, AuthSession } from '@fayz-ai/core'
