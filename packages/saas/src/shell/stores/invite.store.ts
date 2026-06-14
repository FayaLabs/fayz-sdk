import { create } from 'zustand'
import type { Invite } from '../types/invite'

interface InviteStore {
  invites: Invite[]
  loading: boolean
  setInvites: (invites: Invite[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useInviteStore = create<InviteStore>((set) => ({
  invites: [],
  loading: false,
  setInvites: (invites) => set({ invites }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ invites: [], loading: false }),
}))
