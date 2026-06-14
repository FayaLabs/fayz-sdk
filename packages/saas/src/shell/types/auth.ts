export type AuthProvider = 'email' | 'google' | 'github' | 'apple'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  providers: AuthProvider[]
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  initialized: boolean
  pendingEmailVerification: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  fullName: string
}
