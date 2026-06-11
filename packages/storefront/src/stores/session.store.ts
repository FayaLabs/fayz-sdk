import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Customer session state. Identity is established through the shared
// @fayz/auth AuthAdapter (see ../auth.ts) — this store only mirrors the
// linked ShopCustomer for synchronous UI access.

export interface SessionState {
  customerId: string | null
  email: string | null
  name: string | null
  setSession(session: { customerId: string; email: string; name?: string | null }): void
  signOut(): void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      customerId: null,
      email: null,
      name: null,
      setSession: ({ customerId, email, name }) =>
        set({ customerId, email, name: name ?? null }),
      signOut: () => set({ customerId: null, email: null, name: null }),
    }),
    { name: 'fayz.storefront.session.v1' },
  ),
)
