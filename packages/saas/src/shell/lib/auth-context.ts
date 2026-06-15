import { createContext, useContext } from 'react'
import type { AuthAdapter } from '../types/auth-adapter'

const AuthAdapterContext = createContext<AuthAdapter | null>(null)

export const AuthAdapterProvider = AuthAdapterContext.Provider

export function useAuthAdapter(): AuthAdapter {
  const adapter = useContext(AuthAdapterContext)
  if (!adapter) {
    throw new Error('useAuthAdapter must be used within an AuthAdapterProvider')
  }
  return adapter
}

export function useAuthAdapterOptional(): AuthAdapter | null {
  return useContext(AuthAdapterContext)
}
