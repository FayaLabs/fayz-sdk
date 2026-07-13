import { createContext, useContext, useState, type ReactNode } from 'react'
import { PhoneAuthModal, type PhoneAuthModalConfig } from './PhoneAuthModal'

interface AuthModalContextValue {
  openAuthModal: () => void
  closeAuthModal: () => void
  isAuthModalOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export interface AuthModalProviderProps {
  /** Enables the phone sign-in/up modal (default for dogfood sites). */
  phoneAuth?: boolean
  config?: PhoneAuthModalConfig
  children: ReactNode
}

/**
 * Mounts the default phone-auth login modal and exposes openAuthModal() to the
 * host (e.g. an "Acessar área do cliente" button). Render INSIDE <AuthProvider>
 * so the modal can sign the user in through the mounted adapter.
 */
export function AuthModalProvider({ phoneAuth = true, config, children }: AuthModalProviderProps) {
  const [open, setOpen] = useState(false)
  const value: AuthModalContextValue = {
    openAuthModal: () => setOpen(true),
    closeAuthModal: () => setOpen(false),
    isAuthModalOpen: open,
  }
  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {phoneAuth ? <PhoneAuthModal open={open} onClose={() => setOpen(false)} config={config} /> : null}
    </AuthModalContext.Provider>
  )
}

/** Access the auth modal controls. Returns a no-op opener if no provider is mounted. */
export function useAuthModal(): AuthModalContextValue {
  return (
    useContext(AuthModalContext) ?? {
      openAuthModal: () => {},
      closeAuthModal: () => {},
      isAuthModalOpen: false,
    }
  )
}
