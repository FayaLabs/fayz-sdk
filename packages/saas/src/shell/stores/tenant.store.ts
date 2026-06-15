import { create } from 'zustand'
import type { Tenant, TenantMember, MemberRole, TenantState } from '../types'

interface TenantStore extends TenantState {
  setTenant: (tenant: Tenant | null) => void
  setMembers: (members: TenantMember[]) => void
  setCurrentRole: (role: MemberRole | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const initialState: TenantState = {
  tenant: null,
  members: [],
  currentRole: null,
  loading: false,
}

export const useTenantStore = create<TenantStore>((set) => ({
  ...initialState,
  setTenant: (tenant) => set({ tenant }),
  setMembers: (members) => set({ members }),
  setCurrentRole: (role) => set({ currentRole: role }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}))
