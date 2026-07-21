import { create } from 'zustand'
import { setActiveTenantId, type Organization, type OrgMember, type OrgMembership } from '@fayz-ai/core'

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
    setActiveTenantId(org?.id)
    persistOrgId(org?.id ?? null)
    set({ currentOrg: org })
  },
  setUserOrgs: (orgs) => set({ userOrgs: orgs }),
  setMembers: (members) => set({ members }),
  setLoading: (loading) => set({ loading }),
  reset: () => {
    setActiveTenantId(undefined)
    // NOTE: do NOT clear the persisted org id here. The org providers call
    // reset() whenever the auth store transiently reports `user === null` —
    // which happens on every fresh load while the Supabase session hydrates
    // asynchronously. Wiping 'fayz:current-org' at that moment drops a
    // multi-org user's workspace selection BEFORE loadOrgs can read it back,
    // so the app always falls to memberships[0] on reload (single-org users
    // never noticed). The pin is a last-selected hint that's re-validated
    // against the fresh membership list on load, so it's safe to keep across
    // sign-out too (a mismatching pin just falls back to memberships[0]).
    set({ currentOrg: null, userOrgs: [], members: [], loading: false })
  },
}))

export { getPersistedOrgId }
