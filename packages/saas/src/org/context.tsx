import * as React from 'react'
import type { OrgAdapter, Organization, OrgMembership } from '@fayz-ai/core'
import { useAuthStore } from '@fayz-ai/auth'
import { useOrganizationStore, getPersistedOrgId } from './store'

// ---------------------------------------------------------------------------
// Adapter context
// ---------------------------------------------------------------------------

const OrgAdapterContext = React.createContext<OrgAdapter | null>(null)

export function useOrgAdapter(): OrgAdapter {
  const adapter = React.useContext(OrgAdapterContext)
  if (!adapter) {
    throw new Error('useOrgAdapter must be used within an <OrgProvider>')
  }
  return adapter
}

export function useOrgAdapterOptional(): OrgAdapter | null {
  return React.useContext(OrgAdapterContext)
}

// ---------------------------------------------------------------------------
// Tenant / org hook
// ---------------------------------------------------------------------------

export interface TenantContext {
  /** The currently active organization */
  org: Organization | null
  /** All orgs the current user belongs to */
  userOrgs: OrgMembership[]
  loading: boolean
  /** Switch the active org */
  switchOrg: (orgId: string) => Promise<void>
  /** Refresh the current org from the adapter */
  refreshOrg: () => Promise<void>
}

const TenantContext = React.createContext<TenantContext | null>(null)

/**
 * Access the current tenant / organization.
 * Must be used inside <OrgProvider>.
 */
export function useTenant(): TenantContext {
  const ctx = React.useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant must be used inside <OrgProvider>')
  }
  return ctx
}

export function useTenantOptional(): TenantContext | null {
  return React.useContext(TenantContext)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface OrgProviderProps {
  adapter: OrgAdapter
  /** When true, automatically creates an org if the user has none */
  autoCreate?: boolean
  children: React.ReactNode
}

export function OrgProvider({ adapter, autoCreate = false, children }: OrgProviderProps) {
  const { user } = useAuthStore()
  const { currentOrg, userOrgs, loading, setCurrentOrg, setUserOrgs, setLoading, reset } =
    useOrganizationStore()

  const adapterRef = React.useRef(adapter)
  adapterRef.current = adapter

  // Load orgs when user is authenticated
  React.useEffect(() => {
    if (!user) {
      reset()
      return
    }

    let cancelled = false

    async function loadOrgs() {
      setLoading(true)
      try {
        const memberships = await adapterRef.current.listUserOrgs(user!.id)

        if (cancelled) return

        setUserOrgs(memberships)

        // Auto-create org if user has none
        if (memberships.length === 0 && autoCreate) {
          const newOrg = await adapterRef.current.createOrg(
            user!.fullName ? `${user!.fullName}'s Organization` : 'My Organization',
            user!.id,
          )
          if (!cancelled) {
            setUserOrgs([
              {
                orgId: newOrg.id,
                orgName: newOrg.name,
                orgSlug: newOrg.slug,
                profileId: 'owner',
                profileName: 'Owner',
              },
            ])
            setCurrentOrg(newOrg)
          }
          return
        }

        // Restore previously selected org or default to first
        const persistedId = getPersistedOrgId()
        const target =
          memberships.find((m) => m.orgId === persistedId) ?? memberships[0]

        if (target && !cancelled) {
          const org = await adapterRef.current.getOrg(target.orgId)
          if (!cancelled) setCurrentOrg(org)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOrgs()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function switchOrg(orgId: string): Promise<void> {
    setLoading(true)
    try {
      const org = await adapterRef.current.getOrg(orgId)
      setCurrentOrg(org)
    } finally {
      setLoading(false)
    }
  }

  async function refreshOrg(): Promise<void> {
    if (!currentOrg) return
    setLoading(true)
    try {
      const org = await adapterRef.current.getOrg(currentOrg.id)
      setCurrentOrg(org)
    } finally {
      setLoading(false)
    }
  }

  const tenantValue: TenantContext = {
    org: currentOrg,
    userOrgs,
    loading,
    switchOrg,
    refreshOrg,
  }

  return (
    <OrgAdapterContext.Provider value={adapter}>
      <TenantContext.Provider value={tenantValue}>
        {children}
      </TenantContext.Provider>
    </OrgAdapterContext.Provider>
  )
}
