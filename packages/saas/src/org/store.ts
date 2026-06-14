import { create } from 'zustand'
import type { Organization, OrgMember, OrgMembership } from '@fayz-ai/core'

const STORAGE_KEY = 'fayz:current-org'

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function getPersistedOrgId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function persistOrgId(orgId: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (orgId) {
      localStorage.setItem(STORAGE_KEY, orgId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface OrgStore {
  currentOrg: Organization | null
  userOrgs: OrgMembership[]
  members: OrgMember[]
  loading: boolean

  setCurrentOrg: (org: Organization | null) => void
  setUserOrgs: (orgs: OrgMembership[]) => void
  setMembers: (members: OrgMember[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useOrganizationStore = create<OrgStore>((set) => ({
  currentOrg: null,
  userOrgs: [],
  members: [],
  loading: false,

  setCurrentOrg: (org) => {
    persistOrgId(org?.id ?? null)
    set({ currentOrg: org })
  },
  setUserOrgs: (orgs) => set({ userOrgs: orgs }),
  setMembers: (members) => set({ members }),
  setLoading: (loading) => set({ loading }),
  reset: () => {
    persistOrgId(null)
    set({ currentOrg: null, userOrgs: [], members: [], loading: false })
  },
}))

export { getPersistedOrgId }
