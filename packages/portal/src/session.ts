import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Learner session — mirrors the auth identity for synchronous UI access. The
// customerId is the key courses enrollments/progress are stored against.

export interface MemberSessionState {
  customerId: string | null
  email: string | null
  name: string | null
  setSession(s: { customerId: string; email: string; name?: string | null }): void
  signOut(): void
}

export const useMemberSession = create<MemberSessionState>()(
  persist(
    (set) => ({
      customerId: null,
      email: null,
      name: null,
      setSession: ({ customerId, email, name }) => set({ customerId, email, name: name ?? null }),
      signOut: () => set({ customerId: null, email: null, name: null }),
    }),
    { name: 'fayz.portal.session.v1' },
  ),
)
