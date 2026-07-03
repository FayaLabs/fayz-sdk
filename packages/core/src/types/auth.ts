export type AuthProvider = 'google' | 'github' | 'apple' | 'facebook' | (string & {})

export interface AuthUser {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  role?: string
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export interface AuthAdapter {
  getSession(): Promise<{ user: AuthUser; session: AuthSession } | null>
  onAuthStateChange(cb: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<AuthSession>
  signUp(email: string, password: string, fullName: string): Promise<AuthSession>
  signOut(): Promise<void>
  signInWithOAuth(provider: AuthProvider): Promise<void>
  resetPassword(email: string, options?: { redirectTo?: string }): Promise<void>
  updatePassword?(password: string): Promise<AuthSession | void>
  handleCallback?(url?: string): Promise<AuthSession | null>
}
