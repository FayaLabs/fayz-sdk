import type { AuthAdapter, AuthUser, AuthSession } from '@fayz-ai/core'

export interface MockUser {
  id: string
  email: string
  fullName: string
  role?: string
}

const DEFAULT_MOCK_USER: MockUser = {
  id: 'mock-user-id',
  email: 'demo@fayz.dev',
  fullName: 'Demo User',
  role: 'admin',
}

const STORAGE_KEY = 'fayz:mock-auth'

function toAuthUser(mockUser: MockUser): AuthUser {
  return {
    id: mockUser.id,
    email: mockUser.email,
    fullName: mockUser.fullName,
  }
}

function createMockSession(user: AuthUser): AuthSession {
  return {
    accessToken: `mock-token-${user.id}`,
    refreshToken: `mock-refresh-${user.id}`,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    user,
  }
}

function getStored(): { user: AuthUser; session: AuthSession } | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { user: AuthUser; session: AuthSession }
  } catch {
    return null
  }
}

function setStored(data: { user: AuthUser; session: AuthSession } | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // SSR or storage unavailable — silently skip
  }
}

export function createMockAuthAdapter(mockUser: MockUser = DEFAULT_MOCK_USER): AuthAdapter {
  const listeners = new Set<(user: AuthUser | null) => void>()

  function notifyListeners(user: AuthUser | null): void {
    for (const cb of listeners) cb(user)
  }

  return {
    async getSession() {
      return getStored()
    },

    onAuthStateChange(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },

    async signIn(email, _password) {
      // Mock accepts any credentials, but the identity FOLLOWS the email —
      // storefront customers and saas users keep their own purchase/session
      // history instead of all becoming the configured demo user.
      const stored = getStored()
      const user: AuthUser =
        stored && stored.user.email === email
          ? stored.user
          : {
              id: email === mockUser.email ? mockUser.id : `mock-${email}`,
              email,
              fullName: email === mockUser.email ? mockUser.fullName : (email.split('@')[0] ?? 'Cliente'),
            }
      const session = createMockSession(user)
      setStored({ user, session })
      notifyListeners(user)
      return session
    },

    async signUp(email, _password, fullName) {
      // Mock signup creates a user from the provided details
      const user: AuthUser = {
        id: `mock-${email}`,
        email,
        fullName: fullName || (email.split('@')[0] ?? 'Cliente'),
      }
      const session = createMockSession(user)
      setStored({ user, session })
      notifyListeners(user)
      return session
    },

    async signOut() {
      setStored(null)
      notifyListeners(null)
    },

    async signInWithOAuth(_provider) {
      // Mock OAuth signs in as the configured user
      const user = toAuthUser(mockUser)
      const session = createMockSession(user)
      setStored({ user, session })
      notifyListeners(user)
    },

    async resetPassword(_email) {
      // No-op in mock
    },

    async updatePassword(_password) {
      const stored = getStored()
      return stored?.session
    },

    async handleCallback() {
      return getStored()?.session ?? null
    },

    async inviteUser(_email, _options) {
      // No admin path in mock — the org mock adapter still records the pending
      // invite so the Team UI shows it. Delivery is a no-op locally.
    },
  }
}
