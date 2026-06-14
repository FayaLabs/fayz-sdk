import type { AuthAdapter } from '../../types/auth-adapter'
import type { AuthUser, AuthSession } from '../../types/auth'

const STORAGE_KEY = 'saas-core:mock-auth'

function createMockUser(email: string, fullName?: string): AuthUser {
  return {
    id: crypto.randomUUID(),
    email,
    fullName: fullName || email.split('@')[0],
    providers: ['email'],
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

export function createMockAuthAdapter(): AuthAdapter {
  const listeners = new Set<(user: AuthUser | null) => void>()

  function notifyListeners(user: AuthUser | null) {
    for (const cb of listeners) cb(user)
  }

  function getStored(): { user: AuthUser; session: AuthSession } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  function setStored(data: { user: AuthUser; session: AuthSession } | null) {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    async getSession() {
      return getStored()
    },

    onAuthStateChange(cb) {
      listeners.add(cb)
      return () => { listeners.delete(cb) }
    },

    async signIn(email, password) {
      void password // mock accepts any password
      const user = createMockUser(email)
      const session = createMockSession(user)
      setStored({ user, session })
      notifyListeners(user)
      return session
    },

    async signUp(email, password, fullName) {
      void password
      const user = createMockUser(email, fullName)
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
      // Mock OAuth just signs in with a fake user
      const user = createMockUser('oauth@example.com', 'OAuth User')
      const session = createMockSession(user)
      setStored({ user, session })
      notifyListeners(user)
    },

    async resetPassword(_email) {
      // No-op in mock
    },
  }
}
