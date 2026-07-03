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
  /**
   * Invite a user by e-mail via the provider's admin invite endpoint (e.g. Supabase
   * GoTrue `auth.admin.inviteUserByEmail`). Creates the auth user in an "invited"
   * state and sends the invite e-mail. `data` is written to the user's metadata so
   * an accept-time trigger can provision membership (tenant_id/role). Requires a
   * privileged path (service-role edge function) — not callable from the anon client.
   * Optional: adapters without an admin path (mock) may omit it.
   */
  inviteUser?(email: string, options?: { redirectTo?: string; data?: Record<string, unknown> }): Promise<void>
}
