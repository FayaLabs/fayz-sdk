import type { AuthUser, AuthSession, AuthProvider } from './auth'

export interface AuthAdapter {
  getSession(): Promise<{ user: AuthUser; session: AuthSession } | null>
  onAuthStateChange(cb: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<AuthSession>
  signUp(email: string, password: string, fullName: string): Promise<AuthSession>
  signOut(): Promise<void>
  signInWithOAuth(provider: AuthProvider): Promise<void>
  resetPassword(email: string): Promise<void>
}
